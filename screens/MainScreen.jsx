import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import DashboardScreen from './DashboardScreen';
import OrdersScreen from './OrdersScreen';
import ChatScreen from './ChatScreen';

// --- REFINED COLOR PALETTE ---
const COLORS = {
  primary: '#1A73E8', // A slightly more modern blue
  white: '#FFFFFF',
  inactive: '#8E8E93', // Standard inactive gray
  background: '#F4F6F8', // Light background for contrast
  danger: '#D32F2F',
};

const Tab = createBottomTabNavigator();

export default function MainScreen() {
  // Example: You can get this from your state or API
  const unreadMessages = 0; 

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

        // --- UPDATED ICONS ---
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          const iconSize = focused ? 28 : 26; // Make active icon slightly larger

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
          // --- HIDE BADGE IF ZERO ---
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