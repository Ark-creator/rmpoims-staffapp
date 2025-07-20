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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api'; // Make sure your api utility is set up correctly

export default function ChatScreen() {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const flatListRef = useRef();
  
  // ✅ Ref to hold the interval ID for polling
  const messageInterval = useRef(null);

  // --- Fetch Contacts and set up cleanup ---
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoadingContacts(true);
        const response = await api.get('/mobile/staff/chat/conversations');
        setContacts(response.data);
      } catch (error) {
        Alert.alert("Error", "Could not fetch contacts.");
        console.error("Fetch Contacts Error:", error);
      } finally {
        setLoadingContacts(false);
      }
    };
    
    fetchContacts();

    // ✅ Clean up the interval when the component is unmounted
    return () => {
      if (messageInterval.current) {
        clearInterval(messageInterval.current);
      }
    };
  }, []);

  // ✅ UPDATED: This effect now handles fetching messages and setting up the polling interval
  useEffect(() => {
    // Clear any previous interval when the selected user changes
    if (messageInterval.current) {
      clearInterval(messageInterval.current);
    }

    if (selectedUser) {
      // Define the function to fetch messages
      const fetchMessages = async (isPolling = false) => {
        if (!isPolling) {
          setLoadingMessages(true);
          setMessages([]); // Clear previous messages
        }
        
        try {
          const { id, type } = selectedUser;
          const response = await api.get(`/mobile/staff/chat/messages/${id}/${type}`);
          setMessages(response.data);
        } catch (error) {
          // Don't show alert on polling errors to avoid spamming the user
          if (!isPolling) {
            Alert.alert("Error", "Could not fetch messages.");
          }
          console.error("Fetch Messages Error:", error);
        } finally {
          if (!isPolling) {
            setLoadingMessages(false);
          }
        }
      };

      // Fetch messages immediately when a user is selected
      fetchMessages();

      // Set up the interval to poll for new messages every 3 seconds
      messageInterval.current = setInterval(() => {
        fetchMessages(true); // Pass true to indicate it's a polling call
      }, 3000);
    }
    
    // Return a cleanup function to clear the interval when the effect re-runs or unmounts
    return () => {
      if (messageInterval.current) {
        clearInterval(messageInterval.current);
      }
    };
  }, [selectedUser]);


  // ✅ UPDATED: The sendMessage function now relies on polling to show the final message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    // Optimistic UI update for instant feedback
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
      is_sender: true,
      file_path: null,
    };
    
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      const formData = new FormData();
      formData.append('receiver_id', selectedUser.id);
      formData.append('receiver_type', selectedUser.type);
      formData.append('message', messageToSend);
      
      await api.post('/mobile/staff/chat/send-message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // We no longer need to handle the response here. The polling interval will
      // automatically fetch the new message from the server.

    } catch (error) {
      Alert.alert("Error", "Message could not be sent.");
      console.error("Send Message Error:", error);
      // Revert the optimistic update if the API call fails
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== optimisticMessage.id));
    }
  };

  const renderMessageItem = ({ item }) => (
    <View style={[styles.messageBubble, item.is_sender ? styles.myMessage : styles.theirMessage]}>
      <Text style={item.is_sender ? styles.myMessageText : styles.messageText}>
        {item.message}
      </Text>
      <Text style={item.is_sender ? styles.myMessageTime : styles.messageTime}>
        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            style={styles.contactSelector}
            onPress={() => setDropdownVisible(!dropdownVisible)}
          >
            <Text style={styles.contactSelectorText} numberOfLines={1}>
              {selectedUser ? selectedUser.name : "Select a contact"}
            </Text>
            <Ionicons name={dropdownVisible ? "chevron-up" : "chevron-down"} size={20} color="#555" />
          </TouchableOpacity>
        </View>

        {dropdownVisible && (
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

        {selectedUser ? (
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
                loadingMessages ? <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} /> :
                <View style={styles.emptyChat}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyChatText}>Start the conversation!</Text>
                </View>
              )}
            />
            <View style={styles.inputContainer}>
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
                disabled={!newMessage.trim()}
              >
                <Ionicons name="send" size={24} color={newMessage.trim() ? "#007AFF" : "#ccc"} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noChatSelected}>
            <Ionicons name="chatbox-ellipses-outline" size={64} color="#ccc" />
            <Text style={styles.noChatSelectedText}>Select a contact to start chatting</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles remain the same ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  contactSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8 },
  contactSelectorText: { flex: 1, fontSize: 16, color: '#333', marginRight: 8 },
  dropdown: { backgroundColor: '#fff', maxHeight: 250, position: 'absolute', top: 110, left: 16, right: 16, zIndex: 1000, borderRadius: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#e0e0e0' },
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
  messageText: { fontSize: 16, color: '#000' },
  myMessageText: { color: '#fff', fontSize: 16 },
  messageTime: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'right' },
  myMessageTime: { fontSize: 12, color: '#d0e8ff', marginTop: 4, textAlign: 'right' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyChatText: { marginTop: 16, fontSize: 16, color: '#aaa' },
  noChatSelected: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noChatSelectedText: { marginTop: 16, fontSize: 18, color: '#aaa', textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  messageInput: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, maxHeight: 120, fontSize: 16, marginRight: 8 },
  sendButton: { padding: 8 },
});