import React, { useEffect } from 'react';
import { TouchableOpacity, Alert, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from "expo-location";
import api from '../utils/api.js';

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

  // This function gets the location once and sends it to the server.
  const sendLocationOnce = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn("⚠️ Location permission not granted.");
      Alert.alert('Permission Required', 'Location access is needed to update your status.');
      return;
    }

    try {
      console.log("Getting current location...");
      const location = await Location.getCurrentPositionAsync({});
      
      await api.post("mobile/staff/location-update", {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log("✅ One-time location sent successfully:", location.coords);

    } catch (err) {
      console.error("❌ Failed to send initial location:", err.message);
      Alert.alert('Error', 'Could not send your location to the server.');
    }
  };

  // This hook ensures the location is sent every time the user logs in
  // because the screen is re-mounted on each login.
  useEffect(() => {
    const timer = setTimeout(() => {
      sendLocationOnce();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post('/mobile/staff/logout');
              await AsyncStorage.removeItem('authToken');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error("Logout failed:", error);
              await AsyncStorage.removeItem('authToken');
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          },
        },
      ]
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitleAlign: 'center',
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <MaterialCommunityIcons name="logout" size={26} color={COLORS.white} />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: { height: 65, paddingTop: 5, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          const iconSize = focused ? 28 : 26;
          if (route.name === 'Dashboard') iconName = focused ? 'view-grid' : 'view-grid-outline';
          else if (route.name === 'Orders') iconName = focused ? 'clipboard-text' : 'clipboard-text-outline';
          else if (route.name === 'Chat') iconName = focused ? 'chat-processing' : 'chat-processing-outline';
          return <MaterialCommunityIcons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ 
          title: 'Messages',
          tabBarBadge: unreadMessages > 0 ? unreadMessages : null,
          tabBarBadgeStyle: { backgroundColor: COLORS.danger, color: COLORS.white }
        }}
      />
    </Tab.Navigator>
  );
}