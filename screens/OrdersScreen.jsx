import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Modal,
  Dimensions,
  RefreshControl,
  FlatList 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
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
// INSUFFICIENT ORDERS MODAL COMPONENT
// =================================================================
const InsufficientOrdersModal = ({ visible, onClose, data }) => {
  const renderHeader = () => (
    <View style={modalStyles.summaryTableHeader}>
      <Text style={[modalStyles.summaryTableHeaderCell, { flex: 2.5 }]}>Product</Text>
      <Text style={[modalStyles.summaryTableHeaderCell, { flex: 2 }]}>Employee</Text>
      <Text style={[modalStyles.summaryTableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Avail</Text>
      <Text style={[modalStyles.summaryTableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Ordered</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={modalStyles.summaryTableRow}>
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
        <View style={[modalStyles.modalContainer, { width: width * 0.9 }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Orders That Cannot Be Fulfilled</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            ListHeaderComponent={renderHeader}
            stickyHeaderIndices={[0]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="check-circle-outline" size={48} color={COLORS.success} />
                <Text style={styles.emptyStateText}>All orders can be fulfilled</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

// =================================================================
// INSUFFICIENT PRODUCTS MODAL COMPONENT
// =================================================================
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
            keyExtractor={(item, index) => index.toString()}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="check-circle-outline" size={48} color={COLORS.success} />
                <Text style={styles.emptyStateText}>All products have sufficient stock</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

// =================================================================
// VIEW DETAILS MODAL COMPONENT
// =================================================================
const ViewDetailsModal = ({ visible, onClose, orderData, onUpdateStatusRequest }) => {
    if (!orderData) return null;

    const { employeeInfo, orderGroup } = orderData;
    const [name, date] = employeeInfo.split('|');

    const activeOrders = Object.values(orderGroup || {}).filter(o => o && o.status !== 'delivered' && o.status !== 'cancelled');

    const grandTotal = activeOrders.reduce((sum, order) => {
        if (!order || !order.quantity || !order.exclusive_deal?.price) return sum;
        return sum + (order.quantity * (order.exclusive_deal?.price || 0));
    }, 0);

    const OrderRow = ({ order, isHeader }) => {
        if (!isHeader && (!order || typeof order !== 'object')) return null;

        const product = order?.exclusive_deal?.product;
        const availableStock = order?.available_stock;
        const quantity = order?.quantity;

        const isInsufficient = !isHeader && (
            availableStock === 'expired' ||
            (typeof availableStock === 'number' && quantity && availableStock < quantity)
        );

        return (
            <View style={[modalStyles.tableRow, isInsufficient && modalStyles.insufficientStockRow]}>
                <View style={{ flex: 2 }}>
                    <Text style={modalStyles.tableCellHeader} numberOfLines={1}>
                        {isHeader ? 'Generic Name' : product?.generic_name || 'N/A'}
                    </Text>
                    {!isHeader && (
                        <Text style={modalStyles.tableCellSub} numberOfLines={1}>
                            {product?.brand_name || 'N/A'}
                        </Text>
                    )}
                </View>

                <Text style={modalStyles.tableCell}>
                    {isHeader ? 'Form' : product?.form || 'N/A'}
                </Text>

                <Text
                    style={[
                        modalStyles.tableCell,
                        availableStock === 'expired' && { color: COLORS.danger, fontWeight: 'bold' },
                    ]}
                >
                    {isHeader
                        ? 'Available'
                        : availableStock === 'expired'
                        ? 'Expired'
                        : availableStock ?? 'N/A'}
                </Text>

                <Text style={modalStyles.tableCell}>
                    {isHeader ? 'Qty' : quantity ?? 'N/A'}
                </Text>

                {isHeader ? (
                    <Text style={modalStyles.tableCell}>Actions</Text>
                ) : isInsufficient ? (
                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                        <Text style={modalStyles.insufficientStockText}>Cannot Fulfill</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={modalStyles.changeStatusBtn}
                        onPress={() => onUpdateStatusRequest(order)}
                    >
                        <Text style={modalStyles.changeStatusBtnText}>Update</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={modalStyles.modalContainer}>
                    <View style={modalStyles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={modalStyles.headerTitle}>Order Details</Text>
                            <Text style={modalStyles.headerSubtitle}>Employee: {name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons 
                                name="close-circle" 
                                size={30} 
                                color={COLORS.textLight} 
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={modalStyles.contentScrollView}>
                        {activeOrders.length > 0 ? (
                            <View style={modalStyles.table}>
                                <OrderRow isHeader />
                                {activeOrders.map(order => (
                                    <OrderRow
                                        key={order.id}
                                        order={order}
                                        onUpdateStatusRequest={onUpdateStatusRequest}
                                    />
                                ))}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons 
                                    name="package-variant" 
                                    size={48} 
                                    color={COLORS.textLighter} 
                                />
                                <Text style={styles.emptyStateText}>
                                    No active orders for this entry.
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={modalStyles.footer}>
                        <Text style={modalStyles.grandTotalLabel}>TOTAL AMOUNT:</Text>
                        <Text style={modalStyles.grandTotal}>
                            ₱{grandTotal.toLocaleString()}
                        </Text>
                    </View>
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
            <View style={[modalStyles.modalContainer, { width: width * 0.85 }]}>
                <View style={modalStyles.header}>
                    <Text style={modalStyles.headerTitle}>Update Order Status</Text>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons 
                            name="close-circle" 
                            size={30} 
                            color={COLORS.textLight} 
                        />
                    </TouchableOpacity>
                </View>
                
                <View style={modalStyles.productInfoContainer}>
                    <Text style={modalStyles.productNameTitle}>{productName}</Text>
                </View>

                <View style={modalStyles.statusButtonContainer}>
                    <TouchableOpacity 
                        style={[modalStyles.statusButton, {backgroundColor: COLORS.warning}]} 
                        onPress={() => onSubmit('pending')}
                    >
                        <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.white} />
                        <Text style={modalStyles.statusButtonText}>PENDING</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[modalStyles.statusButton, {backgroundColor: COLORS.primary}]} 
                        onPress={() => onSubmit('packed')}
                    >
                        <MaterialCommunityIcons name="package-variant-closed" size={20} color={COLORS.white} />
                        <Text style={modalStyles.statusButtonText}>PACKED</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[modalStyles.statusButton, {backgroundColor: COLORS.info}]} 
                        onPress={() => onSubmit('out for delivery')}
                    >
                        <MaterialCommunityIcons name="truck-fast-outline" size={20} color={COLORS.white} />
                        <Text style={modalStyles.statusButtonText}>OUT FOR DELIVERY</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[modalStyles.statusButton, {backgroundColor: COLORS.success}]} 
                        onPress={() => onSubmit('delivered')}
                    >
                        <MaterialCommunityIcons name="package-variant-closed-check" size={20} color={COLORS.white} />
                        <Text style={modalStyles.statusButtonText}>DELIVERED</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[modalStyles.statusButton, {backgroundColor: COLORS.danger}]} 
                        onPress={() => onSubmit('cancelled')}
                    >
                        <MaterialCommunityIcons name="close-circle-outline" size={20} color={COLORS.white} />
                        <Text style={modalStyles.statusButtonText}>CANCELLED</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
  );
};

// =================================================================
// ASSIGN STAFF MODAL COMPONENT
// =================================================================
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
                    if (response.data.length > 0) {
                        setSelectedStaffId(response.data[0].id);
                    }
                } catch (error) {
                    Alert.alert('Error', 'Failed to fetch available staff.');
                    console.error("Fetch Staff Error:", error);
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
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close-circle" size={30} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
                    ) : staffList.length > 0 ? (
                        <View>
                            <Text style={modalStyles.pickerLabel}>Select staff for this delivery:</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={selectedStaffId}
                                    onValueChange={(itemValue) => setSelectedStaffId(itemValue)}
                                    style={styles.picker}
                                >
                                    {staffList.map((staff) => (
                                        <Picker.Item key={staff.id} label={`${staff.staff_username} (${staff.email})`} value={staff.id} />
                                    ))}
                                </Picker>
                            </View>
                            <TouchableOpacity
                                style={[styles.button, { marginTop: 20, backgroundColor: COLORS.success }]}
                                onPress={handleSubmit}
                            >
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
          <SafeAreaView style={[styles.scannerContainer, styles.center]}>
              <MaterialCommunityIcons 
                  name="camera-off" 
                  size={48} 
                  color={COLORS.textLighter} 
                  style={{ marginBottom: 20 }}
              />
              <Text style={styles.permissionText}>
                  Camera permission is required to scan QR codes
              </Text>
              <TouchableOpacity 
                  style={[styles.button, { marginTop: 20 }]} 
                  onPress={requestPermission}
              >
                  <Text style={styles.buttonText}>Grant Permission</Text>
              </TouchableOpacity>
          </SafeAreaView>
      );
  }
  
  const handleBarCodeScanned = ({ data }) => {
      try {
          const parsedData = JSON.parse(data);
          if (parsedData.order_id && parsedData.product_name) {
              setScannedData(parsedData);
              Alert.alert(
                  'QR Code Scanned', 
                  `Product: ${parsedData.product_name}`,
                  [{ text: 'OK', onPress: () => {} }]
              );
          } else { 
              throw new Error("Invalid QR code format"); 
          }
      } catch (error) {
          Alert.alert(
              'Invalid QR Code', 
              error.message, 
              [{ text: 'Try Again' }]
          );
      }
  };
  
  const handleSignatureOK = (sig) => setSignature(sig);
  const handleSignatureEnd = () => { if (sigRef.current) { sigRef.current.readSignature(); } };
  const handleClearSignature = () => { 
      if (sigRef.current) { 
          sigRef.current.clearSignature(); 
      } 
      setSignature(null); 
  };

  const handleSubmit = async () => {
      if (!signature) { 
          Alert.alert(
              'Signature Required', 
              'Please provide a signature before submitting.',
              [{ text: 'OK' }]
          ); 
          return; 
      }
      
      setIsLoading(true);
      const formData = new FormData();
      formData.append('qr_data', JSON.stringify(scannedData));
      formData.append('signature', { 
          uri: signature, 
          name: `signature_${Date.now()}.png`, 
          type: 'image/png' 
      });
      
      try {
          const response = await api.post(
              '/mobile/staff/process-scan', 
              formData, 
              { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          Alert.alert('Success', response.data.message);
          navigation.goBack();
      } catch (error) {
          Alert.alert(
              'Error', 
              error.response?.data?.message || 'Failed to process the scan'
          );
      } finally {
          setIsLoading(false);
      }
  };

  if (isLoading) {
      return (
          <SafeAreaView style={[styles.scannerContainer, styles.center]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Processing your request...</Text>
          </SafeAreaView>
      );
  }

  return (
      <SafeAreaView style={styles.scannerContainer}>
          {!scannedData ? (
              <CameraView 
                  onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned} 
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }} 
                  style={StyleSheet.absoluteFillObject}
              >
                  <View style={styles.scannerOverlay}>
                      <View style={styles.scannerFrame}>
                          <View style={[styles.scannerCorner, styles.cornerTopLeft]} />
                          <View style={[styles.scannerCorner, styles.cornerTopRight]} />
                          <View style={[styles.scannerCorner, styles.cornerBottomLeft]} />
                          <View style={[styles.scannerCorner, styles.cornerBottomRight]} />
                      </View>
                      <Text style={styles.scanPrompt}>Align QR code within the frame</Text>
                  </View>
              </CameraView>
          ) : (
              <View style={styles.signatureContainer}>
                  <View style={styles.signatureHeader}>
                      <Text style={styles.signatureTitle}>Customer Signature</Text>
                      <Text style={styles.signatureSubtitle}>
                          Please sign below to confirm receipt
                      </Text>
                  </View>
                  
                  <View style={styles.signatureBox}>
                      <SignatureScreen 
                          ref={sigRef} 
                          onEnd={handleSignatureEnd} 
                          onOK={handleSignatureOK} 
                          webStyle={`.m-signature-pad--footer {display: none;}`} 
                          backgroundColor={COLORS.background}
                          penColor={COLORS.textDark}
                      />
                  </View>
                  
                  <View style={styles.buttonRow}>
                      <TouchableOpacity 
                          style={[styles.button, styles.clearButton]} 
                          onPress={handleClearSignature}
                      >
                          <MaterialCommunityIcons 
                              name="eraser" 
                              size={18} 
                              color={COLORS.danger} 
                          />
                          <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                          style={[
                              styles.button, 
                              styles.submitButton, 
                              !signature && styles.disabledButton
                          ]} 
                          onPress={handleSubmit} 
                          disabled={!signature}
                      >
                          <MaterialCommunityIcons 
                              name="check-circle" 
                              size={18} 
                              color={COLORS.white} 
                          />
                          <Text style={styles.buttonText}>Submit</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          )}
      </SafeAreaView>
  );
}

// =================================================================
// ORDERS SCREEN COMPONENT
// =================================================================
export default function OrdersScreen() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
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
    
    const [selectedGroupData, setSelectedGroupData] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [modalData, setModalData] = useState([]);

    const fetchOrders = async () => { 
        try { 
            setLoading(true); 
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

    const handleRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const handleOpenViewModal = (orderData) => { 
        setSelectedGroupData(orderData); 
        setViewModalVisible(true); 
    };
    
    const handleUpdateStatusRequest = (product) => { 
        setSelectedProduct(product); 
        setStatusModalVisible(true); 
    };
    
    const handleCloseModals = () => { 
        setViewModalVisible(false); 
        setStatusModalVisible(false); 
        setAssignStaffModalVisible(false);
        setInsufficientOrdersModalVisible(false);
        setInsufficientProductsModalVisible(false);
        setSelectedGroupData(null); 
        setSelectedProduct(null); 
    };

    const showInsufficientOrdersModal = (data) => {
        setModalData(data || []);
        setInsufficientOrdersModalVisible(true);
    };

    const showInsufficientProductsModal = (data) => {
        setModalData(data || []);
        setInsufficientProductsModalVisible(true);
    };

    const handleStatusSubmit = async (status, staffId = null) => {
        if (!selectedProduct) return;

        if (status === 'out for delivery' && !staffId) {
            setStatusModalVisible(false);
            setAssignStaffModalVisible(true);
            return;
        }

        try {
            const payload = { status };
            if (staffId) {
                payload.staff_id = staffId;
            }
            
            await api.post(
                `/mobile/staff/orders/${selectedProduct.id}/update-status`, 
                payload
            );
            
            Alert.alert(
                'Status Updated', 
                `Order status updated to "${status}".`
            );
            
            handleCloseModals();
            fetchOrders();

        } catch (error) {
            Alert.alert(
                'Update Failed', 
                error.response?.data?.message || 'Could not update status. Please try again.'
            );
        }
    };

    const handleAssignStaffSubmit = (staffId) => {
        handleStatusSubmit('out for delivery', staffId);
    };

    const companyNames = ['All', ...new Set(
        Object.values(data.ordersByProvince)
            .flatMap(c => Object.keys(c))
    )];
    
    const summaryData = data.summary ? [
        { 
            title: 'Orders This Week', 
            count: data.summary.ordersThisWeek, 
            icon: 'chart-line', 
            color: COLORS.primary 
        },
        { 
            title: 'Pending Orders', 
            count: data.summary.pendingOrders, 
            icon: 'clock-outline', 
            color: COLORS.warning 
        },
        { 
            title: 'Cannot Fulfill', 
            count: data.summary.insufficientOrders, 
            icon: 'alert-circle-outline', 
            color: COLORS.danger, 
            isAlert: true,
            onPress: () => showInsufficientOrdersModal(data.summary.insufficientOrderLines)
        },
        { 
            title: 'Insufficient Products', 
            count: data.summary.insufficientProducts, 
            icon: 'package-variant-closed-minus', 
            color: COLORS.danger, 
            isAlert: true,
            onPress: () => showInsufficientProductsModal(data.summary.insufficientSummary)
        },
    ] : [];

    const SummaryCard = ({ title, count, icon, color, isAlert, onPress }) => (
        <TouchableOpacity 
            onPress={onPress}
            style={[
                styles.summaryCard, 
                isAlert && styles.alertCard,
                { borderLeftColor: color }
            ]}
        >
            <View>
                <Text style={[
                    styles.summaryCount, 
                    isAlert && styles.alertText
                ]}>
                    {count}
                </Text>
                <Text style={[
                    styles.summaryTitle, 
                    isAlert && styles.alertText
                ]}>
                    {title}
                </Text>
            </View>
            <MaterialCommunityIcons 
                name={icon} 
                size={28} 
                color={isAlert ? COLORS.white : color} 
            />
        </TouchableOpacity>
    );

    const OrderItemCard = ({ employeeInfo, orderGroup, onView }) => {
        const [name, date] = employeeInfo.split('|');
    
        // MODIFIED LOGIC:
        // Count expired or LOW stock items, but NOT 'out of stock' (available: 0)
        // to match the summary card logic.
        const insufficientCount = Object.values(orderGroup || {}).reduce((count, order) => {
            if (!order || typeof order !== 'object') return count;
    
            const isInsufficient = order.available_stock === 'expired' ||
                (typeof order.available_stock === 'number' && order.quantity && order.available_stock < order.quantity);
    
            // Only count if it's insufficient AND the stock is not exactly 0.
            if (isInsufficient && order.available_stock !== 0) {
                return count + 1;
            }
            return count;
        }, 0);
    
        return (
            <View style={styles.orderItem}>
                <View style={styles.orderInfo}>
                    <MaterialCommunityIcons 
                        name="account-circle" 
                        size={24} 
                        color={COLORS.textLight} 
                    />
                    <View style={styles.orderTextContainer}>
                        <Text style={styles.orderEmployee}>{name}</Text>
                        <Text style={styles.orderDate}>
                            {new Date(date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>
                </View>
                
                <View style={styles.orderActions}>
                    {insufficientCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{insufficientCount}</Text>
                        </View>
                    )}
                    <TouchableOpacity 
                        style={styles.viewButton} 
                        onPress={onView}
                    >
                        <Text style={styles.viewButtonText}>View</Text>
                        <MaterialCommunityIcons 
                            name="chevron-right" 
                            size={20} 
                            color={COLORS.primary} 
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ViewDetailsModal 
                visible={isViewModalVisible} 
                onClose={handleCloseModals} 
                orderData={selectedGroupData} 
                onUpdateStatusRequest={handleUpdateStatusRequest} 
            />
            
            <ChangeStatusModal 
                visible={isStatusModalVisible} 
                onClose={handleCloseModals} 
                onSubmit={handleStatusSubmit} 
                productName={selectedProduct?.exclusive_deal?.product?.generic_name || ''} 
            />

            <AssignStaffModal
                visible={isAssignStaffModalVisible}
                onClose={handleCloseModals}
                onSubmit={handleAssignStaffSubmit}
                orderId={selectedProduct?.id}
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
            
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={COLORS.primaryDark} style={styles.loader}/>
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
                                <SummaryCard 
                                    key={i} 
                                    title={item.title} 
                                    count={item.count} 
                                    icon={item.icon} 
                                    color={item.color} 
                                    isAlert={item.isAlert} 
                                    onPress={item.onPress}
                                />
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
                                    {companyNames.map(n => <Picker.Item key={n} label={n === 'All' ? 'All Companies' : n} value={n} />)}
                                </Picker>
                            </View>
                        </View>
                        
                        <View style={styles.actionBar}>
                            <TouchableOpacity 
                                style={[styles.button, styles.scanButton]} 
                                onPress={() => navigation.navigate('ScannerScreen')}
                            >
                                <MaterialCommunityIcons name="qrcode-scan" size={20} color={COLORS.white} />
                                <Text style={styles.buttonText}>Scan QR Code</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {Object.entries(data.ordersByProvince).map(([province, companies]) => (
                            <View key={province} style={styles.provinceSection}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                                    <Text style={styles.provinceTitle}>{province}</Text>
                                </View>
                                
                                {Object.entries(companies)
                                    .filter(([co]) => filters.company === 'All' || filters.company === co)
                                    .map(([co, employees]) => {
                                        const filteredEmployees = Object.entries(employees).filter(([emp]) => 
                                            emp.toLowerCase().includes(filters.search.toLowerCase())
                                        );
                                        
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
                        ))}
                        
                        {Object.keys(data.ordersByProvince).length === 0 && (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="package-variant-closed" size={48} color={COLORS.textLighter} />
                                <Text style={styles.emptyStateText}>No orders found</Text>
                                <Text style={styles.emptyStateSubtext}>Orders will appear here when available</Text>
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
  container: { 
      flex: 1, 
      backgroundColor: COLORS.background 
  },
  scrollContainer: { 
      padding: 16, 
      paddingBottom: 20 
  },
  loader: {
      marginTop: 40
  },
  screenTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.textDark,
      marginBottom: 16
  },
  summaryGrid: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      justifyContent: 'space-between', 
      marginBottom: 16 
  },
  summaryCard: { 
      width: '48%', 
      backgroundColor: COLORS.white, 
      padding: 16, 
      borderRadius: 8, 
      marginBottom: 12, 
      elevation: 1,
      shadowColor: COLORS.textDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderLeftWidth: 4
  },
  alertCard: { 
      backgroundColor: COLORS.danger 
  }, 
  summaryCount: { 
      fontSize: 22, 
      fontWeight: 'bold', 
      color: COLORS.textDark 
  }, 
  summaryTitle: { 
      fontSize: 14, 
      color: COLORS.textLight, 
      marginTop: 4 
  }, 
  alertText: { 
      color: COLORS.white 
  },
  filterSection: {
      backgroundColor: COLORS.white,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      elevation: 1
  },
  searchContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: COLORS.background, 
      borderRadius: 8, 
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12 
  },
  searchInput: { 
      flex: 1, 
      fontSize: 16, 
      marginLeft: 8,
      color: COLORS.textDark
  }, 
  pickerContainer: { 
      backgroundColor: COLORS.background, 
      borderRadius: 8, 
      overflow: 'hidden'
  }, 
  picker: { 
      width: '100%',
      color: COLORS.textDark
  },
  actionBar: {
      marginBottom: 16
  },
  scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12
  },
  provinceSection: { 
      backgroundColor: COLORS.white, 
      borderRadius: 8, 
      padding: 16, 
      marginBottom: 16,
      elevation: 1
  },
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      paddingBottom: 12
  },
  provinceTitle: { 
      fontSize: 18, 
      fontWeight: 'bold', 
      color: COLORS.textDark,
      marginLeft: 8
  },
  companySection: { 
      marginTop: 8 
  },
  companyTitle: { 
      fontSize: 16, 
      fontWeight: '600', 
      color: COLORS.textMedium, 
      marginBottom: 8 
  },
  orderItem: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingVertical: 12, 
      borderBottomWidth: 1, 
      borderBottomColor: COLORS.borderLight 
  },
  orderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1
  },
  orderTextContainer: {
      marginLeft: 12
  },
  orderEmployee: { 
      fontSize: 16, 
      fontWeight: '600',
      color: COLORS.textDark
  }, 
  orderDate: { 
      fontSize: 13, 
      color: COLORS.textLight,
      marginTop: 2
  },
  orderActions: {
      flexDirection: 'row',
      alignItems: 'center'
  },
  badge: { 
      backgroundColor: COLORS.danger, 
      borderRadius: 10, 
      minWidth: 20, 
      height: 20, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginRight: 8 
  },
  badgeText: { 
      color: COLORS.white, 
      fontSize: 12, 
      fontWeight: 'bold', 
      paddingHorizontal: 4 
  }, 
  viewButton: { 
      flexDirection: 'row',
      alignItems: 'center'
  }, 
  viewButtonText: { 
      color: COLORS.primary, 
      fontWeight: '600',
      marginRight: 4
  },
  button: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: COLORS.primary, 
      paddingVertical: 12, 
      borderRadius: 8, 
      gap: 8,
      elevation: 2
  }, 
  buttonText: { 
      color: COLORS.white, 
      fontWeight: 'bold', 
      fontSize: 16 
  },
  clearButton: { 
      backgroundColor: COLORS.dangerLight, 
      width: '48%' 
  }, 
  clearButtonText: { 
      color: COLORS.danger, 
      fontWeight: 'bold' 
  },
  submitButton: { 
      backgroundColor: COLORS.primary, 
      width: '48%' 
  }, 
  disabledButton: { 
      backgroundColor: COLORS.primaryLight 
  },
  errorContainer: {
      alignItems: 'center',
      padding: 20,
      marginTop: 40
  },
  errorText: { 
      textAlign: 'center', 
      color: COLORS.danger, 
      marginVertical: 16, 
      fontSize: 16 
  },
  emptyState: {
      alignItems: 'center',
      padding: 40,
      marginTop: 20
  },
  emptyStateText: {
      fontSize: 16,
      color: COLORS.textMedium,
      marginTop: 12,
      fontWeight: '500'
  },
  emptyStateSubtext: {
      fontSize: 14,
      color: COLORS.textLight,
      marginTop: 4,
      textAlign: 'center'
  },
  scannerContainer: { 
      flex: 1, 
      backgroundColor: COLORS.white 
  }, 
  center: { 
      justifyContent: 'center', 
      alignItems: 'center' 
  }, 
  permissionText: { 
      fontSize: 16, 
      textAlign: 'center', 
      paddingHorizontal: 20,
      color: COLORS.textMedium
  },
  loadingText: { 
      marginTop: 16, 
      fontSize: 16,
      color: COLORS.textMedium
  },
  scannerOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)'
  },
  scannerFrame: {
      width: 250,
      height: 250,
      borderWidth: 2,
      borderColor: COLORS.white,
      position: 'relative'
  },
  scannerCorner: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderColor: COLORS.primary
  },
  cornerTopLeft: {
      top: -2,
      left: -2,
      borderTopWidth: 4,
      borderLeftWidth: 4
  },
  cornerTopRight: {
      top: -2,
      right: -2,
      borderTopWidth: 4,
      borderRightWidth: 4
  },
  cornerBottomLeft: {
      bottom: -2,
      left: -2,
      borderBottomWidth: 4,
      borderLeftWidth: 4
  },
  cornerBottomRight: {
      bottom: -2,
      right: -2,
      borderBottomWidth: 4,
      borderRightWidth: 4
  },
  scanPrompt: { 
      color: COLORS.white, 
      fontSize: 16, 
      marginTop: 20,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 8,
      borderRadius: 4
  },
  signatureContainer: { 
      flex: 1, 
      padding: 20, 
      backgroundColor: COLORS.white 
  }, 
  signatureHeader: {
      marginBottom: 16
  },
  signatureTitle: { 
      fontSize: 20, 
      fontWeight: 'bold', 
      textAlign: 'center',
      color: COLORS.textDark
  },
  signatureSubtitle: {
      fontSize: 14,
      color: COLORS.textLight,
      textAlign: 'center',
      marginTop: 4
  },
  signatureBox: { 
      flex: 1, 
      borderWidth: 1, 
      borderColor: COLORS.border, 
      borderRadius: 8, 
      marginBottom: 20 
  },
  buttonRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between' 
  }
});

const modalStyles = StyleSheet.create({
  overlay: { 
      flex: 1, 
      backgroundColor: 'rgba(0, 0, 0, 0.6)', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 20 
  },
  modalContainer: { 
      width: '100%', 
      backgroundColor: COLORS.white, 
      borderRadius: 12, 
      padding: 20, 
      maxHeight: '85%' 
  },
  header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingBottom: 12, 
      borderBottomWidth: 1, 
      borderBottomColor: COLORS.borderLight 
  },
  headerTitle: { 
      fontSize: 18, 
      fontWeight: 'bold', 
      color: COLORS.textDark 
  },
  headerSubtitle: {
      fontSize: 14,
      color: COLORS.textLight,
      marginTop: 4
  },
  contentScrollView: { 
      marginVertical: 12 
  },
  table: { 
      borderRadius: 6,
      marginBottom: 16
  },
  tableRow: { 
      flexDirection: 'row', 
      paddingVertical: 12, 
      paddingHorizontal: 8, 
      borderBottomWidth: 1, 
      borderBottomColor: COLORS.borderLight, 
      alignItems: 'center', 
      justifyContent: 'space-between'
  },
  tableCellHeader: { 
      fontSize: 12, 
      color: COLORS.textDark, 
      fontWeight: 'bold' 
  }, 
  tableCellSub: { 
      fontSize: 11, 
      color: COLORS.textLight 
  },
  tableCell: { 
      fontSize: 12, 
      color: COLORS.textMedium, 
      flex: 1, 
      textAlign: 'center' 
  },
  changeStatusBtn: { 
      flex: 1.5, 
      backgroundColor: COLORS.primaryLight, 
      paddingVertical: 6, 
      borderRadius: 15, 
      alignItems: 'center' 
  },
  changeStatusBtnText: { 
      color: COLORS.primary, 
      fontWeight: 'bold', 
      fontSize: 11 
  },
  footer: { 
      paddingTop: 16, 
      borderTopWidth: 1, 
      borderTopColor: COLORS.borderLight, 
      alignItems: 'flex-end' 
  },
  grandTotalLabel: {
      fontSize: 14,
      color: COLORS.textLight
  },
  grandTotal: { 
      fontSize: 20, 
      fontWeight: 'bold', 
      color: COLORS.textDark,
      marginTop: 4
  },
  statusButtonContainer: { 
      paddingVertical: 8 
  },
  statusButton: { 
      borderRadius: 8, 
      paddingVertical: 14, 
      marginBottom: 10, 
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8
  },
  statusButtonText: { 
      color: COLORS.white, 
      fontSize: 16, 
      fontWeight: 'bold' 
  },
  productInfoContainer: {
      backgroundColor: COLORS.background,
      borderRadius: 8,
      padding: 16,
      marginVertical: 12
  },
  productNameTitle: { 
      fontSize: 16, 
      fontWeight: '600', 
      textAlign: 'center', 
      color: COLORS.textDark 
  },
  insufficientStockRow: { 
      backgroundColor: COLORS.dangerLight 
  },
  insufficientStockText: { 
      color: COLORS.danger, 
      fontSize: 11, 
      fontWeight: 'bold' 
  },
  pickerLabel: {
      fontSize: 16,
      color: COLORS.textMedium,
      marginBottom: 8,
      marginTop: 16,
  },
  insufficientItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderLight
  },
  insufficientProductName: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textDark,
      marginBottom: 4
  },
  insufficientDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between'
  },
  insufficientDetail: {
      fontSize: 14,
      color: COLORS.textMedium
  },
  summaryTableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  summaryTableHeaderCell: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  summaryTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    alignItems: 'center',
  },
  summaryTableCell: {
    fontSize: 13,
    color: COLORS.textMedium,
    fontWeight: '500',
  },
  summaryTableCellSub: {
    fontSize: 11,
    color: COLORS.textLighter,
    marginTop: 2,
  },
});