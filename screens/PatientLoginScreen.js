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
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import axios from "axios";
import BASE_URL from "./Config";  // Adjust path if Config is not in parent dir

export default function PatientLoginScreen({ navigation, onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalIcon, setModalIcon] = useState("");
  const [modalColor, setModalColor] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);  // Track for modal flow

  // Refs
  const passwordInputRef = useRef(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.8)).current;
  const nameInputAnim = useRef(new Animated.Value(1)).current;
  const passwordInputAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Initial entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(headerScaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Input focus animations
  const animateInputFocus = (anim, focused) => {
    Animated.spring(anim, {
      toValue: focused ? 1.02 : 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Button press animation
  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Shake animation for errors
  const triggerShake = () => {
    console.log("Shake triggered");
  };

  // Modal animations
  useEffect(() => {
    if (isModalVisible) {
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalScaleAnim, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isModalVisible]);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const handleLogin = async () => {
    if (name.trim() === "" || password === "") {
      triggerShake();
      setModalIcon("alert-circle-outline");
      setModalColor("#FF6347");
      setModalMessage("Please enter both name and password.");
      setIsSuccess(false);
      setModalVisible(true);
      return;
    }

    setLoading(true);
    animateButtonPress();

    try {
      console.log("Attempting login with name:", name.trim());  // DEBUG
      const response = await axios.post(`${BASE_URL}:8080/api/patient/login`, {
        name: name.trim(),
        password,
      });

      console.log("Login Response:", response.status, response.data);  // DEBUG

      if (response.status === 200 && response.data) {
        // Extract patientName from backend response (assumes it returns patient object with 'name')
        const patientNameFromResponse = response.data.name || name.trim();  // Fallback to input
        console.log("Extracted patientName:", patientNameFromResponse);  // DEBUG

        setModalIcon("check-circle-outline");
        setModalColor("#4CAF50");
        setModalMessage("Login successful!");
        setIsSuccess(true);
        setModalVisible(true);

        // REWRITTEN: Call onLogin callback (from App.js) to handle state + navigation
        // Optional brief delay to show success modal before transitioning
        setTimeout(() => {
          if (onLogin) {
            onLogin(patientNameFromResponse);
          }
        }, 1000);  // Adjust or remove; allows user to see "success" briefly
      } else {
        triggerShake();
        setModalIcon("alert-circle-outline");
        setModalColor("#FF6347");
        setModalMessage("Login failed. Please check your credentials.");
        setIsSuccess(false);
        setModalVisible(true);
      }
    } catch (error) {
      triggerShake();
      console.error("Login error:", error.response || error.message);  // DEBUG
      if (error.response && error.response.data) {
        const message =
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message || "Login failed";
        setModalIcon("alert-circle-outline");
        setModalColor("#FF6347");
        setModalMessage(message);
      } else {
        setModalIcon("alert-circle-outline");
        setModalColor("#FF6347");
        setModalMessage("Network error. Please try again later.");
      }
      setIsSuccess(false);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const onModalOkPress = () => {
    setModalVisible(false);
    setIsSuccess(false);  // Reset for next use
    // REWRITTEN: No direct navigation—handled by onLogin in handleLogin
  };

  return (
    <LinearGradient 
      colors={["#11998e", "#38ef7d"]} 
      style={styles.gradient}
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
          <Animated.View
            style={[
              styles.card,
              { 
                opacity: fadeAnim, 
                transform: [
                  { translateY: slideAnim },
                  { scale: headerScaleAnim },
                ] 
              },
            ]}
          >
            {/* Header Icon */}
            <Animated.View
              style={[
                styles.headerIconContainer,
                {
                  transform: [{ scale: headerScaleAnim }],
                },
              ]}
            >
              <Ionicons name="heart-outline" size={80} color="#11998e" />
            </Animated.View>

            <Text style={styles.title}>Patient Login</Text>
            <Text style={styles.subtitle}>Welcome back! Please sign in to continue.</Text>

            {/* Name Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  transform: [{ scale: nameInputAnim }],
                  borderColor: nameFocused ? "#11998e" : "#ddd",
                  backgroundColor: nameFocused ? "#f8fff9" : "#f9f9f9",
                },
              ]}
            >
              <Ionicons 
                name="person-circle-outline" 
                size={24} 
                color={nameFocused ? "#11998e" : "#666"} 
                style={styles.icon} 
              />
              <TextInput
                placeholder="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoCapitalize="words"
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus();
                }}
                onFocus={() => {
                  setNameFocused(true);
                  animateInputFocus(nameInputAnim, true);
                }}
                onBlur={() => {
                  setNameFocused(false);
                  animateInputFocus(nameInputAnim, false);
                }}
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  transform: [{ scale: passwordInputAnim }],
                  borderColor: passwordFocused ? "#11998e" : "#ddd",
                  backgroundColor: passwordFocused ? "#f8fff9" : "#f9f9f9",
                },
              ]}
            >
              <Ionicons 
                name="lock-closed-outline" 
                size={24} 
                color={passwordFocused ? "#11998e" : "#666"} 
                style={styles.icon} 
              />
              <TextInput
                ref={passwordInputRef}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => {
                  setPasswordFocused(true);
                  animateInputFocus(passwordInputAnim, true);
                }}
                onBlur={() => {
                  setPasswordFocused(false);
                  animateInputFocus(passwordInputAnim, false);
                }}
              />
            </Animated.View>

            {/* Login Button */}
            <Animated.View
              style={{
                transform: [{ scale: buttonScaleAnim }],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.loginBtn,
                  loading && { opacity: 0.7 },
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="ellipse" size={20} color="white" />
                    <Text style={styles.loginText}>Logging in...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.loginText}>Login</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Go to Register */}
            <TouchableOpacity
              onPress={() => navigation.navigate("PatientRegister")}
              style={styles.linkContainer}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.link}>
                Don’t have an account? <Text style={styles.boldLink}>Register</Text>
              </Text>
            </TouchableOpacity>

            {/* Go to Doctor Login */}
            <TouchableOpacity
              onPress={() => navigation.navigate("DoctorLogin")}
              style={styles.linkContainer}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.link, { color: "#333" }]}>
                Are you a Doctor? <Text style={styles.boldLink}>Login Here</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>

        {/* Success/Error Modal */}
        <Modal 
          isVisible={isModalVisible} 
          onBackdropPress={toggleModal}
          animationIn="zoomIn"
          animationOut="zoomOut"
          backdropOpacity={0.5}
          style={styles.modal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: modalScaleAnim }],
              },
            ]}
          >
            <MaterialCommunityIcons name={modalIcon} size={60} color={modalColor} />
            <Text style={[styles.modalText, { color: modalColor }]}>{modalMessage}</Text>
            <TouchableOpacity 
              onPress={onModalOkPress} 
              style={[
                styles.modalButton,
                { backgroundColor: modalColor }
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
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
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 30,
    padding: 40,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    alignItems: "center",
  },
  headerIconContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: "rgba(17, 153, 142, 0.1)",
    borderRadius: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#f9f9f9",
    width: "100%",
  },
  icon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    height: 55,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  loginBtn: {
    backgroundColor: "#11998e",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    shadowColor: "#11998e",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    justifyContent: "center",
  },
  buttonContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  loginText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkContainer: {
    marginTop: 20,
    paddingVertical: 10,
  },
  link: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  boldLink: {
    fontWeight: "700",
    color: "#11998e",
  },
  modal: {
    justifyContent: "center",
    alignItems: "center",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "white",
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    minWidth: 300,
  },
  modalText: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 20,
    textAlign: "center",
    lineHeight: 24,
  },
  modalButton: {
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
