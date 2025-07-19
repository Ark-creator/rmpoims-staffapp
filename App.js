import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from './screens/Login';
import TwoFactor from './screens/TwoFactor';
import MainScreen from './screens/MainScreen';
import { ScannerScreen } from './screens/OrdersScreen'; // Import ScannerScreen

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="TwoFactor" component={TwoFactor} options={{ title: "Two Factor Authentication" }} />
        <Stack.Screen name="MainScreen" component={MainScreen} options={{ headerShown: false }} />
        <Stack.Screen 
          name="ScannerScreen" 
          component={ScannerScreen} 
          options={{ 
            title: 'Scan Order QR Code',
            presentation: 'modal', 
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}