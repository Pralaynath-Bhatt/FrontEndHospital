import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import BASE_URL from "./Config";
import { AuthStorage } from "./Authstorage";

const { width } = Dimensions.get("window");
const isWeb = width > 900;

export default function DoctorLoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}:8080/api/doctor/login`, {
        name: email.trim(),
        password: password.trim(),
      });

      if (response.status === 200 && response.data.success) {
        const { token, name } = response.data.data;
        
        // Save token and doctor data to AsyncStorage
        const saved = await AuthStorage.saveAuth(token, { name });
        
        if (saved) {
          console.log("✓ Token saved successfully");
          console.log(`Doctor: ${name}`);
          console.log(`Token: ${token.substring(0, 30)}...`);
          
          // Navigate to home screen
          navigation.replace("DoctorHomeScreen", {
            doctor: { name, token },
          });
        } else {
          Alert.alert("Error", "Failed to save login session");
        }
      } else {
        Alert.alert("Login Failed", "Invalid response from server");
      }

    } catch (error) {
      console.log("LOGIN ERROR:", error?.response?.data || error.message);
      
      let errorMessage = "Invalid credentials or server not reachable";
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || error.response.data?.data || errorMessage;
      } else if (error.request) {
        // Request made but no response
        errorMessage = "Server not reachable. Please check your connection.";
      }
      
      Alert.alert("Login Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= MOBILE ================= */

  if (!isWeb) {
    return (
      <LinearGradient colors={["#1E3A8A", "#2563EB"]} style={{ flex: 1 }}>
        <View style={styles.mobileContainer}>
          <Ionicons name="medkit-outline" size={70} color="#fff" />
          <Text style={styles.mobileTitle}>Doctor Login</Text>

          <View style={styles.mobileCard}>
            <TextInput
              placeholder="User Name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              autoCapitalize="none"
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />

            <TouchableOpacity 
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* REGISTER LINK */}
            <TouchableOpacity
              onPress={() => navigation.navigate("DoctorRegister")}
              style={{ marginTop: 18 }}
              disabled={isLoading}
            >
              <Text style={{ textAlign: "center", color: "#2563EB", fontWeight: "600" }}>
                New Doctor? Register Here
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  /* ================= WEB ================= */

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#0F172A", "#1E3A8A", "#2563EB"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.leftContent}>
        <Ionicons name="medkit-outline" size={70} color="#fff" />
        <Text style={styles.webTitle}>MediChat AI</Text>

        <Text style={styles.webSubtitle}>
          Clinical decision intelligence platform for modern healthcare systems.
        </Text>
      </View>

      <View style={styles.rightPanel}>
        <View style={styles.webCard}>
          <Text style={styles.webLoginTitle}>Doctor Login</Text>

          <TextInput
            placeholder="User Name"
            style={styles.webInput}
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.webInput}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />

          <TouchableOpacity 
            style={[styles.webLoginBtn, isLoading && styles.loginBtnDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.webLoginText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* REGISTER LINK */}
          <TouchableOpacity
            onPress={() => navigation.navigate("DoctorRegister")}
            style={{ marginTop: 20 }}
            disabled={isLoading}
          >
            <Text style={{ textAlign: "center", color: "#2563EB", fontWeight: "600" }}>
              New Doctor? Register Here
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  mobileTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginVertical: 25,
  },

  mobileCard: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 25,
    borderRadius: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 15,
  },

  loginBtn: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  loginBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },

  loginText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  leftContent: {
    position: "absolute",
    left: 120,
    top: "25%",
    maxWidth: 500,
    pointerEvents: "none",
  },

  webTitle: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "900",
    marginTop: 20,
  },

  webSubtitle: {
    color: "#CBD5F5",
    fontSize: 17,
    marginTop: 15,
  },

  rightPanel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "40%",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 60,
    borderBottomLeftRadius: 60,
  },

  webCard: {
    width: 380,
  },

  webLoginTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 30,
  },

  webInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },

  webLoginBtn: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },

  webLoginText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});