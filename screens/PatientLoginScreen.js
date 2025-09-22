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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import axios from "axios";
import BASE_URL from "./Config";

export default function PatientLoginScreen({ navigation, onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

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

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const handleLogin = async () => {
    if (name.trim() === "" || password === "") {
      setModalMessage("Please enter both name and password.");
      setModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      // Replace with your actual backend API endpoint
      const response = await axios.post(`${BASE_URL}/api/patient/login`, {
        name: name.trim(),
        password,
      });

      if (response.status === 200 && response.data) {
        // Handle successful login here (e.g., save token, call onLogin, navigate)
        setModalMessage("Login successful!");
        setModalVisible(true);
        // You can call onLogin() here if needed
      } else {
        setModalMessage("Login failed. Please check your credentials.");
        setModalVisible(true);
      }
    } catch (error) {
      console.log("Login error:", error.response || error.message);
      if (error.response && error.response.data) {
        const message =
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message || "Login failed";
        setModalMessage(message);
      } else {
        setModalMessage("Network error. Please try again later.");
      }
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const onModalOkPress = () => {
    setModalVisible(false);
    if (modalMessage === "Login successful!") {
      if (onLogin) onLogin();
      navigation.replace("PatientHome"); // or your app's main patient screen
    }
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

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-circle-outline" size={22} color="#666" />
            <TextInput
              placeholder="Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoCapitalize="words"
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color="#666" />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginText}>
              {loading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          {/* Go to Register */}
          <TouchableOpacity
            onPress={() => navigation.navigate("PatientRegister")}
            style={{ marginTop: 15 }}
            disabled={loading}
          >
            <Text style={styles.link}>Don’t have an account? Register</Text>
          </TouchableOpacity>
          <TouchableOpacity
              onPress={() => navigation.navigate('DoctorLogin')}
              style={{ marginTop: 10 }}>
              <Text style={[styles.link, { color: '#3a7bd5' }]}>
                Are you a Doctor? <Text style={styles.boldLink}>Login Here</Text>
              </Text>
            </TouchableOpacity>
        </Animated.View>

        <Modal isVisible={isModalVisible} onBackdropPress={toggleModal}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={50}
              color="#FF6347"
            />
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity onPress={onModalOkPress} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Modal>
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
  modalContent: {
    backgroundColor: "white",
    padding: 22,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  modalText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: "#11998e",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});