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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- DUMMY DATA (Pampalit sa Backend) ---
const dummyContacts = [
  { id: 1, email: 'juan.dela.cruz@email.com', type: 'Customer', unreadCount: 2 },
  { id: 2, email: 'maria.clara@email.com', type: 'Customer', unreadCount: 0 },
  { id: 3, email: 'admin@system.com', type: 'Admin', unreadCount: 0 },
];

const dummyMessages = {
  1: [ // Messages for Juan Dela Cruz
    { id: 101, message: 'Hello! Kamusta ang order ko?', created_at: new Date(Date.now() - 60000 * 5).toISOString(), sender: 'other' },
    { id: 102, message: 'Hi Juan! Checking on it now. Will update you shortly.', created_at: new Date(Date.now() - 60000 * 4).toISOString(), sender: 'me' },
    { id: 103, message: 'Okay, salamat!', created_at: new Date(Date.now() - 60000 * 3).toISOString(), sender: 'other' },
  ],
  2: [ // Messages for Maria Clara
    { id: 201, message: 'Good day! Can I ask for assistance?', created_at: new Date().toISOString(), sender: 'other' },
  ],
  3: [ // Messages for Admin
    { id: 301, message: 'System update scheduled tonight at 11 PM.', created_at: new Date().toISOString(), sender: 'other' },
  ],
};
// ----------------------------------------

export default function ChatScreen() {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false); // Used for simulating loading
  const [newMessage, setNewMessage] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const flatListRef = useRef();

  // --- INITIALIZE WITH DUMMY DATA ---
  useEffect(() => {
    setContacts(dummyContacts);
  }, []);

  // --- HANDLE USER SELECTION ---
  useEffect(() => {
    if (selectedUser) {
      setLoading(true);
      setMessages([]); // Clear previous messages
      // Simulate fetching messages
      setTimeout(() => {
        setMessages(dummyMessages[selectedUser.id] || []);
        setLoading(false);
      }, 500);
    }
  }, [selectedUser]);

  // --- SIMPLIFIED SEND MESSAGE (NO API CALL) ---
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
      sender: 'me', // Lahat ng sine-send mo ay galing sa 'me'
    };

    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setNewMessage('');
  };

  const renderMessageItem = ({ item }) => (
    <View style={[styles.messageBubble, item.sender === 'me' ? styles.myMessage : styles.theirMessage]}>
      <Text style={item.sender === 'me' ? styles.myMessageText : styles.messageText}>
        {item.message}
      </Text>
      <Text style={item.sender === 'me' ? styles.myMessageTime : styles.messageTime}>
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
        {/* --- HEADER & CONTACT SELECTOR --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            style={styles.contactSelector}
            onPress={() => setDropdownVisible(!dropdownVisible)}
          >
            <Text style={styles.contactSelectorText} numberOfLines={1}>
              {selectedUser ? selectedUser.email : "Select a contact"}
            </Text>
            <Ionicons name={dropdownVisible ? "chevron-up" : "chevron-down"} size={20} color="#555" />
          </TouchableOpacity>
        </View>

        {/* --- CONTACTS DROPDOWN LIST --- */}
        {dropdownVisible && (
          <View style={styles.dropdown}>
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
                    <Text style={styles.contactName}>{item.email}</Text>
                    <Text style={styles.contactType}>{item.type}</Text>
                  </View>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        {/* --- CHAT AREA --- */}
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
                loading ? <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} /> :
                <View style={styles.emptyChat}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyChatText}>Start the conversation!</Text>
                </View>
              )}
            />
            {/* --- INPUT BAR --- */}
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

// --- STYLES (Copied from your original file for visual consistency) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    contactSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
    },
    contactSelectorText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginRight: 8,
    },
    dropdown: {
        backgroundColor: '#fff',
        maxHeight: 250,
        position: 'absolute',
        top: 110, // Adjusted for a consistent look
        left: 16,
        right: 16,
        zIndex: 1000,
        borderRadius: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    selectedContact: {
        backgroundColor: '#eef7ff',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    contactType: {
        fontSize: 14,
        color: '#777',
        marginTop: 4,
    },
    unreadBadge: {
        backgroundColor: '#ff3b30',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadCount: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    separator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginLeft: 16,
    },
    chatArea: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 10,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 18,
        marginBottom: 8,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#e5e5ea',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
    },
    myMessageText: {
        color: '#fff',
        fontSize: 16,
    },
    messageTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        textAlign: 'right',
    },
    myMessageTime: {
        fontSize: 12,
        color: '#d0e8ff',
        marginTop: 4,
        textAlign: 'right',
    },
    emptyChat: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyChatText: {
        marginTop: 16,
        fontSize: 16,
        color: '#aaa',
    },
    noChatSelected: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    noChatSelectedText: {
        marginTop: 16,
        fontSize: 18,
        color: '#aaa',
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    messageInput: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        maxHeight: 120,
        fontSize: 16,
        marginRight: 8,
    },
    sendButton: {
        padding: 8,
    },
});