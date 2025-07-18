import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Updated data with more descriptive icons
const cardData = [
  { value: '704', label: 'Total Delivered', icon: 'truck-delivery', iconColor: '#4CAF50' },
  { value: '6', label: 'Pending Orders', icon: 'timer-sand', iconColor: '#FF9800' },
  { value: '9', label: 'Cancelled Orders', icon: 'cancel', iconColor: '#F44336' },
  { value: '0', label: 'Unread Messages', icon: 'message-badge', iconColor: '#2196F3' },
];

// Dynamic sizing calculation
const screenWidth = Dimensions.get('window').width;
const numColumns = 2;
const containerPadding = 16;
const cardGap = 16;
const availableWidth = screenWidth - (containerPadding * 2) - (cardGap * (numColumns - 1));
const cardWidth = availableWidth / numColumns;

// Reusable Card Component with better touch feedback
const InfoCard = ({ item }) => (
  <TouchableOpacity 
    style={styles.card}
    activeOpacity={0.7}
  >
    <View style={styles.cardIconContainer}>
      <MaterialCommunityIcons 
        name={item.icon} 
        size={28} 
        color={item.iconColor} 
        style={styles.cardIcon}
      />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardNumber}>{item.value}</Text>
      <Text style={styles.cardLabel} numberOfLines={1}>{item.label}</Text>
    </View>
  </TouchableOpacity>
);

// Main Screen Component with header
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {cardData.map((item, index) => (
            <InfoCard key={index} item={item} />
          ))}
        </View>
        
        {/* Additional content area */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <MaterialCommunityIcons name="history" size={24} color="#666" />
            <Text style={styles.activityText}>No recent activity</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Updated Styles with better visual hierarchy
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#1976D2',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: containerPadding,
    paddingTop: 20,
  },
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: cardGap,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardIconContainer: {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },
  cardLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  activityText: {
    marginLeft: 12,
    color: '#666',
    fontSize: 16,
  },
});