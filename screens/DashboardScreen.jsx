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
import api from '../utils/api';

const screenWidth = Dimensions.get('window').width;
const cardPadding = 16;
const cardGap = 16;
const cardWidth = (screenWidth - (cardPadding * 2) - cardGap) / 2;

// Color constants
const COLORS = {
  primary: '#3498DB',
  warning: '#F39C12',
  danger: '#E74C3C',
  success: '#1ABC9C',
  textDark: '#2C3E50',
  textLight: '#7F8C8D',
  background: '#F4F6F8',
  white: '#FFFFFF',
  border: '#EAECEE',
  shadow: '#B0BEC5'
};

// Card component
const InfoCard = ({ item }) => (
  <TouchableOpacity 
    style={[
      styles.card,
      { borderLeftWidth: 4, borderLeftColor: item.color }
    ]} 
    activeOpacity={0.8}
  >
    <View style={styles.cardContent}>
      <Text style={styles.cardNumber}>{item.value}</Text>
      <Text style={styles.cardLabel}>{item.label}</Text>
    </View>
    <MaterialCommunityIcons 
      name={item.icon} 
      size={32} 
      color={item.color} 
      style={styles.cardIcon}
    />
  </TouchableOpacity>
);

export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/mobile/staff/dashboard-stats');
        setStats(response.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError(
          err.response 
            ? `Error ${err.response.status}: The requested data was not found.`
            : err.request
              ? 'Cannot connect to server. Check your network.'
              : 'An unexpected error occurred.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const cardData = stats ? [
    { 
      value: stats.totalDelivered, 
      label: 'Delivered Orders', 
      icon: 'truck-delivery-outline', 
      color: COLORS.primary 
    },
    { 
      value: stats.pendingOrders, 
      label: 'Pending Orders', 
      icon: 'clock-outline', 
      color: COLORS.warning 
    },
    { 
      value: stats.cancelled, 
      label: 'Cancelled Orders', 
      icon: 'close-circle-outline', 
      color: COLORS.danger 
    },
    { 
      value: stats.messages, 
      label: 'New Messages', 
      icon: 'email-outline', 
      color: COLORS.success 
    },
  ] : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Dashboard Overview</Text>

        {loading ? (
          <ActivityIndicator 
            size="large" 
            color={COLORS.primary} 
            style={styles.loader} 
          />
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons 
              name="alert-circle-outline" 
              size={32} 
              color={COLORS.danger} 
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setError('');
                setLoading(true);
                fetchDashboardStats();
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {cardData.map((item, index) => (
              <InfoCard key={index} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  scrollContainer: { 
    padding: cardPadding,
    paddingBottom: 20
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 24,
    marginTop: 8
  },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginBottom: 8
  },
  card: { 
    width: cardWidth, 
    backgroundColor: COLORS.white, 
    borderRadius: 12, 
    padding: 20, 
    marginBottom: cardGap,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  cardContent: {
    flex: 1
  },
  cardNumber: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: COLORS.textDark,
    marginBottom: 4
  },
  cardLabel: { 
    fontSize: 14, 
    color: COLORS.textLight,
    fontWeight: '500'
  },
  cardIcon: {
    marginLeft: 12
  },
  loader: {
    marginTop: 40
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20
  },
  errorText: { 
    color: COLORS.danger, 
    textAlign: 'center', 
    marginVertical: 12, 
    fontSize: 16,
    lineHeight: 24
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16
  }
});