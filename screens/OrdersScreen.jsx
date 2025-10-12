import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, Dimensions, RefreshControl, FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import SignatureScreen from 'react-native-signature-canvas';
import api from '../utils/api';

const { width } = Dimensions.get('window');

// =================================================================
// COLOR CONSTANTS
// =================================================================
const COLORS = {
    primary: '#1A73E8',
    primaryLight: '#E8F0FE',
    primaryDark: '#005382',
    secondary: '#8E44AD',
    info: '#3498DB',
    danger: '#E53935',
    dangerLight: '#FFF1F0',
    warning: '#F39C12',
    success: '#2ECC71',
    textDark: '#1A202C',
    textMedium: '#333333',
    textLight: '#666666',
    textLighter: '#8E8E93',
    background: '#F4F6F8',
    white: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#F0F0F0'
};

// =================================================================
// MODAL & HELPER COMPONENTS (DEFINED BEFORE MAIN COMPONENT)
// =================================================================

const SummaryCard = ({ title, count, icon, color, isAlert, onPress }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[styles.summaryCard, isAlert && styles.alertCard, { borderLeftColor: color }]}>
        <View>
            <Text style={[styles.summaryCount, isAlert && styles.alertText]}>{count}</Text>
            <Text style={[styles.summaryTitle, isAlert && styles.alertText]}>{title}</Text>
        </View>
        <MaterialCommunityIcons name={icon} size={28} color={isAlert ? COLORS.white : color} />
    </TouchableOpacity>
);

const OrderItemCard = ({ employeeInfo, orderGroup, onView }) => {
    const [name, date] = employeeInfo.split('|');
    const activeOrders = Object.values(orderGroup || {}).flat();
    const insufficientCount = activeOrders.reduce((count, order) => {
        if (!order || typeof order !== 'object') return count;
        const isInsufficient = order.available_stock === 'expired' || (typeof order.available_stock === 'number' && order.quantity && order.available_stock < order.quantity);
        if (isInsufficient) return count + 1;
        return count;
    }, 0);

    return (
        <View style={styles.orderItem}>
            <View style={styles.orderInfo}>
                <MaterialCommunityIcons name="account-circle" size={24} color={COLORS.textLight} />
                <View style={styles.orderTextContainer}>
                    <Text style={styles.orderEmployee}>{name}</Text>
                    <Text style={styles.orderDate}>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </View>
            </View>
            <View style={styles.orderActions}>
                {insufficientCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{insufficientCount}</Text></View>}
                <TouchableOpacity style={styles.viewButton} onPress={onView}>
                    <Text style={styles.viewButtonText}>View</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const InsufficientOrdersModal = ({ visible, onClose, data }) => {
    const renderHeader = () => (
        <View style={modalStyles.summaryTableHeader}>
            <Text style={[modalStyles.summaryTableHeaderCell, { flex: 1.5 }]}>PO #</Text>
            <Text style={[modalStyles.summaryTableHeaderCell, { flex: 2.5 }]}>Product</Text>
            <Text style={[modalStyles.summaryTableHeaderCell, { flex: 2 }]}>Employee</Text>
            <Text style={[modalStyles.summaryTableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Avail</Text>
            <Text style={[modalStyles.summaryTableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Ordered</Text>
        </View>
    );

    const renderItem = ({ item }) => (
        <View style={modalStyles.summaryTableRow}>
             <Text style={[modalStyles.summaryTableCell, { flex: 1.5 }]}>{item.po_number}</Text>
            <View style={{ flex: 2.5, paddingRight: 4 }}>
                <Text style={modalStyles.summaryTableCell} numberOfLines={1}>{item.generic_name}</Text>
                <Text style={modalStyles.summaryTableCellSub} numberOfLines={1}>{item.brand_name}</Text>
            </View>
            <View style={{ flex: 2, paddingRight: 4 }}>
                <Text style={modalStyles.summaryTableCell} numberOfLines={1}>{item.employee}</Text>
                <Text style={modalStyles.summaryTableCellSub} numberOfLines={1}>
                    {new Date(item.date_ordered).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
            </View>
            <Text style={[modalStyles.summaryTableCell, { flex: 1.2, color: COLORS.danger, fontWeight: 'bold', textAlign: 'center' }]}>
                {item.available === 'expired' ? 'Expired' : item.available}
            </Text>
            <Text style={[modalStyles.summaryTableCell, { flex: 1.2, fontWeight: 'bold', textAlign: 'center' }]}>
                {item.ordered}
            </Text>
        </View>
    );

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.modalContainer, { width: width * 0.95 }]}>
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.headerTitle}>Orders That Cannot Be Fulfilled</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `insufficient-order-${index}`}
                        ListHeaderComponent={renderHeader}
                        stickyHeaderIndices={[0]}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="check-circle-outline" size={48} color={COLORS.success} />
                                <Text style={styles.emptyStateText}>All orders can be fulfilled.</Text>
                            </View>
                        }
                    />
                </View>
            </View>
        </Modal>
    );
};

const InsufficientProductsModal = ({ visible, onClose, data }) => {
    const renderItem = ({ item }) => (
        <View style={modalStyles.insufficientItem}>
            <Text style={modalStyles.insufficientProductName}>
                {item.product.split('|')[0]} ({item.product.split('|')[1]})
            </Text>
            <View style={modalStyles.insufficientDetails}>
                <Text style={modalStyles.insufficientDetail}>
                    Available: {item.available === 'expired' ? 'Expired' : item.available}
                </Text>
                <Text style={modalStyles.insufficientDetail}>
                    Total Ordered: {item.ordered}
                </Text>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.modalContainer, { width: width * 0.9 }]}>
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.headerTitle}>Insufficient Products</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `insufficient-product-${index}`}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="check-circle-outline" size={48} color={COLORS.success} />
                                <Text style={styles.emptyStateText}>All products have sufficient stock.</Text>
                            </View>
                        }
                    />
                </View>
            </View>
        </Modal>
    );
};

