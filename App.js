import React, { useState, useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Screens
import WelcomeScreen from "./screens/WelcomeScreen";
import NewLoginScreen from "./screens/NewLoginScreen";
import DoctorLoginScreen from "./screens/DoctorLoginScreen";
import DoctorRegisterScreen from "./screens/DoctorRegisterScreen";
import PatientLoginScreen from "./screens/PatientLoginScreen";
import PatientRegisterScreen from "./screens/PatientRegisterScreen";
import DoctorHomeScreen from "./screens/DoctorHomeScreen";
import PatientHomeScreen from "./screens/PatientHomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null); // 'doctor' or 'patient'
  const [userData, setUserData] = useState(null); // user info (e.g., name)
  const [loading, setLoading] = useState(false);

  const navigationRef = useRef();

  const handleLogin = (type, userInfo = null) => {
    setUserType(type);
    setUserData(userInfo);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUserType(null);
    setUserData(null);
    setIsLoggedIn(false);
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  };

  useEffect(() => {
    if (isLoggedIn && userType) {
      let homeScreenName, params = {};
      if (userType === "doctor") {
        homeScreenName = "DoctorHomeScreen";
        // You can add doctor-specific params if needed
      } else if (userType === "patient") {
        homeScreenName = "PatientHomeScreen";
        params = { patientName: userData };
      } else {
        console.warn("Invalid userType:", userType);
        return;
      }

      // Small delay ensures state updates before navigation
      setTimeout(() => {
        if (navigationRef.current?.reset) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: homeScreenName, params }],
          });
        }
      }, 100);
    }
  }, [isLoggedIn, userType]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        {/* Auth Screens */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="NewLogin" component={NewLoginScreen} />
        <Stack.Screen name="DoctorRegister" component={DoctorRegisterScreen} />
        <Stack.Screen name="PatientRegister" component={PatientRegisterScreen} />

        <Stack.Screen name="DoctorLogin">
          {(props) => (
            <DoctorLoginScreen
              {...props}
              onLogin={(doctorInfo) => handleLogin("doctor", doctorInfo)}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PatientLogin">
          {(props) => (
            <PatientLoginScreen
              {...props}
              onLogin={(patientName) => handleLogin("patient", patientName)}
            />
          )}
        </Stack.Screen>

        {/* Home Screens */}
        <Stack.Screen name="DoctorHomeScreen">
          {(props) => (
            <DoctorHomeScreen
              {...props}
              onLogout={handleLogout}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PatientHomeScreen">
          {(props) => (
            <PatientHomeScreen
              {...props}
              onLogout={handleLogout}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
