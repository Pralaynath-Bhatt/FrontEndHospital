import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function PatientLoginScreen({ navigation, onLogin }) {
  const [patientId, setPatientId] = useState("");

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (patientId.trim() === "") {
      alert("Enter Patient ID");
      return;
    }
    // TODO: validate patient via backend
    onLogin();
  };

  return (
    <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>Patient Login</Text>

          {/* Patient ID Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-circle-outline" size={22} color="#666" />
            <TextInput
              placeholder="Patient ID"
              value={patientId}
              onChangeText={setPatientId}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
          

          {/* Login Button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>

          {/* Go to Register */}
          <TouchableOpacity
            onPress={() => navigation.navigate("DoctorRegister")}
            style={{ marginTop: 15 }}
          >
            <Text style={styles.link}>Don’t have an account? Register</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: "#f9f9f9",
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  loginBtn: {
    backgroundColor: "#11998e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  loginText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  link: {
    color: "#11998e",
    textAlign: "center",
    fontSize: 14,
  },
});
