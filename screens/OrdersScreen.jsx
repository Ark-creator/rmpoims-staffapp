import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// --- DUMMY DATA (Pampalit sa backend data) ---
const summaryData = [
  { title: 'Total Orders This Week', count: 42, icon: 'chart-line' },
  { title: 'Pending Orders', count: 6, icon: 'clock-outline' },
  { title: 'Cannot Be Fulfilled', count: 2, icon: 'alert-circle-outline', isAlert: true },
  { title: 'Insufficient Products', count: 5, icon: 'package-variant-closed-remove', isAlert: true },
];

const ordersByProvince = {
  "Pampanga": {
    "Company A": [
      { id: 1, employeeName: 'Juan Dela Cruz', date: 'Jul 15, 2025' },
      { id: 2, employeeName: 'Maria Clara', date: 'Jul 14, 2025' },
    ],
    "Company B": [
      { id: 3, employeeName: 'Jose Rizal', date: 'Jul 13, 2025' },
    ],
  },
  "Tarlac": {
    "Company C": [
      { id: 4, employeeName: 'Andres Bonifacio', date: 'Jul 12, 2025' },
    ],
  },
};
// ----------------------------------------------------

// --- UI COMPONENTS ---

// Summary Card (para sa apat na cards sa taas)
const SummaryCard = ({ title, count, icon, isAlert }) => (
  <View style={[styles.summaryCard, isAlert && styles.alertCard]}>
    <View>
      <Text style={[styles.summaryCount, isAlert && styles.alertText]}>{count}</Text>
      <Text style={[styles.summaryTitle, isAlert && styles.alertText]}>{title}</Text>
    </View>
    <MaterialCommunityIcons name={icon} size={30} color={isAlert ? '#FFF' : '#1A73E8'} />
  </View>
);

// Order Item Card (pampalit sa table rows)
const OrderItemCard = ({ order }) => (
  <View style={styles.orderItem}>
    <View>
      <Text style={styles.orderEmployee}>{order.employeeName}</Text>
      <Text style={styles.orderDate}>{order.date}</Text>
    </View>
    <TouchableOpacity style={styles.viewButton}>
      <Text style={styles.viewButtonText}>View</Text>
    </TouchableOpacity>
  </View>
);


// --- MAIN ORDERS SCREEN ---
export default function OrdersScreen() {
  const [selectedCompany, setSelectedCompany] = useState('All');
  const provinceName = "Pampanga"; // Example province
  const companies = ordersByProvince[provinceName];
  const companyNames = ['All', ...Object.keys(companies)];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Summary Cards Section */}
        <View style={styles.summaryGrid}>
          {summaryData.map((item, index) => <SummaryCard key={index} {...item} />)}
        </View>

        {/* Orders List Section */}
        <Text style={styles.provinceTitle}>Orders In: {provinceName}</Text>

        <View style={styles.listContainer}>
          {/* Controls: Search, Buttons, Picker */}
          <View style={styles.controlsContainer}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={22} color="#8E8E93" />
              <TextInput
                placeholder="Search Customer by Name"
                style={styles.searchInput}
              />
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.button}>
                <MaterialCommunityIcons name="qrcode-scan" size={18} color="#fff" />
                <Text style={styles.buttonText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button}>
                <MaterialCommunityIcons name="export" size={18} color="#fff" />
                <Text style={styles.buttonText}>Export</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCompany}
                onValueChange={(itemValue) => setSelectedCompany(itemValue)}
                style={styles.picker}
              >
                {companyNames.map(name => <Picker.Item key={name} label={name} value={name} />)}
              </Picker>
            </View>
          </View>

          {/* List of Orders */}
          {Object.entries(companies).map(([companyName, orders]) => (
            (selectedCompany === 'All' || selectedCompany === companyName) && (
              <View key={companyName} style={styles.companySection}>
                <Text style={styles.companyTitle}>Orders From: {companyName}</Text>
                {orders.map(order => <OrderItemCard key={order.id} order={order} />)}
              </View>
            )
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollContainer: {
    padding: 16,
  },
  // Summary Grid Styles
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  alertCard: {
    backgroundColor: '#E53935',
    borderColor: '#C62828',
    borderWidth: 2,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  alertText: {
    color: '#FFF',
  },
  // Main List Container Styles
  provinceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005382',
    marginBottom: 16,
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  // Controls Styles
  controlsContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A73E8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#F4F6F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  picker: {
    width: '100%',
  },
  // Order List Styles
  companySection: {
    marginTop: 24,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderEmployee: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  viewButton: {
    backgroundColor: '#E8F0FE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  viewButtonText: {
    color: '#1A73E8',
    fontWeight: 'bold',
  },
});