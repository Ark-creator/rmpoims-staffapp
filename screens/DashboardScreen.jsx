import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  FlatList, // Add FlatList
  RefreshControl, // Add RefreshControl
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../utils/api';

const screenWidth = Dimensions.get('window').width;
const cardPadding = 16;
const cardGap = 16;
const cardWidth = (screenWidth - (cardPadding * 2) - cardGap) / 2;

// --- COLOR CONSTANTS ---
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

const STATUS_COLORS = {
  delivered: COLORS.success,
  pending: COLORS.warning,
  cancelled: COLORS.danger,
};

// --- RE-USABLE COMPONENTS ---

// Card component (for Dashboard)
const InfoCard = ({ item, onPress }) => (
  <TouchableOpacity style={[styles.card, { borderLeftWidth: 4, borderLeftColor: item.color }]} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.cardContent}>
      <Text style={styles.cardNumber}>{item.value}</Text>
      <Text style={styles.cardLabel}>{item.label}</Text>
    </View>
    <MaterialCommunityIcons name={item.icon} size={32} color={item.color} style={styles.cardIcon} />
  </TouchableOpacity>
);

// Order Item component (for Order List)
const OrderItem = React.memo(({ item }) => (
    <View style={styles.orderCard}>
        <View>
            <Text style={styles.orderId}>Order #{item.id}</Text>
            <Text style={styles.customerName}>Customer: {item.user?.name ?? 'N/A'}</Text>
            <Text style={styles.orderDate}>Date: {new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
            <Text style={styles.statusText}>{item.status}</Text>
        </View>
    </View>
));


// --- MAIN DASHBOARD SCREEN COMPONENT ---

export default function DashboardScreen() {
  // State for view management
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'list'
  const [selectedStatus, setSelectedStatus] = useState(null);

  // State for dashboard stats
  const [stats, setStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  // State for order list
  const [orders, setOrders] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  // --- DATA FETCHING ---

  // Fetch stats for the dashboard
  const fetchDashboardStats = async () => {
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const response = await api.get('/mobile/staff/dashboard-stats');
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      setDashboardError('Cannot connect to server. Check your network.');
    } finally {
      setDashboardLoading(false);
    }
  };

  // Fetch the list of orders based on status
  const fetchOrders = useCallback(async (status, pageNum = 1, isRefresh = false) => {
    if (listLoading || (!hasNextPage && !isRefresh)) return;

    setListLoading(true);
    if (isRefresh) setRefreshing(true);

    try {
      const response = await api.get(`/mobile/staff/orders/${status}?page=${pageNum}`);
      const newOrders = response.data.data;
      
      setOrders(prev => (pageNum === 1 ? newOrders : [...prev, ...newOrders]));
      setPage(pageNum);
      setHasNextPage(!!response.data.next_page_url);
      setListError('');
    } catch (err) {
      console.error(`Failed to fetch ${status} orders:`, err);
      setListError('Could not load orders. Please try again.');
    } finally {
      setListLoading(false);
      if(isRefresh) setRefreshing(false);
    }
  }, [listLoading, hasNextPage]);

  // --- EFFECTS ---

  // Fetch dashboard stats on initial load
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Fetch orders when view changes to 'list'
  useEffect(() => {
    if (view === 'list' && selectedStatus) {
      // Reset previous list data before fetching new ones
      setOrders([]);
      setPage(1);
      setHasNextPage(true);
      fetchOrders(selectedStatus, 1, true);
    }
  }, [view, selectedStatus]);


  // --- HANDLERS ---
  const handleCardPress = (status) => {
    setSelectedStatus(status);
    setView('list'); // Switch to the order list view
  };

  const handleBackToDashboard = () => {
    setView('dashboard'); // Switch back to dashboard view
    setSelectedStatus(null);
    setOrders([]); // Clear orders list
  };

  const handleRefresh = () => {
    if (selectedStatus) {
      fetchOrders(selectedStatus, 1, true);
    }
  };

  const loadMoreOrders = () => {
    if (selectedStatus) {
      fetchOrders(selectedStatus, page + 1);
    }
  };

  // --- RENDER FUNCTIONS ---

  // Renders the main dashboard with info cards
  const renderDashboardView = () => {
    const cardData = stats ? [
      { value: stats.totalDelivered, label: 'Delivered Orders', icon: 'truck-delivery-outline', color: COLORS.primary, status: 'delivered' },
      { value: stats.pendingOrders, label: 'Pending Orders', icon: 'clock-outline', color: COLORS.warning, status: 'pending' },
      { value: stats.cancelled, label: 'Cancelled Orders', icon: 'close-circle-outline', color: COLORS.danger, status: 'cancelled' },
    ] : [];

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={dashboardLoading} onRefresh={fetchDashboardStats} />}
      >
        <Text style={styles.screenTitle}>Dashboard Overview</Text>
        {dashboardLoading && !stats ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : dashboardError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{dashboardError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardStats}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {cardData.map((item) => (
              <InfoCard key={item.status} item={item} onPress={() => handleCardPress(item.status)} />
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // Renders the list of orders
  const renderOrderListView = () => {
    const renderFooter = () => {
      if (!listLoading || refreshing) return null;
      return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />;
    };
    
    return (
      <View style={{flex: 1}}>
        <View style={styles.header}>
            <TouchableOpacity onPress={handleBackToDashboard} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Orders</Text>
        </View>
        
        {(listLoading && page === 1 && !refreshing) ? (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        ) : (orders.length === 0) ? (
            <View style={styles.centerContainer}>
              <Text style={styles.infoText}>{listError || `No ${selectedStatus} orders found.`}</Text>
            </View>
        ) : (
            <FlatList
                data={orders}
                renderItem={({ item }) => <OrderItem item={item} />}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                onEndReached={loadMoreOrders}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
            />
        )}
      </View>
    );
  };

  // --- MAIN RETURN ---
  return (
    <SafeAreaView style={styles.container}>
      {view === 'dashboard' ? renderDashboardView() : renderOrderListView()}
    </SafeAreaView>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  infoText: { color: COLORS.textLight, fontSize: 16, textAlign: 'center' },
  loader: { marginTop: 40 },
  
  // Header for Order List
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },

  // Dashboard View Styles
  scrollContainer: { padding: cardPadding, paddingBottom: 20 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 24, marginTop: 8 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  card: { width: cardWidth, backgroundColor: COLORS.white, borderRadius: 12, padding: 20, marginBottom: cardGap, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  cardContent: { flex: 1 },
  cardNumber: { fontSize: 26, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  cardLabel: { fontSize: 14, color: COLORS.textLight, fontWeight: '500' },
  cardIcon: { marginLeft: 12 },
  errorContainer: { alignItems: 'center', padding: 20, marginTop: 20 },
  errorText: { color: COLORS.danger, textAlign: 'center', marginVertical: 12, fontSize: 16, lineHeight: 24 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 12 },
  retryButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

  // Order List View Styles
  listContainer: { padding: 16 },
  orderCard: { backgroundColor: COLORS.white, borderRadius: 8, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#999', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  customerName: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  orderDate: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
});