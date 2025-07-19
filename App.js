import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from './screens/Login';
import TwoFactor from './screens/TwoFactor';
import MainScreen from './screens/MainScreen';

// 1. Import the ScannerScreen from the file where you defined it
// Make sure you have added "export" before the function as instructed previously.
import { ScannerScreen } from './screens/OrdersScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        {/* Your existing screens... */}
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="TwoFactor" component={TwoFactor} options={{ title: "Two Factor Authentication" }} />
        <Stack.Screen name="MainScreen" component={MainScreen} options={{ headerShown: false }} />

        {/* 2. Add the ScannerScreen to your root stack navigator */}
        <Stack.Screen 
          name="ScannerScreen" 
          component={ScannerScreen} 
          options={{ 
            title: 'Scan Order QR Code',
            // 'modal' presentation is a good user experience for tasks like this.
            presentation: 'modal', 
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}