import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import SignatureScreen from 'react-native-signature-canvas';
import api from '../utils/api';

// =================================================================
// VIEW DETAILS MODAL COMPONENT
// =================================================================
const ViewDetailsModal = ({ visible, onClose, orderData, onUpdateStatusRequest }) => {
    if (!orderData) return null;

    const { employeeInfo, orderGroup } = orderData;
    const [name, date] = employeeInfo.split('|');

    const pendingOrders = orderGroup.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    const completedOrders = orderGroup.filter(o => o.status === 'delivered');
    const grandTotal = completedOrders.reduce((sum, order) => sum + (order.quantity * (order.exclusive_deal?.price || 0)), 0);

    const OrderRow = ({ order, isHeader }) => (
        <View style={[modalStyles.tableRow, !isHeader && {backgroundColor: '#f9f9f9'}]}>
            <View style={{flex: 3}}>
                <Text style={modalStyles.tableCellHeader} numberOfLines={1}>{isHeader ? 'Generic Name' : order.exclusive_deal?.product?.generic_name}</Text>
                <Text style={modalStyles.tableCellSub} numberOfLines={1}>{isHeader ? 'Brand Name' : order.exclusive_deal?.product?.brand_name}</Text>
            </View>
            <Text style={modalStyles.tableCell}>{isHeader ? 'Qty' : order.quantity}</Text>
            <Text style={[modalStyles.tableCell, {textTransform: 'capitalize'}]}>{isHeader ? 'Status' : order.status}</Text>
            {isHeader ? (
                <Text style={modalStyles.tableCell}>Actions</Text>
            ) : (
                <TouchableOpacity style={modalStyles.changeStatusBtn} onPress={() => onUpdateStatusRequest(order)}>
                    <Text style={modalStyles.changeStatusBtnText}>Change</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={modalStyles.modalContainer}>
                    <View style={modalStyles.header}><Text style={modalStyles.headerTitle}>Orders By: {name}</Text><TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close-circle" size={30} color="#666" /></TouchableOpacity></View>
                    <ScrollView style={modalStyles.contentScrollView}>
                        {pendingOrders.length > 0 && ( <>
                            <Text style={modalStyles.sectionTitle}>PENDING ITEMS</Text>
                            <View style={modalStyles.table}><OrderRow isHeader />{pendingOrders.map(order => <OrderRow key={order.id} order={order} />)}</View>
                        </>)}
                        {completedOrders.length > 0 && ( <>
                            <Text style={modalStyles.sectionTitle}>COMPLETED ITEMS</Text>
                            <View style={modalStyles.table}>{completedOrders.map(order => <OrderRow key={order.id} order={order} />)}</View>
                        </>)}
                    </ScrollView>
                    <View style={modalStyles.footer}><Text style={modalStyles.grandTotal}>Grand Total (Completed): ₱{grandTotal.toLocaleString()}</Text></View>
                </View>
            </View>
        </Modal>
    );
};

// =================================================================
// CHANGE STATUS MODAL COMPONENT
// =================================================================
const ChangeStatusModal = ({ visible, onClose, onSubmit, productName }) => {
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={modalStyles.modalContainer}>
                     <View style={modalStyles.header}><Text style={modalStyles.headerTitle}>Change Status for:</Text><TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close-circle" size={30} color="#666" /></TouchableOpacity></View>
                    <Text style={modalStyles.productNameTitle}>{productName}</Text>
                    <View style={modalStyles.statusButtonContainer}>
                        <TouchableOpacity style={[modalStyles.statusButton, {backgroundColor: '#f39c12'}]} onPress={() => onSubmit('pending')}><Text style={modalStyles.statusButtonText}>PENDING</Text></TouchableOpacity>
                        <TouchableOpacity style={[modalStyles.statusButton, {backgroundColor: '#8e44ad'}]} onPress={() => onSubmit('completed')}><Text style={modalStyles.statusButtonText}>COMPLETED</Text></TouchableOpacity>
                        <TouchableOpacity style={[modalStyles.statusButton, {backgroundColor: '#2980b9'}]} onPress={() => onSubmit('delivered')}><Text style={modalStyles.statusButtonText}>DELIVERED</Text></TouchableOpacity>
                        <TouchableOpacity style={[modalStyles.statusButton, {backgroundColor: '#e74c3c'}]} onPress={() => onSubmit('cancelled')}><Text style={modalStyles.statusButtonText}>CANCELLED</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// =================================================================
// SCANNER SCREEN COMPONENT
// =================================================================
export function ScannerScreen() {
    const navigation = useNavigation();
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedData, setScannedData] = useState(null);
    const [signature, setSignature] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const sigRef = useRef();

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.scannerContainer}><Text style={styles.permissionText}>Camera permission is required.</Text><TouchableOpacity style={styles.button} onPress={requestPermission}><Text style={styles.buttonText}>Grant Permission</Text></TouchableOpacity></SafeAreaView>
        );
    }
    
    const handleBarCodeScanned = ({ data }) => {
        try {
            const parsedData = JSON.parse(data);
            if (parsedData.order_id && parsedData.product_name) {
                setScannedData(parsedData);
                Alert.alert('QR Code Scanned!', `Order ID: ${parsedData.order_id}`);
            } else { throw new Error("QR code is missing required order data."); }
        } catch (error) {
            Alert.alert('Invalid QR Code', error.message, [{ text: 'Scan Again' }]);
        }
    };
    
    const handleSignatureOK = (sig) => setSignature(sig);
    const handleSignatureEnd = () => { if (sigRef.current) { sigRef.current.readSignature(); } };
    const handleClearSignature = () => { if (sigRef.current) { sigRef.current.clearSignature(); } setSignature(null); };

    const handleSubmit = async () => {
        if (!signature) { Alert.alert('Signature Required', 'Please provide a signature before submitting.'); return; }
        setIsLoading(true);
        const formData = new FormData();
        formData.append('qr_data', JSON.stringify(scannedData));
        formData.append('signature', { uri: signature, name: `sig.png`, type: 'image/png' });
        
        try {
            const response = await api.post('/mobile/staff/process-scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            Alert.alert('Success!', response.data.message);
            navigation.goBack();
        } catch (error) {
            Alert.alert('Processing Failed', error.response?.data?.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (<SafeAreaView style={[styles.scannerContainer, styles.center]}><ActivityIndicator size="large" color="#1A73E8" /><Text style={styles.loadingText}>Processing...</Text></SafeAreaView>);
    }

    return (
        <SafeAreaView style={styles.scannerContainer}>
            {!scannedData ? (
                <CameraView onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} style={StyleSheet.absoluteFillObject}>
                    <View style={styles.layerTop} /><View style={styles.layerCenter}><View style={styles.layerLeft} /><View style={styles.focused} /><View style={styles.layerRight} /></View><View style={styles.layerBottom}><Text style={styles.scanPrompt}>Point camera at QR code</Text></View>
                </CameraView>
            ) : (
                <View style={styles.signatureContainer}>
                    <Text style={styles.signatureTitle}>Receiver's Signature</Text>
                    <View style={styles.signatureBox}><SignatureScreen ref={sigRef} onEnd={handleSignatureEnd} onOK={handleSignatureOK} webStyle={`.m-signature-pad--footer {display: none;}`} backgroundColor="rgb(244, 246, 248)" /></View>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearSignature}><MaterialCommunityIcons name="eraser" size={18} color="#E53935" /><Text style={[styles.buttonText, styles.clearButtonText]}>Clear</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.submitButton, !signature && styles.disabledButton]} onPress={handleSubmit} disabled={!signature}><MaterialCommunityIcons name="check-circle" size={18} color="#fff" /><Text style={styles.buttonText}>Submit</Text></TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

// =================================================================
// ORDERS SCREEN COMPONENT (DEFAULT EXPORT)
// =================================================================
export default function OrdersScreen() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const [data, setData] = useState({ summary: null, ordersByProvince: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ company: 'All', search: '' });

    const [isViewModalVisible, setViewModalVisible] = useState(false);
    const [isStatusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedGroupData, setSelectedGroupData] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const fetchOrders = async () => { try { setLoading(true); const response = await api.get('/mobile/staff/orders'); setData(response.data); } catch (err) { setError('Could not load order data.'); } finally { setLoading(false); } };
    useEffect(() => { if (isFocused) { fetchOrders(); } }, [isFocused]);

    const handleOpenViewModal = (orderData) => { setSelectedGroupData(orderData); setViewModalVisible(true); };
    const handleUpdateStatusRequest = (product) => { setSelectedProduct(product); setStatusModalVisible(true); };
    
    const handleCloseModals = () => { setViewModalVisible(false); setStatusModalVisible(false); setSelectedGroupData(null); setSelectedProduct(null); };

    const handleStatusSubmit = async (status) => {
        if (!selectedProduct) return;
        try {
            await api.post(`/mobile/staff/order/${selectedProduct.id}/update-status`, { status: status });
            Alert.alert('Success', `Status for ${selectedProduct.exclusive_deal.product.generic_name} updated to "${status}".`);
            
            // Close the status modal first
            setStatusModalVisible(false);
            
            // Create an updated version of the orderGroup in the state to refresh the ViewDetailsModal instantly
            const updatedOrderGroup = selectedGroupData.orderGroup.map(order => 
                order.id === selectedProduct.id ? { ...order, status: status } : order
            );
            setSelectedGroupData(prevData => ({...prevData, orderGroup: updatedOrderGroup}));
            setSelectedProduct(null);

            // Re-fetch all data in the background to ensure consistency
            fetchOrders();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Update failed.');
        }
    };

    const companyNames = ['All', ...new Set(Object.values(data.ordersByProvince).flatMap(c => Object.keys(c)))];
    const summaryData = data.summary ? [ { title: 'Orders This Week', count: data.summary.ordersThisWeek, icon: 'chart-line' }, { title: 'Pending Orders', count: data.summary.pendingOrders, icon: 'clock-outline' }, { title: 'Cannot Fulfill', count: data.summary.insufficientOrders, icon: 'alert-circle-outline', isAlert: true }, { title: 'Low Stock Items', count: data.summary.insufficientProducts, icon: 'package-variant-closed-minus', isAlert: true }, ] : [];

    return (
        <SafeAreaView style={styles.container}>
            <ViewDetailsModal visible={isViewModalVisible} onClose={handleCloseModals} orderData={selectedGroupData} onUpdateStatusRequest={handleUpdateStatusRequest} />
            <ChangeStatusModal visible={isStatusModalVisible} onClose={handleCloseModals} onSubmit={handleStatusSubmit} productName={selectedProduct?.exclusive_deal?.product?.generic_name || ''} />
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {loading ? <ActivityIndicator size="large" color="#005382" /> : error ? <Text style={styles.errorText}>{error}</Text> : (
                    <>
                        <View style={styles.summaryGrid}>{summaryData.map((item, i) => <SummaryCard key={i} {...item} />)}</View>
                        <View style={styles.listContainer}>
                            <View style={styles.searchContainer}><MaterialCommunityIcons name="magnify" size={22} color="#8E8E93" /><TextInput placeholder="Search..." style={styles.searchInput} value={filters.search} onChangeText={t => setFilters(f => ({ ...f, search: t }))} /></View>
                            <View style={styles.actionButtons}><TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ScannerScreen')}><MaterialCommunityIcons name="qrcode-scan" size={18} color="#fff" /><Text style={styles.buttonText}>Scan</Text></TouchableOpacity></View>
                            <View style={styles.pickerContainer}><Picker selectedValue={filters.company} onValueChange={v => setFilters(f => ({ ...f, company: v }))} style={styles.picker}>{companyNames.map(n => <Picker.Item key={n} label={n === 'All' ? 'All Companies' : n} value={n} />)}</Picker></View>
                        </View>
                        {Object.entries(data.ordersByProvince).map(([province, companies]) => (
                            <View key={province} style={styles.provinceSection}>
                                <Text style={styles.provinceTitle}>{province}</Text>
                                {Object.entries(companies).filter(([co]) => filters.company === 'All' || filters.company === co).map(([co, employees]) => {
                                        const filteredEmployees = Object.entries(employees).filter(([emp]) => emp.toLowerCase().includes(filters.search.toLowerCase()));
                                        if (filteredEmployees.length === 0) return null;
                                        return ( <View key={co} style={styles.companySection}><Text style={styles.companyTitle}>{co}</Text>{filteredEmployees.map(([emp, orders]) => <OrderItemCard key={emp} employeeInfo={emp} onView={() => handleOpenViewModal({employeeInfo: emp, orderGroup: orders})} />)}</View> );
                                })}
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Sub-Components
const SummaryCard = ({ title, count, icon, isAlert }) => (<View style={[styles.summaryCard, isAlert && styles.alertCard]}><View><Text style={[styles.summaryCount, isAlert && styles.alertText]}>{count}</Text><Text style={[styles.summaryTitle, isAlert && styles.alertText]}>{title}</Text></View><MaterialCommunityIcons name={icon} size={30} color={isAlert ? '#FFF' : '#1A73E8'} /></View>);
const OrderItemCard = ({ employeeInfo, onView }) => { 
    const [name, date] = employeeInfo.split('|'); 
    return (
        <View style={styles.orderItem}><View><Text style={styles.orderEmployee}>{name}</Text><Text style={styles.orderDate}>{new Date(date).toLocaleDateString()}</Text></View>
            <TouchableOpacity style={styles.viewButton} onPress={onView}><Text style={styles.viewButtonText}>View Orders</Text></TouchableOpacity>
        </View>
    );
};

// Stylesheets
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' }, scrollContainer: { padding: 16, paddingBottom: 40 }, errorText: { textAlign: 'center', color: 'red', marginTop: 40, fontSize: 16 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
    summaryCard: { width: '48%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    alertCard: { backgroundColor: '#E53935' }, summaryCount: { fontSize: 24, fontWeight: 'bold', color: '#333' }, summaryTitle: { fontSize: 14, color: '#666', marginTop: 4 }, alertText: { color: '#FFF' },
    listContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 16 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 8, paddingHorizontal: 12, marginBottom: 16 },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, marginLeft: 8 }, actionButtons: { marginBottom: 16 },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A73E8', paddingVertical: 12, borderRadius: 10, gap: 10 }, buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    pickerContainer: { backgroundColor: '#F4F6F8', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' }, picker: { width: '100%' },
    provinceSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, elevation: 2, marginTop: 16 },
    provinceTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A202C', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    companySection: { marginTop: 8 }, companyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    orderEmployee: { fontSize: 16, fontWeight: '600' }, orderDate: { fontSize: 14, color: '#777' }, viewButton: { backgroundColor: '#E8F0FE', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 }, viewButtonText: { color: '#1A73E8', fontWeight: 'bold' },
    scannerContainer: { flex: 1, backgroundColor: 'white' }, center: { justifyContent: 'center', alignItems: 'center' }, permissionText: { fontSize: 18, textAlign: 'center', padding: 20 },
    loadingText: { marginTop: 10, fontSize: 16 }, scanPrompt: { color: 'white', fontSize: 18, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 },
    signatureContainer: { flex: 1, padding: 20, backgroundColor: '#fff' }, signatureTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 20, marginBottom: 20 },
    signatureBox: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, marginBottom: 20 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between' }, clearButton: { backgroundColor: '#FEE2E2', width: '48%' }, clearButtonText: { color: '#E53935' },
    submitButton: { backgroundColor: '#1A73E8', width: '48%' }, disabledButton: { backgroundColor: '#AECBFA' },
    layerTop: { flex: 1.5, backgroundColor: 'rgba(0,0,0,0.6)' }, layerCenter: { flex: 3, flexDirection: 'row' }, layerLeft: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }, focused: { flex: 10 },
    layerRight: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }, layerBottom: { flex: 1.5, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
});

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContainer: { width: '100%', backgroundColor: 'white', borderRadius: 12, padding: 20, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    contentScrollView: { marginVertical: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 15, marginBottom: 10, paddingLeft: 5 },
    table: { borderRadius: 6 },
    tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center', justifyContent: 'space-between'},
    tableCellHeader: { fontSize: 12, color: '#333', fontWeight: 'bold' }, tableCellSub: { fontSize: 11, color: '#666' },
    tableCell: { fontSize: 12, color: '#444', flex: 1, textAlign: 'center' },
    changeStatusBtn: { flex: 1, backgroundColor: '#E8F0FE', paddingVertical: 6, borderRadius: 15, alignItems: 'center' },
    changeStatusBtnText: { color: '#1A73E8', fontWeight: 'bold', fontSize: 11 },
    footer: { paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
    grandTotal: { fontSize: 18, fontWeight: 'bold', color: 'black' },
    statusButtonContainer: { paddingVertical: 20 },
    statusButton: { borderRadius: 8, paddingVertical: 15, marginBottom: 10, alignItems: 'center' },
    statusButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    productNameTitle: { fontSize: 18, fontWeight: '500', textAlign: 'center', marginVertical: 15, color: '#333' },
});