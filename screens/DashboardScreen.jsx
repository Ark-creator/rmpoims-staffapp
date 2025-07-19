import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../utils/api'; // Imports your central API configuration

const screenWidth = Dimensions.get('window').width;
const cardPadding = 16;
const cardGap = 16;
const cardWidth = (screenWidth - (cardPadding * 2) - cardGap) / 2;

// --- Sub-component for the dashboard cards ---
const InfoCard = ({ item }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.8}>
    <View style={styles.cardContent}>
      <Text style={styles.cardNumber}>{item.value}</Text>
      <Text style={styles.cardLabel}>{item.label}</Text>
    </View>
    <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
  </TouchableOpacity>
);

// --- Main Dashboard Screen Component ---
export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError('');

        // Correct API call using the simplified path.
        // The baseURL in api.js already contains "http://.../api"
        const response = await api.get('/mobile/staff/dashboard-stats');

        setStats(response.data);
      } catch (err) {
        // Robust error handling to prevent crashes and give clear feedback
        console.error("Failed to fetch dashboard stats:", err);

        if (err.response) {
          // The server responded with a status code (404, 500, etc.)
          setError(`Error ${err.response.status}: The requested data was not found.`);
        } else if (err.request) {
          // The request was made but no response was received (Network Error)
          setError('Cannot connect to server. Check your network.');
        } else {
          // Something else happened in setting up the request
          setError('An unexpected error occurred.');
        }

      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []); // Empty array ensures this runs only once when the component mounts

  // Dynamically create card data from the fetched stats
  const cardData = stats ? [
    { value: stats.totalDelivered, label: 'Total Delivered', icon: 'truck-delivery-outline', color: '#3498DB' },
    { value: stats.pendingOrders, label: 'Pending Orders', icon: 'package-variant-closed', color: '#F39C12' },
    { value: stats.cancelled, label: 'Cancelled', icon: 'cancel', color: '#E74C3C' },
    { value: stats.messages, label: 'Messages', icon: 'chat-processing-outline', color: '#1ABC9C' },
  ] : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Dashboard</Text>

        {/* Conditionally render Loading, Error, or Data */}
        {loading ? (
          <ActivityIndicator size="large" color="#3498DB" style={{ marginTop: 20 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.gridContainer}>
            {cardData.map((item, index) => (
              <InfoCard key={index} item={item} />
            ))}
          </View>
        )}
        
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <MaterialCommunityIcons name="history" size={24} color="#7F8C8D" />
          <Text style={styles.activityText}>No recent activity</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles for the component ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F4F6F8' 
  },
  scrollContainer: { 
    padding: cardPadding 
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#2C3E50', 
    marginBottom: 16, 
    paddingHorizontal: 4 
  },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
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
    elevation: 2 
  },
  cardContent: {},
  cardNumber: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#2C3E50' 
  },
  cardLabel: { 
    fontSize: 14, 
    color: '#7F8C8D', 
    marginTop: 4 
  },
  activityCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#EAECEE' 
  },
  activityText: { 
    marginLeft: 12, 
    color: '#7F8C8D', 
    fontSize: 16 
  },
  errorText: { 
    color: '#E74C3C', 
    textAlign: 'center', 
    marginTop: 20, 
    fontSize: 16,
    paddingHorizontal: 20
  },
});