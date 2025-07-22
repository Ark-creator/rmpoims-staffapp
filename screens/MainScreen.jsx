import React, { useEffect, useRef } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import api from '../utils/api';

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
const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ TaskManager error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      try {
        console.log('📡 Sending background location:', location.coords);
        await api.post('mobile/staff/location-update', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (e) {
        console.error('❌ Failed to send background location:', e.message);
      }
    }
  }
});

export default function MainScreen() {
  const navigation = useNavigation();
  const unreadMessages = 0;

  useEffect(() => {
    const startBackgroundLocation = async () => {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

      if (fgStatus !== 'granted' || bgStatus !== 'granted') {
        Alert.alert('Permission Required', 'Location access is needed to track in background.');
        return;
      }

      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // every 10 seconds
          distanceInterval: 10, // or every 10 meters
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'ARKQuest Location Tracking',
            notificationBody: 'Tracking your location in background...',
          },
        });

        console.log('📍 Background location tracking started');
      }
    };

    startBackgroundLocation();

    return () => {
      // Optionally stop location tracking on unmount (e.g., logout)
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then((started) => {
        if (started) {
          Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          console.log("📍 Background location tracking stopped.");
        }
      });
    };
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
              await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
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
          tabBarBadgeStyle: { backgroundColor: COLORS.danger, color: COLORS.white },
        }}
      />
    </Tab.Navigator>
  );
}
