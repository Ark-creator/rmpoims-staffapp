import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api'; // Your API utility

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

  // --- LOGOUT HANDLER ---
  // This function shows a confirmation, calls the logout API, clears the token,
  // and resets the navigation stack to the Login screen.
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
              // 1. Invalidate the token on the server
              await api.post('/mobile/staff/logout');

              // 2. Remove the token from local storage
              await AsyncStorage.removeItem('userToken'); // Make sure 'userToken' is your correct storage key

              // 3. Reset navigation to the login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }], // Make sure 'Login' is the correct name of your login route
              });
            } catch (error) {
              console.error("Logout failed:", error);
              Alert.alert("Error", "An error occurred while signing out.");
              // Even if the API call fails, we should still try to log the user out locally
              await AsyncStorage.removeItem('userToken');
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
        headerStyle: {
          backgroundColor: COLORS.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
        },
        headerTitleAlign: 'center',

        // --- ADD HEADER BUTTON ---
        // This adds the logout icon to the right side of the header on all tab screens.
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <MaterialCommunityIcons name="logout" size={26} color={COLORS.white} />
          </TouchableOpacity>
        ),
        
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          height: 65,
          paddingTop: 5,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          const iconSize = focused ? 28 : 26;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-grid' : 'view-grid-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'clipboard-text' : 'clipboard-text-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chat-processing' : 'chat-processing-outline';
          }
          
          return <MaterialCommunityIcons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
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