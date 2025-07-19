import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import SignatureScreen from 'react-native-signature-canvas';
import api from '../utils/api';

//================================================================
// QR SCANNER SCREEN LOGIC (Can be a separate file or kept here)
//================================================================
export function ScannerScreen() {
    const navigation = useNavigation();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const [signature, setSignature] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const sigRef = useRef();

    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <View style={styles.scannerContainer}>
                <Text style={styles.permissionText}>We need your permission to use the camera</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }
    
    const handleBarCodeScanned = ({ data }) => {
        setScanned(true);
        try {
            const parsedData = JSON.parse(data);
            if (parsedData.order_id && parsedData.product_name) {
                setScannedData(parsedData);
                Alert.alert('QR Code Scanned!', `Order ID: ${parsedData.order_id}\nProduct: ${parsedData.product_name}`);
            } else {
                throw new Error("QR code does not contain valid order data.");
            }
        } catch (error) {
            Alert.alert('Invalid QR Code', `Error: ${error.message}`, [
                { text: 'Scan Again', onPress: () => setScanned(false) }
            ]);
        }
    };
    
    const handleSignatureOK = (sig) => setSignature(sig);
    const handleClearSignature = () => {
        sigRef.current.clearSignature();
        setSignature(null);
    }

    const handleSubmit = async () => {
        if (!scannedData || !signature) {
            Alert.alert('Error', !signature ? 'Signature is required.' : 'No order data scanned.');
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('qr_data', JSON.stringify(scannedData));
        formData.append('signature', {
            uri: signature,
            name: `signature_order_${scannedData.order_id}.png`,
            type: 'image/png',
        });
        
        try {
            const response = await api.post('/mobile/staff/process-scan', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            Alert.alert('Success!', response.data.message);
            navigation.goBack();
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
            Alert.alert('Failed to Process Order', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.scannerContainer, styles.center]}>
                <ActivityIndicator size="large" color="#1A73E8" />
                <Text style={styles.loadingText}>Processing Order...</Text>
            </View>
        );
    }

    return (
        <View style={styles.scannerContainer}>
            {!scannedData ? (
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    style={StyleSheet.absoluteFillObject}
                >
                    <View style={styles.layerTop} />
                    <View style={styles.layerCenter}><View style={styles.layerLeft} /><View style={styles.focused} /><View style={styles.layerRight} /></View>
                    <View style={styles.layerBottom}><Text style={styles.scanPrompt}>Point camera at QR code</Text></View>
                </CameraView>
            ) : (
                <View style={styles.signatureContainer}>
                    <Text style={styles.signatureTitle}>Receiver's Signature</Text>
                    <View style={styles.signatureBox}>
                        <SignatureScreen ref={sigRef} onOK={handleSignatureOK} webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`} backgroundColor="rgb(244, 246, 248)" />
                    </View>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearSignature}><MaterialCommunityIcons name="eraser" size={18} color="#E53935" /><Text style={[styles.buttonText, styles.clearButtonText]}>Clear</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit} disabled={!signature}><MaterialCommunityIcons name="check-circle" size={18} color="#fff" /><Text style={styles.buttonText}>Submit</Text></TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

//================================================================
// ORDERS SCREEN (MAIN COMPONENT)
//================================================================
export default function OrdersScreen() {
    const navigation = useNavigation();
    const isFocused = useIsFocused(); // Hook to detect if the screen is focused
    const [summary, setSummary] = useState(null);
    const [ordersByProvince, setOrdersByProvince] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

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

    useEffect(() => {
        if (isFocused) {
            fetchOrders(); // Fetch orders when the screen comes into focus
        }
    }, [isFocused]);

    const allCompanyNames = ['All', ...new Set(Object.values(ordersByProvince).flatMap(companies => Object.keys(companies)))];
    
    const summaryData = summary ? [
        { title: 'Orders This Week', count: summary.ordersThisWeek, icon: 'chart-line' },
        { title: 'Pending Orders', count: summary.pendingOrders, icon: 'clock-outline' },
        { title: 'Cannot Fulfill', count: summary.insufficientOrders, icon: 'alert-circle-outline', isAlert: true },
       { title: 'Low Stock Items', count: summary.insufficientProducts, icon: 'package-variant-closed-minus', isAlert: true },
    ] : [];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                {loading ? <ActivityIndicator size="large" color="#005382" /> : error ? <Text style={styles.errorText}>{error}</Text> : (
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
                                    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ScannerScreen')}><MaterialCommunityIcons name="qrcode-scan" size={18} color="#fff" /><Text style={styles.buttonText}>Scan</Text></TouchableOpacity>
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
                                    const filteredEmployeeGroups = Object.entries(employeeGroups).filter(([employeeInfo]) => employeeInfo.toLowerCase().includes(searchQuery.toLowerCase()));
                                    if ((selectedCompany !== 'All' && selectedCompany !== companyName) || filteredEmployeeGroups.length === 0) return null;
                                    return (
                                        <View key={companyName} style={styles.companySection}>
                                            <Text style={styles.companyTitle}>Orders From: {companyName}</Text>
                                            {filteredEmployeeGroups.map(([employeeInfo, orderGroup]) => <OrderItemCard key={employeeInfo} employeeInfo={employeeInfo} orderGroup={orderGroup} />)}
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

// Sub-Components
const SummaryCard = ({ title, count, icon, isAlert }) => (
    <View style={[styles.summaryCard, isAlert && styles.alertCard]}>
        <View><Text style={[styles.summaryCount, isAlert && styles.alertText]}>{count}</Text><Text style={[styles.summaryTitle, isAlert && styles.alertText]}>{title}</Text></View>
        <MaterialCommunityIcons name={icon} size={30} color={isAlert ? '#FFF' : '#1A73E8'} />
    </View>
);

const OrderItemCard = ({ orderGroup, employeeInfo }) => {
    const [name, date] = employeeInfo.split('|');
    const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const handleViewPress = () => {
        const orderDetails = orderGroup.map(order => {
            const product = order.exclusive_deal?.product;
            return product ? `- ${order.quantity} x ${product.generic_name} (${product.brand_name})` : 'Unknown Product';
        }).join('\n');
        Alert.alert(`Orders for ${name}`, orderDetails, [{ text: 'OK' }]);
    };
    return (
        <View style={styles.orderItem}>
            <View><Text style={styles.orderEmployee}>{name}</Text><Text style={styles.orderDate}>{formattedDate}</Text></View>
            <TouchableOpacity style={styles.viewButton} onPress={handleViewPress}><Text style={styles.viewButtonText}>View ({orderGroup.length})</Text></TouchableOpacity>
        </View>
    );
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    scrollContainer: { padding: 16, minHeight: '100%' },
    errorText: { textAlign: 'center', color: 'red', fontSize: 16, marginTop: 40 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
    summaryCard: { width: '48%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    alertCard: { backgroundColor: '#E53935' },
    summaryCount: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    summaryTitle: { fontSize: 14, color: '#666', marginTop: 4, flexShrink: 1 },
    alertText: { color: '#FFF' },
    listContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, marginBottom: 16 },
    controlsContainer: { marginBottom: 0 },
    provinceSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, marginTop: 16 },
    provinceTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A202C', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 8, paddingHorizontal: 12, marginBottom: 16 },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, marginLeft: 8 },
    actionButtons: { flexDirection: 'row', justifyContent: 'flex-start', gap: 12, marginBottom: 16 },
    button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A73E8', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 8 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    pickerContainer: { backgroundColor: '#F4F6F8', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 16 },
    picker: { width: '100%' },
    companySection: { marginTop: 8 },
    companyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 8 },
    orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    orderEmployee: { fontSize: 16, fontWeight: '600', color: '#333' },
    orderDate: { fontSize: 14, color: '#777', marginTop: 4 },
    viewButton: { backgroundColor: '#E8F0FE', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    viewButtonText: { color: '#1A73E8', fontWeight: 'bold' },
    // Scanner Styles
    scannerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    center: { justifyContent: 'center', alignItems: 'center' },
    permissionText: { color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 20 },
    scanPrompt: { color: 'white', fontSize: 18, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    signatureContainer: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
    signatureTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
    signatureBox: { height: 300, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 20 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-around' },
    clearButton: { backgroundColor: '#FEE2E2' },
    clearButtonText: { color: '#E53935' },
    submitButton: { backgroundColor: '#1A73E8' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
    layerTop: { flex: 2, backgroundColor: 'rgba(0,0,0,0.6)' },
    layerCenter: { flex: 3, flexDirection: 'row' },
    layerLeft: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    focused: { flex: 10 },
    layerRight: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    layerBottom: { flex: 2, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
});