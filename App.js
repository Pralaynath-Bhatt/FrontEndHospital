import React, { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  const handleLogin = (type, navigation) => {
    setUserType(type);
    setIsLoggedIn(true);

    // Reset navigation to home screen
    navigation.reset({
      index: 0,
      routes: [{ name: type === "doctor" ? "DoctorHomeScreen" : "PatientHomeScreen" }],
    });
  };

  const handleLogout = (navigation) => {
    setUserType(null);
    setIsLoggedIn(false);

    // Reset navigation to Welcome screen
    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="NewLogin" component={NewLoginScreen} />

            <Stack.Screen name="DoctorLogin">
              {(props) => (
                <DoctorLoginScreen
                  {...props}
                  onLogin={() => handleLogin("doctor", props.navigation)}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="DoctorRegister" component={DoctorRegisterScreen} />

            <Stack.Screen name="PatientLogin">
              {(props) => (
                <PatientLoginScreen
                  {...props}
                  onLogin={() => handleLogin("patient", props.navigation)}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="PatientRegister" component={PatientRegisterScreen} />
          </>
        ) : userType === "doctor" ? (
          <Stack.Screen name="DoctorHome">
            {(props) => (
              <DoctorHomeScreen {...props} onLogout={() => handleLogout(props.navigation)} />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="PatientHome">
            {(props) => (
              <PatientHomeScreen {...props} onLogout={() => handleLogout(props.navigation)} />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}