import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DoctorLoginScreen from './screens/DoctorLoginScreen';
import DoctorRegisterScreen from './screens/DoctorRegisterScreen';
import PatientLoginScreen from './screens/PatientLoginScreen';
import PatientRegisterScreen from './screens/PatientRegisterScreen';
import DoctorHomeScreen from './screens/DoctorHomeScreen';
import PatientHomeScreen from './screens/PatientHomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  // Simple authentication state simulation
  // Actual app should store auth tokens securely
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null); // 'doctor' or 'patient'
  const [loading, setLoading] = useState(false);

  // Functions to handle login/logout
  const handleLogin = (type) => {
    setUserType(type);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUserType(null);
    setIsLoggedIn(false);
  };

  if (loading) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isLoggedIn ? (
          // Authentication screens
          <>
            <Stack.Screen name="DoctorLogin">
              {props => <DoctorLoginScreen {...props} onLogin={() => handleLogin('doctor')} />}
            </Stack.Screen>
            <Stack.Screen name="DoctorRegister" component={DoctorRegisterScreen} />
            <Stack.Screen name="PatientLogin">
              {props => <PatientLoginScreen {...props} onLogin={() => handleLogin('patient')} />}
            </Stack.Screen>
            <Stack.Screen name="PatientRegister" component={PatientRegisterScreen} />
          </>
        ) : userType === 'doctor' ? (
          // Doctor logged in screens
          <>
            <Stack.Screen name="DoctorHome">
              {props => <DoctorHomeScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          </>
        ) : (
          // Patient logged in screens
          <>
            <Stack.Screen name="PatientHome">
              {props => <PatientHomeScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}