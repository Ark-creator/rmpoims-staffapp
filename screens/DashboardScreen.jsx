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

// --- DATA WITH ICONS MATCHING YOUR TARGET IMAGE ---
const cardData = [
  { value: '704', label: 'Total Delivered', icon: 'truck-delivery-outline', color: '#3498DB' },
  { value: '6', label: 'Pending Orders', icon: 'package-variant-closed', color: '#F39C12' },
  { value: '9', label: 'Cancelled', icon: 'cancel', color: '#E74C3C' },
  { value: '0', label: 'Messages', icon: 'chat-processing-outline', color: '#1ABC9C' },
];

const screenWidth = Dimensions.get('window').width;
const cardPadding = 16;
const cardGap = 16;
const cardWidth = (screenWidth - (cardPadding * 2) - cardGap) / 2;

// --- RE-STYLED CARD COMPONENT TO MATCH TARGET ---
const InfoCard = ({ item }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.8}>
    <View style={styles.cardContent}>
      <Text style={styles.cardNumber}>{item.value}</Text>
      <Text style={styles.cardLabel}>{item.label}</Text>
    </View>
    <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
  </TouchableOpacity>
);

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* --- SECTION TITLE (INSTEAD OF OLD HEADER) --- */}
        <Text style={styles.sectionTitle}>Dashboard</Text>
        <View style={styles.gridContainer}>
          {cardData.map((item, index) => (
            <InfoCard key={index} item={item} />
          ))}
        </View>
        
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <MaterialCommunityIcons name="history" size={24} color="#7F8C8D" />
          <Text style={styles.activityText}>No recent activity</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- NEW AND IMPROVED STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollContainer: {
    padding: cardPadding,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: cardGap,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EAECEE',
    shadowColor: '#B0BEC5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {},
  cardNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cardLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAECEE',
  },
  activityText: {
    marginLeft: 12,
    color: '#7F8C8D',
    fontSize: 16,
  },
});