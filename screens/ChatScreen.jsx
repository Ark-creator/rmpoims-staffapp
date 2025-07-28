import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SectionList,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Image,
  Linking,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import api from '../utils/api';

const COLORS = {
  primary: '#1A73E8',
  primaryLight: '#E8F0FE',
  secondary: '#34A853',
  danger: '#EA4335',
  warning: '#FBBC05',
  textDark: '#202124',
  textMedium: '#5F6368',
  textLight: '#9AA0A6',
  background: '#F8F9FA',
  white: '#FFFFFF',
  border: '#DADCE0',
  bubbleMe: '#D2E3FC',
  bubbleThem: '#F1F3F4'
};

export default function ChatScreen() {
  const [chatMode, setChatMode] = useState('direct');
  const [contactSections, setContactSections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fileToSend, setFileToSend] = useState(null);
  const flatListRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      if (chatMode === 'direct') {
        await fetchContacts();
      }
      setMessages([]);
      if (chatMode !== 'direct') {
        setContactSections([]);
      }
    };
    fetchData();
  }, [chatMode]);

  useEffect(() => {
    let intervalId;
    const fetchMessages = async () => {
      try {
        if (chatMode === 'direct' && selectedUser) {
          const { id, type } = selectedUser;
          const response = await api.get(`/mobile/staff/chat/messages/${id}/${type}`);
          setMessages(response.data);
        } else if (chatMode === 'group') {
          const response = await api.get('/mobile/staff/chat/group');
          setMessages(response.data);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    if (selectedUser || chatMode === 'group') {
      fetchMessages();
      intervalId = setInterval(fetchMessages, 5000);
    }
    return () => clearInterval(intervalId);
  }, [selectedUser, chatMode]);

 const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const response = await api.get('/mobile/staff/chat/conversations');
      const contacts = response.data;

      // 1. Initialize sections for all three user types
      const sections = { Customers: [], Admins: [], 'Super Admins': [] };

      // 2. Loop through contacts and sort them into the correct sections
      contacts.forEach(contact => {
        if (contact.type === 'customer') {
          sections.Customers.push(contact);
        } else if (contact.type === 'admin') {
          sections.Admins.push(contact);
        } else if (contact.type === 'super_admin') {
          sections['Super Admins'].push(contact);
        }
      });

      // This part remains the same, it correctly formats the sections object
      const formattedSections = Object.keys(sections)
        .map(title => ({ title, data: sections[title] }))
        .filter(section => section.data.length > 0);

      setContactSections(formattedSections);
    } catch (error) {
      Alert.alert("Error", "Could not fetch contacts.");
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (chatMode === 'direct') await fetchContacts();
    setRefreshing(false);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled) {
        setFileToSend(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Could not open file picker.");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !fileToSend) return;
    const formData = new FormData();
    formData.append('message', newMessage.trim());
    if (fileToSend) {
      formData.append('file', { uri: fileToSend.uri, name: fileToSend.name, type: fileToSend.mimeType });
    }

    try {
      const endpoint = chatMode === 'direct'
        ? '/mobile/staff/chat/send-message'
        : '/mobile/staff/chat/group/send';
      if (chatMode === 'direct') {
        formData.append('receiver_id', selectedUser.id);
        formData.append('receiver_type', selectedUser.type);
      }
      await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewMessage('');
      setFileToSend(null);
    } catch (error) {
      Alert.alert("Error", "Message could not be sent.");
    }
  };

  const renderMessageItem = ({ item }) => {
    const isImage = item.file_path && /\.(jpg|jpeg|png|gif)$/i.test(item.file_path);
    const isFile = item.file_path && !isImage;
    const isMe = item.is_sender;
    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.theirMessageContainer]}>
        {chatMode === 'group' && !isMe && (
          <Text style={styles.senderName}>{item.sender_name}</Text>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myMessageBubble : styles.theirMessageBubble]}>
          {item.message && (
            <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>{item.message}</Text>
          )}
          {isImage && (
            <TouchableOpacity onPress={() => Linking.openURL(item.file_path)}>
              <Image source={{ uri: item.file_path }} style={styles.chatImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
          {isFile && (
            <TouchableOpacity style={styles.fileContainer} onPress={() => Linking.openURL(item.file_path)}>
              <Ionicons name="document-attach-outline" size={24} color={isMe ? COLORS.white : COLORS.primary} />
              <Text style={[styles.fileNameText, isMe && styles.myFileNameText]} numberOfLines={1}>
                {item.file_path.split('/').pop()}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderChatContent = () => {
    if (chatMode === 'direct' && !selectedUser) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyStateText}>Select a contact to start chatting</Text>
        </View>
      );
    }

    return (
      <>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            loadingMessages ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyStateText}>No messages yet</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        />
        {fileToSend && (
          <View style={styles.filePreviewContainer}>
            <Ionicons name="document" size={20} color={COLORS.textMedium} />
            <Text style={styles.filePreviewText} numberOfLines={1}>{fileToSend.name}</Text>
            <TouchableOpacity onPress={() => setFileToSend(null)}>
              <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handlePickDocument}>
            <Ionicons name="attach" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textLight}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={!newMessage.trim() && !fileToSend}
          >
            <Ionicons name="send" size={24} color={(!newMessage.trim() && !fileToSend) ? COLORS.textLight : COLORS.primary} />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, chatMode === 'direct' && styles.activeModeTab]}
              onPress={() => setChatMode('direct')}
            >
              <Text style={[styles.modeTabText, chatMode === 'direct' && styles.activeModeTabText]}>Direct</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, chatMode === 'group' && styles.activeModeTab]}
              onPress={() => setChatMode('group')}
            >
              <Text style={[styles.modeTabText, chatMode === 'group' && styles.activeModeTabText]}>Group</Text>
            </TouchableOpacity>
          </View>
          {chatMode === 'direct' && (
            <TouchableOpacity
              style={styles.contactSelector}
              onPress={() => setDropdownVisible(!dropdownVisible)}
            >
              <Text style={styles.contactSelectorText} numberOfLines={1}>
                {selectedUser ? selectedUser.name : "Select contact"}
              </Text>
              <Ionicons
                name={dropdownVisible ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.textMedium}
              />
            </TouchableOpacity>
          )}
        </View>

        {dropdownVisible && chatMode === 'direct' && (
          <View style={styles.contactsDropdown}>
            {loadingContacts ? (
              <ActivityIndicator style={styles.dropdownLoader} color={COLORS.primary} />
            ) : (
              <SectionList
                sections={contactSections}
                keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.contactItem,
                      selectedUser?.id === item.id && selectedUser?.type === item.type && styles.selectedContactItem
                    ]}
                    onPress={() => {
                      setSelectedUser(item);
                      setDropdownVisible(false);
                    }}
                  >
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactType}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1).replace('_', ' ')}
                      </Text>
                    </View>
                    {item.unread_count > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{item.unread_count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                renderSectionHeader={renderSectionHeader}
                ItemSeparatorComponent={() => <View style={styles.contactSeparator} />}
                ListEmptyComponent={() => (
                  <View style={{ padding: 16 }}>
                    <Text style={styles.emptyStateText}>No contacts found.</Text>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {renderChatContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Other styles remain the same
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, zIndex: 10 },
  headerTitle: { fontSize: 24, fontWeight: '600', color: COLORS.textDark, marginBottom: 16 },
  modeTabs: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 8, marginBottom: 16, padding: 4 },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeModeTab: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  modeTabText: { fontSize: 16, fontWeight: '500', color: COLORS.textMedium },
  activeModeTabText: { color: COLORS.primary, fontWeight: '600' },
  contactSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  contactSelectorText: { flex: 1, fontSize: 16, color: COLORS.textDark, marginRight: 8 },
  contactsDropdown: { backgroundColor: COLORS.white, maxHeight: 300, borderRadius: 8, marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 20 },
  dropdownLoader: { padding: 20 },
  
  // ✅ ADDED: Styles for the section header
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMedium,
  },

  contactItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  selectedContactItem: { backgroundColor: COLORS.primaryLight },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, color: COLORS.textDark, fontWeight: '500' },
  contactType: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  unreadBadge: { backgroundColor: COLORS.danger, borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadCount: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  contactSeparator: { height: 1, backgroundColor: COLORS.border, marginLeft: 16 },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingVertical: 16, paddingHorizontal: 12 },
  messageContainer: { marginBottom: 12, maxWidth: '80%' },
  myMessageContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirMessageContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderName: { fontSize: 12, fontWeight: '500', color: COLORS.textMedium, marginBottom: 4, marginLeft: 12 },
  messageBubble: { borderRadius: 16, padding: 12 },
  myMessageBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirMessageBubble: { backgroundColor: COLORS.bubbleThem, borderBottomLeftRadius: 4 },
  myMessageText: { color: COLORS.white, fontSize: 16, lineHeight: 22 },
  theirMessageText: { color: COLORS.textDark, fontSize: 16, lineHeight: 22 },
  messageTime: { fontSize: 12, marginTop: 4 },
  myMessageTime: { color: COLORS.textLight, textAlign: 'right' },
  theirMessageTime: { color: COLORS.textMedium, textAlign: 'left' },
  chatImage: { width: 200, height: 200, borderRadius: 12, marginTop: 8 },
  fileContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, marginTop: 8 },
  fileNameText: { marginLeft: 10, flex: 1, color: COLORS.textDark },
  myFileNameText: { color: COLORS.white },
  filePreviewContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  filePreviewText: { flex: 1, marginLeft: 10, color: COLORS.textMedium, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  attachButton: { padding: 8, marginRight: 8 },
  messageInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8, maxHeight: 120, fontSize: 16, color: COLORS.textDark, lineHeight: 20 },
  sendButton: { padding: 8, marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyStateText: { marginTop: 16, fontSize: 16, color: COLORS.textMedium, textAlign: 'center' },
  loader: { marginTop: 40 }
});