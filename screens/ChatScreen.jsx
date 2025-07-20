import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import api from '../utils/api';

export default function ChatScreen() {
  const [chatMode, setChatMode] = useState('direct'); // 'direct' or 'group'
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const flatListRef = useRef();
  const messageInterval = useRef(null);
  const [fileToSend, setFileToSend] = useState(null);

  // This effect fetches data based on the selected chat mode
  useEffect(() => {
    if (chatMode === 'direct') {
      fetchContacts();
    } else { // chatMode === 'group'
      setSelectedUser(null);
    }
    setMessages([]);
  }, [chatMode]);

  // This effect handles polling for both direct and group messages
  useEffect(() => {
    if (messageInterval.current) {
      clearInterval(messageInterval.current);
    }

    const startPolling = (fetchFunction) => {
      fetchFunction(); // Initial fetch
      messageInterval.current = setInterval(() => {
        fetchFunction(true); // Subsequent polling fetches
      }, 3000);
    };

    if (chatMode === 'direct' && selectedUser) {
      startPolling(fetchDirectMessages);
    } else if (chatMode === 'group') {
      startPolling(fetchGroupMessages);
    }

    return () => {
      if (messageInterval.current) {
        clearInterval(messageInterval.current);
      }
    };
  }, [selectedUser, chatMode]);

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const response = await api.get('/mobile/staff/chat/conversations');
      setContacts(response.data);
    } catch (error) {
      Alert.alert("Error", "Could not fetch contacts.");
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchDirectMessages = async (isPolling = false) => {
    if (!isPolling) setLoadingMessages(true);
    try {
      const { id, type } = selectedUser;
      const response = await api.get(`/mobile/staff/chat/messages/${id}/${type}`);
      setMessages(response.data);
    } catch (error) {
      if (!isPolling) Alert.alert("Error", "Could not fetch messages.");
    } finally {
      if (!isPolling) setLoadingMessages(false);
    }
  };

  const fetchGroupMessages = async (isPolling = false) => {
    if (!isPolling) setLoadingMessages(true);
    try {
      const response = await api.get('/mobile/staff/chat/group');
      setMessages(response.data);
    } catch (error) {
      if (!isPolling) Alert.alert("Error", "Could not fetch group messages.");
    } finally {
      if (!isPolling) setLoadingMessages(false);
    }
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

    const messageToSend = newMessage.trim();
    const fileToUpload = fileToSend;
    setNewMessage('');
    setFileToSend(null);

    const formData = new FormData();
    formData.append('message', messageToSend);
    if (fileToUpload) {
      formData.append('file', { uri: fileToUpload.uri, name: fileToUpload.name, type: fileToUpload.mimeType });
    }

    let endpoint = '';
    if (chatMode === 'direct') {
      if (!selectedUser) return;
      formData.append('receiver_id', selectedUser.id);
      formData.append('receiver_type', selectedUser.type);
      endpoint = '/mobile/staff/chat/send-message';
    } else {
      endpoint = '/mobile/staff/chat/group/send';
    }

    try {
      await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (error) {
      Alert.alert("Error", "Message could not be sent.");
    }
  };

  const renderMessageItem = ({ item }) => {
    const isImage = item.file_path && /\.(jpg|jpeg|png|gif)$/i.test(item.file_path);
    const isFile = item.file_path && !isImage;

    return (
      <View style={[styles.messageBubble, item.is_sender ? styles.myMessage : styles.theirMessage]}>
        {chatMode === 'group' && !item.is_sender && (
          <Text style={styles.senderName}>{item.sender_name}</Text>
        )}
        {item.message ? <Text style={item.is_sender ? styles.myMessageText : styles.messageText}>{item.message}</Text> : null}
        {isImage && <TouchableOpacity onPress={() => Linking.openURL(item.file_path)}><Image source={{ uri: item.file_path }} style={styles.chatImage} /></TouchableOpacity>}
        {isFile && <TouchableOpacity style={styles.fileContainer} onPress={() => Linking.openURL(item.file_path)}><Ionicons name="document-attach-outline" size={30} color={item.is_sender ? '#fff' : '#000'} /><Text style={styles.fileNameText} numberOfLines={1}>{item.file_path.split('/').pop()}</Text></TouchableOpacity>}
        <Text style={item.is_sender ? styles.myMessageTime : styles.messageTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    );
  };

  const renderChatContent = () => {
    const isLoading = chatMode === 'direct' ? loadingMessages : loadingMessages && messages.length === 0;
    const noChatSelected = chatMode === 'direct' && !selectedUser;

    if (noChatSelected) {
      return (
        <View style={styles.noChatSelected}>
          <Ionicons name="chatbox-ellipses-outline" size={64} color="#ccc" />
          <Text style={styles.noChatSelectedText}>Select a contact to start chatting</Text>
        </View>
      );
    }
    
    return (
        <View style={styles.chatArea}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.messagesContainer}
              contentContainerStyle={{ paddingVertical: 16 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={() => (
                isLoading ? <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} /> :
                <View style={styles.emptyChat}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
                </View>
              )}
            />
            {fileToSend && (
              <View style={styles.filePreviewContainer}>
                <Ionicons name="document" size={20} color="#555" />
                <Text style={styles.filePreviewText} numberOfLines={1}>{fileToSend.name}</Text>
                <TouchableOpacity onPress={() => setFileToSend(null)}>
                  <Ionicons name="close-circle" size={22} color="#999" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.attachButton} onPress={handlePickDocument}>
                <Ionicons name="attach" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
                disabled={!newMessage.trim() && !fileToSend}
              >
                <Ionicons name="send" size={24} color={(!newMessage.trim() && !fileToSend) ? "#ccc" : "#007AFF"} />
              </TouchableOpacity>
            </View>
        </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.modeSelector}>
            <TouchableOpacity onPress={() => setChatMode('direct')} style={[styles.modeButton, chatMode === 'direct' && styles.activeModeButton]}>
              <Text style={[styles.modeButtonText, chatMode === 'direct' && styles.activeModeButtonText]}>Direct</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChatMode('group')} style={[styles.modeButton, chatMode === 'group' && styles.activeModeButton]}>
              <Text style={[styles.modeButtonText, chatMode === 'group' && styles.activeModeButtonText]}>Group</Text>
            </TouchableOpacity>
          </View>
          {chatMode === 'direct' && (
            <TouchableOpacity style={styles.contactSelector} onPress={() => setDropdownVisible(!dropdownVisible)}>
              <Text style={styles.contactSelectorText} numberOfLines={1}>{selectedUser ? selectedUser.name : "Select a contact"}</Text>
              <Ionicons name={dropdownVisible ? "chevron-up" : "chevron-down"} size={20} color="#555" />
            </TouchableOpacity>
          )}
        </View>
        {dropdownVisible && chatMode === 'direct' && (
          <View style={styles.dropdown}>
            {loadingContacts ? <ActivityIndicator style={{padding: 20}} /> :
              <FlatList
                data={contacts}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.contactItem, selectedUser?.id === item.id && styles.selectedContact]}
                    onPress={() => {
                      setSelectedUser(item);
                      setDropdownVisible(false);
                    }}
                  >
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactType}>{item.type}</Text>
                    </View>
                    {item.unread_count > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{item.unread_count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            }
          </View>
        )}
        {renderChatContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  modeSelector: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 16 },
  modeButton: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  activeModeButton: { backgroundColor: '#007AFF' },
  modeButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  activeModeButtonText: { color: '#fff' },
  contactSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8 },
  contactSelectorText: { flex: 1, fontSize: 16, color: '#333', marginRight: 8 },
  dropdown: { backgroundColor: '#fff', maxHeight: 250, position: 'absolute', top: 165, left: 16, right: 16, zIndex: 1000, borderRadius: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#e0e0e0' },
  contactItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  selectedContact: { backgroundColor: '#eef7ff' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, color: '#333', fontWeight: '500' },
  contactType: { fontSize: 14, color: '#777', marginTop: 4 },
  unreadBadge: { backgroundColor: '#ff3b30', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadCount: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  separator: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 16 },
  chatArea: { flex: 1 },
  messagesContainer: { flex: 1, paddingHorizontal: 10 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 8 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#e5e5ea', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 12, fontWeight: 'bold', color: '#6c757d', marginBottom: 4 },
  messageText: { fontSize: 16, color: '#000' },
  myMessageText: { color: '#fff', fontSize: 16 },
  messageTime: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'right' },
  myMessageTime: { fontSize: 12, color: '#d0e8ff', marginTop: 4, textAlign: 'right' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyChatText: { marginTop: 16, fontSize: 16, color: '#aaa' },
  noChatSelected: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noChatSelectedText: { marginTop: 16, fontSize: 18, color: '#aaa', textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  attachButton: { padding: 8, marginRight: 4 },
  messageInput: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, maxHeight: 120, fontSize: 16, },
  sendButton: { padding: 8, marginLeft: 4 },
  chatImage: { width: 200, height: 200, borderRadius: 10, marginTop: 5 },
  fileContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 10, padding: 10, marginTop: 5 },
  fileNameText: { marginLeft: 10, flex: 1, color: '#333' },
  filePreviewContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#f0f0f0', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  filePreviewText: { flex: 1, marginLeft: 10, fontStyle: 'italic', color: '#333' },
});