const ViewDetailsModal = ({ visible, onClose, orderData, onUpdateStatusRequest, onShowPackedBatches }) => {
    if (!orderData) return null;

    const { employeeInfo, orderGroup } = orderData;
    const [name] = employeeInfo.split('|');
    const activeOrders = Object.values(orderGroup || {}).flat().filter(o => o && o.status !== 'delivered' && o.status !== 'cancelled');
    const grandTotal = activeOrders.reduce((sum, order) => {
        if (!order || !order.quantity || !order.exclusive_deal?.price) return sum;
        return sum + (order.quantity * (order.exclusive_deal?.price || 0));
    }, 0);

    const OrderRow = ({ order, isHeader = false }) => {
        if (!isHeader && (!order || typeof order !== 'object')) return null;
        const product = order?.exclusive_deal?.product;
        const poNumber = order?.purchase_order?.po_number;
        const availableStock = order?.available_stock;
        const quantity = order?.quantity;
        const isInsufficient = !isHeader && (availableStock === 'expired' || (typeof availableStock === 'number' && quantity && availableStock < quantity));

        return (
            <View style={[modalStyles.tableRow, isInsufficient && modalStyles.insufficientStockRow]}>
                <Text style={[modalStyles.tableCell, { flex: 1.2, textAlign: 'left', fontWeight: 'bold' }]}>{isHeader ? 'PO #' : poNumber || 'N/A'}</Text>
                <View style={{ flex: 2.5, paddingHorizontal: 4 }}>
                    <Text style={modalStyles.tableCellHeader} numberOfLines={1}>{isHeader ? 'Product' : product?.generic_name || 'N/A'}</Text>
                    {!isHeader && <Text style={modalStyles.tableCellSub} numberOfLines={1}>{product?.brand_name || 'N/A'}</Text>}
                </View>
                <Text style={[modalStyles.tableCell, { flex: 1, color: availableStock === 'expired' ? COLORS.danger : COLORS.textMedium, fontWeight: availableStock === 'expired' ? 'bold' : 'normal' }]}>
                    {isHeader ? 'Avail.' : (availableStock === 'expired' ? 'Exp' : availableStock ?? 'N/A')}
                </Text>
                <Text style={[modalStyles.tableCell, { flex: 1 }]}>{isHeader ? 'Qty' : quantity ?? 'N/A'}</Text>
                {isHeader ? (
                    <Text style={[modalStyles.tableCell, { flex: 2, textAlign: 'right' }]}>Actions</Text>
                ) : isInsufficient ? (
                    <View style={{ flex: 2, alignItems: 'flex-end' }}><Text style={modalStyles.insufficientStockText}>Cannot Fulfill</Text></View>
                ) : (
                    <View style={modalStyles.actionsCell}>
                        {['packed', 'out for delivery'].includes(order.status) && (
                            <TouchableOpacity style={modalStyles.iconButton} onPress={() => onShowPackedBatches(order)}>
                                <MaterialCommunityIcons name="package-variant-closed" size={22} color={COLORS.secondary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={modalStyles.changeStatusBtn} onPress={() => onUpdateStatusRequest(order)}>
                            <Text style={modalStyles.changeStatusBtnText}>Update</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
         <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.modalContainer, { width: width * 0.98 }]}>
                    <View style={modalStyles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={modalStyles.headerTitle}>Order Details</Text>
                            <Text style={modalStyles.headerSubtitle}>Employee: {name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} /></TouchableOpacity>
                    </View>
                    <ScrollView style={modalStyles.contentScrollView}>
                        {activeOrders.length > 0 ? (
                            <View style={modalStyles.table}>
                                <OrderRow isHeader />
                                {activeOrders.map(order => (
                                    <OrderRow
                                        key={order.id}
                                        order={order}
                                    />
                                ))}
                            </View>
                        ) : (
                            <View style={styles.emptyState}><Text style={styles.emptyStateText}>No active orders.</Text></View>
                        )}
                    </ScrollView>
                    <View style={modalStyles.footer}>
                        <Text style={modalStyles.grandTotalLabel}>TOTAL AMOUNT:</Text>
                        <Text style={modalStyles.grandTotal}>₱{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const ChangeStatusModal = ({ visible, onClose, onSubmit, order }) => {
    const productName = order?.exclusive_deal?.product?.generic_name || 'Order';
    const currentStatus = order?.status;

    const availableStatuses = {
        'pending': ['packed', 'cancelled'],
        'packed': ['out for delivery', 'pending', 'cancelled'],
        'out for delivery': ['delivered', 'pending', 'cancelled']
    };
    
    const buttonsToShow = availableStatuses[currentStatus] || [];

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.modalContainer, { width: width * 0.85 }]}>
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.headerTitle}>Update Status</Text>
                        <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} /></TouchableOpacity>
                    </View>
                    <View style={modalStyles.productInfoContainer}><Text style={modalStyles.productNameTitle}>{productName}</Text></View>
                    <View style={modalStyles.statusButtonContainer}>
                        {buttonsToShow.map(status => {
                            const details = {
                                pending: { icon: 'arrow-left-circle-outline', color: COLORS.warning, text: 'Revert to Pending' },
                                packed: { icon: 'package-variant-closed', color: COLORS.primary, text: 'Mark as Packed' },
                                'out for delivery': { icon: 'truck-fast-outline', color: COLORS.info, text: 'Set for Delivery' },
                                delivered: { icon: 'package-variant-closed-check', color: COLORS.success, text: 'Confirm Delivered' },
                                cancelled: { icon: 'close-circle-outline', color: COLORS.danger, text: 'Cancel Order' },
                            }[status];
                            return (
                                <TouchableOpacity key={status} style={[modalStyles.statusButton, { backgroundColor: details.color }]} onPress={() => onSubmit(status)}>
                                    <MaterialCommunityIcons name={details.icon} size={20} color={COLORS.white} />
                                    <Text style={modalStyles.statusButtonText}>{details.text}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const AssignStaffModal = ({ visible, onClose, onSubmit, orderId }) => {
    const [staffList, setStaffList] = useState([]);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchStaff = async () => {
            if (visible && orderId) {
                setLoading(true);
                try {
                    const response = await api.get(`/mobile/staff/orders/${orderId}/available-staff`);
                    setStaffList(response.data);
                    if (response.data.length > 0) setSelectedStaffId(response.data[0].id);
                    else setSelectedStaffId(null);
                } catch (error) {
                    Alert.alert('Error', 'Failed to fetch available staff.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchStaff();
    }, [visible, orderId]);

    const handleSubmit = () => {
        if (!selectedStaffId) {
            Alert.alert('Selection Required', 'Please select a staff member to assign.');
            return;
        }
        onSubmit(selectedStaffId);
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.modalContainer, { width: width * 0.9 }]}>
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.headerTitle}>Assign Delivery Staff</Text>
                        <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} /></TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
                    ) : staffList.length > 0 ? (
                        <View>
                            <Text style={modalStyles.pickerLabel}>Select staff for this delivery:</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={selectedStaffId} onValueChange={itemValue => setSelectedStaffId(itemValue)} style={styles.picker}>
                                    {staffList.map(staff => <Picker.Item key={staff.id} label={`${staff.staff_username} (${staff.email})`} value={staff.id} />)}
                                </Picker>
                            </View>
                            <TouchableOpacity style={[styles.button, { marginTop: 20, backgroundColor: COLORS.success }]} onPress={handleSubmit}>
                                <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.white} />
                                <Text style={styles.buttonText}>Confirm Assignment</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="account-multiple-remove" size={48} color={COLORS.textLighter} />
                            <Text style={styles.emptyStateText}>No available staff found</Text>
                            <Text style={styles.emptyStateSubtext}>No staff assigned to this order's location.</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const ChooseBatchModal = ({ visible, onClose, onSubmit, order }) => {
    const [batches, setBatches] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState({});
    const [loading, setLoading] = useState(false);

    const demandedQuantity = order?.quantity || 0;
    const totalSelectedQuantity = Object.values(selectedBatches).reduce((sum, batch) => sum + batch.quantity, 0);
    const isSufficient = totalSelectedQuantity >= demandedQuantity;

    useEffect(() => {
        const fetchBatches = async () => {
            if (visible && order?.id) {
                setLoading(true);
                setSelectedBatches({});
                try {
                    const response = await api.get(`/mobile/staff/orders/${order.id}/available-batches`);
                    setBatches(response.data);
                } catch (error) {
                    Alert.alert('Error', error.response?.data?.message || 'Failed to fetch available batches.');
                    onClose();
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchBatches();
    }, [visible, order]);

    const handleSelectBatch = (batch) => {
        const newSelection = { ...selectedBatches };
        if (newSelection[batch.inventory_id]) {
            delete newSelection[batch.inventory_id];
        } else {
            newSelection[batch.inventory_id] = batch;
        }
        setSelectedBatches(newSelection);
    };

    const handleSubmit = () => {
        if (!isSufficient) {
            Alert.alert('Insufficient Quantity', `Please select batches with a total quantity of at least ${demandedQuantity}.`);
            return;
        }
        const inv_id = Object.keys(selectedBatches).map(id => parseInt(id));
        onSubmit({ inv_id });
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.modalContainer, { width: width * 0.95 }]}>
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.headerTitle}>Select Batches to Pack</Text>
                        <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} /></TouchableOpacity>
                    </View>
                    <View style={modalStyles.quantityTracker}>
                        <Text>Required: <Text style={{ fontWeight: 'bold' }}>{demandedQuantity}</Text></Text>
                        <Text style={{ color: isSufficient ? COLORS.success : COLORS.danger }}>
                            Selected: <Text style={{ fontWeight: 'bold' }}>{totalSelectedQuantity}</Text>
                        </Text>
                    </View>
                    {loading ? <ActivityIndicator style={{ margin: 20 }} /> : (
                        <FlatList
                            data={batches}
                            keyExtractor={(item) => item.inventory_id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={modalStyles.batchRow} onPress={() => handleSelectBatch(item)}>
                                    <MaterialCommunityIcons name={selectedBatches[item.inventory_id] ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={24} color={COLORS.primary} />
                                    <View style={modalStyles.batchInfo}>
                                        <Text style={modalStyles.batchNumber}>{item.batch_number} (Qty: {item.quantity})</Text>
                                        <Text style={modalStyles.batchExpiry}>Expires: {new Date(item.expiry_date).toLocaleDateString()}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<View style={styles.emptyState}><Text>No available batches found.</Text></View>}
                        />
                    )}
                    <TouchableOpacity style={[styles.button, { marginTop: 16 }, !isSufficient && styles.disabledButton]} disabled={!isSufficient} onPress={handleSubmit}>
                        <Text style={styles.buttonText}>Confirm Packed</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const ViewPackedBatchesModal = ({ visible, onClose, order }) => {
    if (!order) return null;
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={[modalStyles.modalContainer, { width: width * 0.9 }]}>
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.headerTitle}>Packed Batches</Text>
                        <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} /></TouchableOpacity>
                    </View>
                       <FlatList
                            data={order.packed_batches || []}
                            keyExtractor={(item, index) => item.batch_number + index}
                            renderItem={({ item }) => (
                                <View style={[modalStyles.batchRow, { paddingVertical: 12 }]}>
                                    <MaterialCommunityIcons name="package-variant-closed" size={24} color={COLORS.textMedium} />
                                    <View style={modalStyles.batchInfo}>
                                        <Text style={modalStyles.batchNumber}>{item.batch_number} (Qty: {item.quantity})</Text>
                                        <Text style={modalStyles.batchExpiry}>Expires: {new Date(item.expiry_date).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={<View style={styles.emptyState}><Text>No batch information found for this order.</Text></View>}
                       />
                </View>
            </View>
        </Modal>
    );
};

// =================================================================
// STANDALONE SCANNER COMPONENT (NAMED EXPORT)
// =================================================================
export const ScannerScreen = () => {
    const navigation = useNavigation();
    const [permission, requestPermission] = useCameraPermissions();
    const [step, setStep] = useState('scan');
    const [scannedData, setScannedData] = useState(null);
    const [signature, setSignature] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const sigRef = useRef();

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleScanSuccess = () => {
        Alert.alert("Success", "Delivery confirmed successfully.", [
            { text: "OK", onPress: () => navigation.goBack() }
        ]);
    };
    
    const onCancel = () => {
        navigation.goBack();
    };

    if (!permission) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
    if (!permission.granted) {
        return (
            <SafeAreaView style={[styles.scannerContainer, styles.center]}>
                <MaterialCommunityIcons name="camera-off" size={48} color={COLORS.textLighter} style={{ marginBottom: 20 }} />
                <Text style={styles.permissionText}>Camera permission is required.</Text>
                <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.clearButton, { marginTop: 10, width: '80%' }]} onPress={onCancel}>
                    <Text style={styles.clearButtonText}>Cancel</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleBarCodeScanned = ({ data }) => {
        if (isLoading || step === 'sign') return;
        try {
            const parsedData = JSON.parse(data);
            if (!parsedData.order_id || !parsedData.product_name || !parsedData.location) {
                throw new Error("QR code is missing required information.");
            }
            setScannedData(parsedData);
            setStep('sign');
            Alert.alert('QR Code Scanned', `Product: ${parsedData.product_name}\nQuantity: ${parsedData.quantity}`, [{ text: 'OK' }]);
        } catch (error) {
            Alert.alert('Invalid QR Code', "The scanned QR code is not in a valid format.", [{ text: 'Try Again', onPress: () => setStep('scan') }]);
        }
    };

    const handleSignatureOK = (sig) => setSignature(sig);
    const handleSignatureEnd = () => sigRef.current?.readSignature();
    const handleClearSignature = () => {
        sigRef.current?.clearSignature();
        setSignature(null);
    };

    const handleSubmit = async () => {
        if (!signature || !scannedData) {
            Alert.alert('Missing Information', 'Please provide a signature and scan a QR code.');
            return;
        }
        setIsLoading(true);
        const payload = {
            order_id: scannedData.order_id,
            signature: signature // The base64 string
        };

        try {
            await api.post('/mobile/staff/process-scan', payload);
            handleScanSuccess();
        } catch (error) {
            Alert.alert('Submission Error', error.response?.data?.message || 'Failed to process the scan.');
        } finally {
            setIsLoading(false);
        }
    };

    const content = (
        <>
            {step === 'scan' ? (
                <CameraView onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} style={StyleSheet.absoluteFillObject}>
                    <View style={styles.scannerOverlay}>
                        <View style={styles.scannerFrame} />
                        <Text style={styles.scanPrompt}>Align QR code within the frame</Text>
                    </View>
                </CameraView>
            ) : (
                <View style={styles.signatureContainer}>
                    <View style={styles.signatureHeader}>
                        <Text style={styles.signatureTitle}>Customer Signature</Text>
                        <Text style={styles.signatureSubtitle}>Please sign below to confirm receipt</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <SignatureScreen ref={sigRef} onEnd={handleSignatureEnd} onOK={handleSignatureOK} webStyle={`.m-signature-pad--footer {display: none;}`} backgroundColor={COLORS.background} penColor={COLORS.textDark} />
                    </View>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearSignature} disabled={isLoading}>
                            <MaterialCommunityIcons name="eraser" size={18} color={COLORS.danger} />
                            <Text style={styles.clearButtonText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.submitButton, (!signature || isLoading) && styles.disabledButton]} onPress={handleSubmit} disabled={!signature || isLoading}>
                            {isLoading ? <ActivityIndicator color={COLORS.white} /> : (
                                <>
                                    <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.white} />
                                    <Text style={styles.buttonText}>Submit</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </>
    );

    return (
        <SafeAreaView style={styles.scannerContainer}>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={30} color={COLORS.textDark} />
            </TouchableOpacity>
            {content}
        </SafeAreaView>
    );
};


// =================================================================
// MAIN ORDERS SCREEN COMPONENT (DEFAULT EXPORT)
// =================================================================
export default function OrdersScreen() {
    const isFocused = useIsFocused();
    const navigation = useNavigation();
    const [data, setData] = useState({ summary: null, ordersByProvince: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState({ company: 'All', search: '' });

    const [isViewModalVisible, setViewModalVisible] = useState(false);
    const [isStatusModalVisible, setStatusModalVisible] = useState(false);
    const [isAssignStaffModalVisible, setAssignStaffModalVisible] = useState(false);
    const [isInsufficientOrdersModalVisible, setInsufficientOrdersModalVisible] = useState(false);
    const [isInsufficientProductsModalVisible, setInsufficientProductsModalVisible] = useState(false);
    const [isChooseBatchModalVisible, setChooseBatchModalVisible] = useState(false);
    const [isViewPackedBatchesModalVisible, setViewPackedBatchesModalVisible] = useState(false);

    const [selectedGroupData, setSelectedGroupData] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [modalData, setModalData] = useState([]);

    const fetchOrders = async () => {
        if (!refreshing) setLoading(true);
        try {
            const response = await api.get('/mobile/staff/orders');
            setData(response.data);
            setError('');
        } catch (err) {
            setError('Failed to load order data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchOrders();
        }
    }, [isFocused]);

    const handleRefresh = () => { setRefreshing(true); fetchOrders(); };
    const handleOpenViewModal = (orderData) => { setSelectedGroupData(orderData); setViewModalVisible(true); };

    const handleUpdateStatusRequest = (order) => {
        setSelectedOrder(order);
        setStatusModalVisible(true);
    };

    const handleShowPackedBatches = (order) => {
        setSelectedOrder(order);
        setViewPackedBatchesModalVisible(true);
    };

    const handleCloseModals = () => {
        setViewModalVisible(false);
        setStatusModalVisible(false);
        setAssignStaffModalVisible(false);
        setInsufficientOrdersModalVisible(false);
        setInsufficientProductsModalVisible(false);
        setChooseBatchModalVisible(false);
        setViewPackedBatchesModalVisible(false);
        setSelectedGroupData(null);
        setSelectedOrder(null);
    };

    const showInsufficientOrdersModal = (data) => { setModalData(data || []); setInsufficientOrdersModalVisible(true); };
    const showInsufficientProductsModal = (data) => { setModalData(data || []); setInsufficientProductsModalVisible(true); };

    const handleStatusSubmit = async (status, extraData = {}) => {
        if (!selectedOrder) return;

        if (status === 'packed' && !extraData.inv_id) {
            setStatusModalVisible(false);
            setChooseBatchModalVisible(true);
            return;
        }

        if (status === 'out for delivery' && !extraData.staff_id) {
            setStatusModalVisible(false);
            setAssignStaffModalVisible(true);
            return;
        }

        try {
            const payload = { status, ...extraData };
            await api.put(`/mobile/staff/orders/${selectedOrder.id}/update-status`, payload);
            Alert.alert('Status Updated', `Order status has been updated to "${status}".`);
            handleCloseModals();
            fetchOrders();
        } catch (error) {
            Alert.alert('Update Failed', error.response?.data?.message || 'Could not update status.');
        }
    };

    const handleBatchSelectionSubmit = ({ inv_id }) => {
        handleStatusSubmit('packed', { inv_id });
    };

    const handleAssignStaffSubmit = (staffId) => {
        handleStatusSubmit('out for delivery', { staff_id: staffId });
    };

    const companyNames = ['All', ...new Set(Object.values(data.ordersByProvince || {}).flatMap(c => Object.keys(c)))];

    const summaryData = data.summary ? [
        { title: 'Orders This Week', count: data.summary.ordersThisWeek, icon: 'chart-line', color: COLORS.primary },
        { title: 'Pending Orders', count: data.summary.pendingOrders, icon: 'clock-outline', color: COLORS.warning },
        { title: 'Cannot Fulfill', count: data.summary.insufficientOrders, icon: 'alert-circle-outline', color: COLORS.danger, isAlert: true, onPress: () => showInsufficientOrdersModal(data.summary.insufficientOrderLines) },
        { title: 'Insufficient Products', count: data.summary.insufficientProducts, icon: 'package-variant-closed-minus', color: COLORS.danger, isAlert: true, onPress: () => showInsufficientProductsModal(data.summary.insufficientSummary) },
    ] : [];

    return (
        <SafeAreaView style={styles.container}>
            <ViewDetailsModal
                visible={isViewModalVisible}
                onClose={handleCloseModals}
                orderData={selectedGroupData}
                onUpdateStatusRequest={handleUpdateStatusRequest}
                onShowPackedBatches={handleShowPackedBatches}
            />
            <ChangeStatusModal
                visible={isStatusModalVisible}
                onClose={handleCloseModals}
                onSubmit={handleStatusSubmit}
                order={selectedOrder}
            />
            <AssignStaffModal
                visible={isAssignStaffModalVisible}
                onClose={handleCloseModals}
                onSubmit={handleAssignStaffSubmit}
                orderId={selectedOrder?.id}
            />
            <InsufficientOrdersModal
                visible={isInsufficientOrdersModalVisible}
                onClose={handleCloseModals}
                data={modalData}
            />
            <InsufficientProductsModal
                visible={isInsufficientProductsModalVisible}
                onClose={handleCloseModals}
                data={modalData}
            />
            <ChooseBatchModal
                visible={isChooseBatchModalVisible}
                onClose={handleCloseModals}
                onSubmit={handleBatchSelectionSubmit}
                order={selectedOrder}
            />
            <ViewPackedBatchesModal
                visible={isViewPackedBatchesModalVisible}
                onClose={handleCloseModals}
                order={selectedOrder}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={COLORS.primaryDark} style={styles.loader} />
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.button} onPress={fetchOrders}>
                            <Text style={styles.buttonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text style={styles.screenTitle}>Order Management</Text>
                        <View style={styles.summaryGrid}>
                            {summaryData.map((item, i) => (
                                <SummaryCard key={i} {...item} />
                            ))}
                        </View>

                        <View style={styles.filterSection}>
                            <View style={styles.searchContainer}>
                                <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textLighter} />
                                <TextInput
                                    placeholder="Search Customer..."
                                    placeholderTextColor={COLORS.textLighter}
                                    style={styles.searchInput}
                                    value={filters.search}
                                    onChangeText={t => setFilters(f => ({ ...f, search: t }))}
                                />
                            </View>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={filters.company}
                                    onValueChange={v => setFilters(f => ({ ...f, company: v }))}
                                    style={styles.picker}
                                    dropdownIconColor={COLORS.primary}
                                >
                                    {companyNames.map(n => (
                                        <Picker.Item key={n} label={n === 'All' ? 'All Companies' : n} value={n} />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.actionBar}>
                            <TouchableOpacity style={[styles.button, styles.scanButton]} onPress={() => navigation.navigate('ScannerScreen')}>
                                <MaterialCommunityIcons name="qrcode-scan" size={20} color={COLORS.white} />
                                <Text style={styles.buttonText}>Scan QR to Deliver</Text>
                            </TouchableOpacity>
                        </View>

                        {Object.keys(data.ordersByProvince).length > 0 ? Object.entries(data.ordersByProvince).map(([province, companies]) => (
                            <View key={province} style={styles.provinceSection}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                                    <Text style={styles.provinceTitle}>{province}</Text>
                                </View>
                                {Object.entries(companies)
                                    .filter(([co]) => filters.company === 'All' || filters.company === co)
                                    .map(([co, employees]) => {
                                        const filteredEmployees = Object.entries(employees).filter(([emp]) => emp.toLowerCase().includes(filters.search.toLowerCase()));
                                        if (filteredEmployees.length === 0) return null;
                                        return (
                                            <View key={co} style={styles.companySection}>
                                                <Text style={styles.companyTitle}>{co}</Text>
                                                {filteredEmployees.map(([emp, orders]) => (
                                                    <OrderItemCard
                                                        key={emp}
                                                        employeeInfo={emp}
                                                        orderGroup={orders}
                                                        onView={() => handleOpenViewModal({ employeeInfo: emp, orderGroup: orders })}
                                                    />
                                                ))}
                                            </View>
                                        );
                                })}
                            </View>
                        )) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="package-variant-closed" size={48} color={COLORS.textLighter} />
                                <Text style={styles.emptyStateText}>No orders found</Text>
                                <Text style={styles.emptyStateSubtext}>Orders will appear here when available.</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// =================================================================
// STYLESHEETS
// =================================================================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContainer: { padding: 16, paddingBottom: 20 },
    loader: { marginTop: 40 },
    screenTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 16 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
    summaryCard: { width: '48%', backgroundColor: COLORS.white, padding: 16, borderRadius: 8, marginBottom: 12, elevation: 1, shadowColor: COLORS.textDark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4 },
    alertCard: { backgroundColor: COLORS.danger },
    summaryCount: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark },
    summaryTitle: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
    alertText: { color: COLORS.white },
    filterSection: { backgroundColor: COLORS.white, borderRadius: 8, padding: 16, marginBottom: 16, elevation: 1 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
    searchInput: { flex: 1, fontSize: 16, marginLeft: 8, color: COLORS.textDark },
    pickerContainer: { backgroundColor: COLORS.background, borderRadius: 8, overflow: 'hidden' },
    picker: { width: '100%', color: COLORS.textDark },
    actionBar: { marginBottom: 16 },
    scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: COLORS.primaryDark },
    provinceSection: { backgroundColor: COLORS.white, borderRadius: 8, padding: 16, marginBottom: 16, elevation: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12 },
    provinceTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 8 },
    companySection: { marginTop: 8 },
    companyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textMedium, marginBottom: 8 },
    orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    orderInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    orderTextContainer: { marginLeft: 12, flex: 1 },
    orderEmployee: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
    orderDate: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
    orderActions: { flexDirection: 'row', alignItems: 'center' },
    badge: { backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    badgeText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold', paddingHorizontal: 4 },
    viewButton: { flexDirection: 'row', alignItems: 'center' },
    viewButtonText: { color: COLORS.primary, fontWeight: '600', marginRight: 4 },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 8, gap: 8, elevation: 2 },
    buttonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
    clearButton: { backgroundColor: COLORS.dangerLight, width: '48%' },
    clearButtonText: { color: COLORS.danger, fontWeight: 'bold' },
    submitButton: { backgroundColor: COLORS.primary, width: '48%' },
    disabledButton: { opacity: 0.5 },
    errorContainer: { alignItems: 'center', padding: 20, marginTop: 40 },
    errorText: { textAlign: 'center', color: COLORS.danger, marginVertical: 16, fontSize: 16 },
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    emptyStateText: { fontSize: 16, color: COLORS.textMedium, marginTop: 12, fontWeight: '500' },
    emptyStateSubtext: { fontSize: 14, color: COLORS.textLight, marginTop: 4, textAlign: 'center' },
    scannerContainer: { flex: 1, backgroundColor: COLORS.white },
    center: { justifyContent: 'center', alignItems: 'center' },
    permissionText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 20, color: COLORS.textMedium },
    scannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    scannerFrame: { width: 250, height: 250, borderWidth: 2, borderColor: COLORS.white, position: 'relative', borderRadius: 12 },
    scanPrompt: { color: COLORS.white, fontSize: 16, marginTop: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 4 },
    signatureContainer: { flex: 1, padding: 20, backgroundColor: COLORS.white },
    signatureHeader: { marginBottom: 16 },
    signatureTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: COLORS.textDark },
    signatureSubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 4 },
    signatureBox: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginBottom: 20 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
    closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 15, padding: 2 },
});

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 10 },
    modalContainer: { width: '100%', backgroundColor: COLORS.white, borderRadius: 12, padding: 20, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, flex: 1, marginRight: 8 },
    headerSubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
    contentScrollView: { marginVertical: 12 },
    table: { borderRadius: 6, marginBottom: 16 },
    tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, alignItems: 'center', },
    tableCellHeader: { fontSize: 11, color: COLORS.textDark, fontWeight: 'bold' },
    tableCellSub: { fontSize: 10, color: COLORS.textLight },
    tableCell: { fontSize: 12, color: COLORS.textMedium, flex: 1, textAlign: 'center', paddingHorizontal: 2 },
    actionsCell: { flex: 2, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
    iconButton: { padding: 4 },
    changeStatusBtn: { backgroundColor: COLORS.primaryLight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15 },
    changeStatusBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 11 },
    footer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.borderLight, alignItems: 'flex-end' },
    grandTotalLabel: { fontSize: 14, color: COLORS.textLight },
    grandTotal: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginTop: 4 },
    statusButtonContainer: { paddingVertical: 8 },
    statusButton: { borderRadius: 8, paddingVertical: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    statusButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    productInfoContainer: { backgroundColor: COLORS.background, borderRadius: 8, padding: 16, marginVertical: 12 },
    productNameTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: COLORS.textDark },
    insufficientStockRow: { backgroundColor: COLORS.dangerLight },
    insufficientStockText: { color: COLORS.danger, fontSize: 11, fontWeight: 'bold' },
    pickerLabel: { fontSize: 16, color: COLORS.textMedium, marginBottom: 8, marginTop: 16, },
    insufficientItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    insufficientProductName: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, marginBottom: 4 },
    insufficientDetails: { flexDirection: 'row', justifyContent: 'space-between' },
    insufficientDetail: { fontSize: 14, color: COLORS.textMedium },
    summaryTableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1.5, borderBottomColor: COLORS.border, backgroundColor: COLORS.white, },
    summaryTableHeaderCell: { fontSize: 11, color: COLORS.textLight, fontWeight: 'bold', textTransform: 'uppercase', },
    summaryTableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, alignItems: 'center', },
    summaryTableCell: { fontSize: 13, color: COLORS.textMedium, fontWeight: '500', },
    summaryTableCellSub: { fontSize: 11, color: COLORS.textLighter, marginTop: 2, },
    quantityTracker: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: COLORS.background, borderRadius: 6, marginVertical: 12 },
    batchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    batchInfo: { marginLeft: 12, flex: 1 },
    batchNumber: { fontSize: 15, fontWeight: '500', color: COLORS.textDark },
    batchExpiry: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
});