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
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import axios from "axios";

export default function PatientRegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setModalMessage("Please fill all fields.");
      setModalVisible(true);
      return;
    }
    if (!validateEmail(email)) {
      setModalMessage("Please enter a valid email address.");
      setModalVisible(true);
      return;
    }
    if (password !== confirmPassword) {
      setModalMessage("Passwords do not match.");
      setModalVisible(true);
      return;
    }

    setLoading(true);

    try {
      // Replace below URL with your real backend endpoint!!!
      const response = await axios.post(
        "http://localhost:8080/api/doctor/register",
        {
          name: name.trim(),
          email: email.trim(),
          password,
        }
      );

      if (response.status === 200) {
        setModalMessage("Registration successful! Please login.");
        setModalVisible(true);
      } else {
        setModalMessage("Registration failed. Please try again.");
        setModalVisible(true);
      }
    } catch (error) {
      console.log("Registration error:", error.response || error.message);
      if (error.response && error.response.data) {
        const message =
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message || "Registration failed";
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
    // If success message, navigate to login
    if (modalMessage === "Registration successful! Please login.") {
      navigation.navigate("DoctorLogin");
    }
  };

  return (
    <LinearGradient colors={["#3a7bd5", "#3a6073"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.title}>Doctor Registration</Text>

            {/* Name */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <TextInput
                placeholder="Full Name"
                style={styles.input}
                value={name}
                onChangeText={setName}
                editable={!loading}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <TextInput
                placeholder="Email"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
              <TextInput
                placeholder="Password"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
              <TextInput
                placeholder="Confirm Password"
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerText}>
                {loading ? "Registering..." : "Register"}
              </Text>
            </TouchableOpacity>

            {/* Back to login */}
            <TouchableOpacity
              onPress={() => navigation.navigate("DoctorLogin")}
              style={{ marginTop: 15 }}
              disabled={loading}
            >
              <Text style={styles.link}>Already have an account? Login</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>

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
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: "#f9f9f9",
  },
  input: {
    flex: 1,
    height: 50,
    color: "#333",
  },
  registerBtn: {
    backgroundColor: "#3a7bd5",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#3a7bd5",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  registerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    textAlign: "center",
    color: "#666",
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
    backgroundColor: "#3a7bd5",
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