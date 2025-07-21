import React, { useEffect } from 'react'; // 👈 Import useEffect
import { TouchableOpacity, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

// 👇 1. IMPORT THE LOCATION TRACKING FUNCTIONS
import { startLocationTracking, stopLocationTracking } from '../utils/background';

import DashboardScreen from './DashboardScreen';
import OrdersScreen from './OrdersScreen';
import ChatScreen from './ChatScreen';

const COLORS = {
  primary: '#1A73E8',
  white: '#FFFFFF',
  inactive: '#8E8E93',
  background: '#F4F6F8',
  danger: '#D32F2F',
};

const Tab = createBottomTabNavigator();

export default function MainScreen() {
  const navigation = useNavigation();
  const unreadMessages = 0;

  // 👇 2. START TRACKING WHEN THE COMPONENT MOUNTS
  useEffect(() => {
    // This will request permissions and start the background task
    startLocationTracking();
  }, []); // The empty array ensures this runs only once when the screen loads

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              // 👇 3. STOP TRACKING BEFORE LOGGING OUT
              await stopLocationTracking();
              
              await api.post('/mobile/staff/logout');
              await AsyncStorage.removeItem('userToken');

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error("Logout failed:", error);
              Alert.alert("Error", "An error occurred while signing out.");
              // Still attempt to clear local data even if API fails
              await stopLocationTracking(); // Also stop tracking on failure
              await AsyncStorage.removeItem('userToken');
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          },
        },
      ]
    );
  };

  // The rest of your component remains the same...
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // ... (rest of your navigator props)
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <MaterialCommunityIcons name="logout" size={26} color={COLORS.white} />
          </TouchableOpacity>
        ),
        // ... (rest of your navigator props)
      })}
    >
      {/* ... (your Tab.Screen components) ... */}
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'Overview' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen} 
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ 
          title: 'Messages',
          tabBarBadge: unreadMessages > 0 ? unreadMessages : null,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.danger,
            color: COLORS.white,
          }
        }}
      />
    </Tab.Navigator>
  );
}