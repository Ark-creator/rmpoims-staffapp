import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../utils/api';

// Re-usable color constants
const COLORS = {
  primary: '#3498DB',
  warning: '#F39C12',
  danger: '#E74C3C',
  success: '#1ABC9C',
  textDark: '#2C3E50',
  textLight: '#7F8C8D',
  background: '#F4F6F8',
  white: '#FFFFFF',
};

const STATUS_COLORS = {
  delivered: COLORS.success,
  pending: COLORS.warning,
  cancelled: COLORS.danger,
};

// Component for a single order item in the list
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

export default function OrderListScreen({ route, navigation }) {
    const { status } = route.params;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);

    const fetchOrders = useCallback(async (pageNum = 1, isRefresh = false) => {
        if (loading || (!hasNextPage && !isRefresh)) return;

        setLoading(true);
        if (isRefresh) {
             setRefreshing(true);
             setHasNextPage(true); // Reset for pull-to-refresh
        }

        try {
            const response = await api.get(`/mobile/staff/orders/${status}?page=${pageNum}`);
            const newOrders = response.data.data;
            
            setOrders(prev => (pageNum === 1 ? newOrders : [...prev, ...newOrders]));
            setPage(pageNum);
            setHasNextPage(!!response.data.next_page_url);
            setError('');
        } catch (err) {
            console.error(`Failed to fetch ${status} orders:`, err);
            setError('Could not load orders. Please try again.');
        } finally {
            setLoading(false);
            if(isRefresh) setRefreshing(false);
        }
    }, [status, loading, hasNextPage]);

    useEffect(() => {
        navigation.setOptions({ title: `${status.charAt(0).toUpperCase() + status.slice(1)} Orders` });
        fetchOrders(1, true); // Initial fetch
    }, [status, navigation]);

    const handleRefresh = () => fetchOrders(1, true);
    const loadMoreOrders = () => fetchOrders(page + 1);

    const renderFooter = () => {
        if (!loading || refreshing) return null;
        return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />;
    };

    if (!loading && !refreshing && orders.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.infoText}>{error || `No ${status} orders found.`}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={orders}
                renderItem={({ item }) => <OrderItem item={item} />}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                onEndReached={loadMoreOrders}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    listContainer: { padding: 16 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    infoText: { color: COLORS.textLight, fontSize: 16, textAlign: 'center' },
    orderCard: {
        backgroundColor: COLORS.white,
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#999',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    orderId: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
    customerName: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
    orderDate: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    }
});