import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert, // 1. Import Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../utils/api';

// --- UI Sub-Components ---
const SummaryCard = ({ title, count, icon, isAlert }) => (
    <View style={[styles.summaryCard, isAlert && styles.alertCard]}>
        <View>
            <Text style={[styles.summaryCount, isAlert && styles.alertText]}>{count}</Text>
            <Text style={[styles.summaryTitle, isAlert && styles.alertText]}>{title}</Text>
        </View>
        <MaterialCommunityIcons name={icon} size={30} color={isAlert ? '#FFF' : '#1A73E8'} />
    </View>
);

// --- MODIFIED OrderItemCard Component ---
const OrderItemCard = ({ orderGroup, employeeInfo }) => {
    const [name, date] = employeeInfo.split('|');
    const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // 2. Function na tatawagin kapag pinindot ang button
    const handleViewPress = () => {
        // I-format ang mga detalye ng order para madaling basahin sa alert
        const orderDetails = orderGroup.map(order => {
            const product = order.exclusive_deal?.product;
            if (!product) return 'Unknown Product';
            return `- ${order.quantity} x ${product.generic_name} (${product.brand_name})`;
        }).join('\n');

        // 3. Ipakita ang Alert na may order details
        Alert.alert(
            `Orders for ${name}`, // Title ng Alert
            orderDetails, // Message/Content ng Alert
            [{ text: 'OK' }] // Button para isara ang alert
        );
    };

    return (
        <View style={styles.orderItem}>
            <View>
                <Text style={styles.orderEmployee}>{name}</Text>
                <Text style={styles.orderDate}>{formattedDate}</Text>
            </View>
            {/* 4. Idagdag ang onPress prop sa TouchableOpacity */}
            <TouchableOpacity style={styles.viewButton} onPress={handleViewPress}>
                <Text style={styles.viewButtonText}>View ({orderGroup.length})</Text>
            </TouchableOpacity>
        </View>
    );
};


// --- Main Orders Screen Component (No other changes needed here) ---
export default function OrdersScreen() {
    const [summary, setSummary] = useState(null);
    const [ordersByProvince, setOrdersByProvince] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                const response = await api.get('/mobile/staff/orders');
                setSummary(response.data.summary);
                setOrdersByProvince(response.data.ordersByProvince);
            } catch (err) {
                console.error("Failed to fetch orders:", err);
                setError('Could not load order data.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const allCompanyNames = ['All', ...new Set(Object.values(ordersByProvince).flatMap(companies => Object.keys(companies)))];
    
    const summaryData = summary ? [
        { title: 'Total Orders This Week', count: summary.ordersThisWeek, icon: 'chart-line' },
        { title: 'Pending Orders', count: summary.pendingOrders, icon: 'clock-outline' },
        { title: 'Cannot Be Fulfilled', count: summary.insufficientOrders, icon: 'alert-circle-outline', isAlert: true },
        { title: 'Insufficient Products', count: summary.insufficientProducts, icon: 'package-variant-closed-remove', isAlert: true },
    ] : [];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#005382" />
                ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : (
                    <>
                        <View style={styles.summaryGrid}>
                            {summaryData.map((item, index) => <SummaryCard key={index} {...item} />)}
                        </View>

                        <View style={styles.listContainer}>
                             <View style={styles.controlsContainer}>
                                <View style={styles.searchContainer}>
                                    <MaterialCommunityIcons name="magnify" size={22} color="#8E8E93" />
                                    <TextInput placeholder="Search Employee..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
                                </View>
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity style={styles.button}><MaterialCommunityIcons name="qrcode-scan" size={18} color="#fff" /><Text style={styles.buttonText}>Scan</Text></TouchableOpacity>
                                </View>
                                <View style={styles.pickerContainer}>
                                    <Picker selectedValue={selectedCompany} onValueChange={setSelectedCompany} style={styles.picker}>
                                        {allCompanyNames.map(name => <Picker.Item key={name} label={name === 'All' ? 'All Companies' : name} value={name} />)}
                                    </Picker>
                                </View>
                            </View>
                        </View>

                        {Object.entries(ordersByProvince).map(([provinceName, companies]) => (
                            <View key={provinceName} style={styles.provinceSection}>
                                <Text style={styles.provinceTitle}>Orders In: {provinceName}</Text>
                                
                                {Object.entries(companies).map(([companyName, employeeGroups]) => {
                                    const filteredEmployeeGroups = Object.entries(employeeGroups)
                                        .filter(([employeeInfo]) => employeeInfo.toLowerCase().includes(searchQuery.toLowerCase()));

                                    if ((selectedCompany !== 'All' && selectedCompany !== companyName) || filteredEmployeeGroups.length === 0) {
                                        return null;
                                    }

                                    return (
                                        <View key={companyName} style={styles.companySection}>
                                            <Text style={styles.companyTitle}>Orders From: {companyName}</Text>
                                            {filteredEmployeeGroups.map(([employeeInfo, orderGroup]) => (
                                                <OrderItemCard key={employeeInfo} employeeInfo={employeeInfo} orderGroup={orderGroup} />
                                            ))}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}


// --- StyleSheet (Walang pagbabago dito) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    scrollContainer: { paddingHorizontal: 16, paddingVertical: 16, minHeight: '100%' },
    errorText: { textAlign: 'center', color: 'red', fontSize: 16, marginTop: 40 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
    summaryCard: { width: '48%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, },
    alertCard: { backgroundColor: '#E53935' },
    summaryCount: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    summaryTitle: { fontSize: 14, color: '#666', marginTop: 4, flexShrink: 1 },
    alertText: { color: '#FFF' },
    listContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, marginBottom: 16, },
    controlsContainer: { marginBottom: 0 },
    provinceSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, marginTop: 16, },
    provinceTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A202C', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 8, paddingHorizontal: 12, marginBottom: 16, },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, marginLeft: 8 },
    actionButtons: { flexDirection: 'row', justifyContent: 'flex-start', gap: 12, marginBottom: 16 },
    button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A73E8', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 8, },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    pickerContainer: { backgroundColor: '#F4F6F8', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 16 },
    picker: { width: '100%' },
    companySection: { marginTop: 8 },
    companyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 8, },
    orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', },
    orderEmployee: { fontSize: 16, fontWeight: '600', color: '#333' },
    orderDate: { fontSize: 14, color: '#777', marginTop: 4 },
    viewButton: { backgroundColor: '#E8F0FE', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, },
    viewButtonText: { color: '#1A73E8', fontWeight: 'bold' },
});