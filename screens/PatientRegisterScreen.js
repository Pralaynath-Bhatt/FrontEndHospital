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
import BASE_URL from "./Config";

export default function PatientRegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalIcon, setModalIcon] = useState("");
  const [modalColor, setModalColor] = useState("");

  // Refs for keyboard navigation
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.8)).current;
  const nameInputAnim = useRef(new Animated.Value(1)).current;
  const emailInputAnim = useRef(new Animated.Value(1)).current;
  const passwordInputAnim = useRef(new Animated.Value(1)).current;
  const confirmPasswordInputAnim = useRef(new Animated.Value(1)).current;
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
  // Optional: Implement shake animation on inputs or just a placeholder
  // For now, you can leave it empty or add a console log
  // Or animate nameInputAnim and passwordInputAnim for shake effect if you want
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

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      triggerShake();
      setModalIcon("alert-circle-outline");
      setModalColor("#FF6347");
      setModalMessage("Please fill all fields.");
      setModalVisible(true);
      return;
    }
    if (!validateEmail(email)) {
      triggerShake();
      setModalIcon("alert-circle-outline");
      setModalColor("#FF6347");
      setModalMessage("Please enter a valid email address.");
      setModalVisible(true);
      return;
    }
    if (password !== confirmPassword) {
      triggerShake();
      setModalIcon("alert-circle-outline");
      setModalColor("#FF6347");
      setModalMessage("Passwords do not match.");
      setModalVisible(true);
      return;
    }

    setLoading(true);
    animateButtonPress();

    try {
      // Replace below URL with your real backend endpoint!!!
      const response = await axios.post(
        `${BASE_URL}:8080/api/patient/register`,
        {
          name: name.trim(),
          email: email.trim(),
          password,
        }
      );

      if (response.status === 200) {
        setModalIcon("check-circle-outline");
        setModalColor("#4CAF50");
        setModalMessage("Registration successful! Please login.");
        setModalVisible(true);
      } else {
        triggerShake();
        setModalIcon("alert-circle-outline");
        setModalColor("#FF6347");
        setModalMessage("Registration failed. Please try again.");
        setModalVisible(true);
      }
    } catch (error) {
      triggerShake();
      console.log("Registration error:", error.response || error.message);
      if (error.response && error.response.data) {
        const message =
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message || "Registration failed";
        setModalIcon("alert-circle-outline");
        setModalColor("#FF6347");
        setModalMessage(message);
      } else {
        setModalIcon("alert-circle-outline");
        setModalColor("#FF6347");
        setModalMessage("Network error. Please try again later.");
      }
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const onModalOkPress = () => {
    setModalVisible(false);
    if (modalMessage === "Registration successful! Please login.") {
      navigation.navigate("PatientLogin");
    }
  };

  return (
    <LinearGradient 
      colors={["#ff512f", "#dd2476"]} 
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
              <Ionicons name="person-add-outline" size={80} color="#dd2476" />
            </Animated.View>

            <Text style={styles.title}>Patient Registration</Text>
            <Text style={styles.subtitle}>Create your account to get started.</Text>

            {/* Name Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  transform: [{ scale: nameInputAnim }],
                  borderColor: nameFocused ? "#dd2476" : "#ddd",
                  backgroundColor: nameFocused ? "#fff8f9" : "#f9f9f9",
                },
              ]}
            >
              <Ionicons 
                name="person-outline" 
                size={24} 
                color={nameFocused ? "#dd2476" : "#666"} 
                style={styles.icon} 
              />
              <TextInput
                placeholder="Full Name"
                style={styles.input}
                value={name}
                onChangeText={setName}
                editable={!loading}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => {
                  emailInputRef.current?.focus();
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

            {/* Email Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  transform: [{ scale: emailInputAnim }],
                  borderColor: emailFocused ? "#dd2476" : "#ddd",
                  backgroundColor: emailFocused ? "#fff8f9" : "#f9f9f9",
                },
              ]}
            >
              <Ionicons 
                name="mail-outline" 
                size={24} 
                color={emailFocused ? "#dd2476" : "#666"} 
                style={styles.icon} 
              />
              <TextInput
                ref={emailInputRef}
                placeholder="Email"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus();
                }}
                onFocus={() => {
                  setEmailFocused(true);
                  animateInputFocus(emailInputAnim, true);
                }}
                onBlur={() => {
                  setEmailFocused(false);
                  animateInputFocus(emailInputAnim, false);
                }}
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  transform: [{ scale: passwordInputAnim }],
                  borderColor: passwordFocused ? "#dd2476" : "#ddd",
                  backgroundColor: passwordFocused ? "#fff8f9" : "#f9f9f9",
                },
              ]}
            >
              <Ionicons 
                name="lock-closed-outline" 
                size={24} 
                color={passwordFocused ? "#dd2476" : "#666"} 
                style={styles.icon} 
              />
              <TextInput
                ref={passwordInputRef}
                placeholder="Password"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => {
                  confirmPasswordInputRef.current?.focus();
                }}
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

            {/* Confirm Password Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  transform: [{ scale: confirmPasswordInputAnim }],
                  borderColor: confirmPasswordFocused ? "#dd2476" : "#ddd",
                  backgroundColor: confirmPasswordFocused ? "#fff8f9" : "#f9f9f9",
                },
              ]}
            >
              <Ionicons 
                name="lock-closed-outline" 
                size={24} 
                color={confirmPasswordFocused ? "#dd2476" : "#666"} 
                style={styles.icon} 
              />
              <TextInput
                ref={confirmPasswordInputRef}
                placeholder="Confirm Password"
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                onFocus={() => {
                  setConfirmPasswordFocused(true);
                  animateInputFocus(confirmPasswordInputAnim, true);
                }}
                onBlur={() => {
                  setConfirmPasswordFocused(false);
                  animateInputFocus(confirmPasswordInputAnim, false);
                }}
              />
            </Animated.View>

            {/* Register Button */}
            <Animated.View
              style={{
                transform: [{ scale: buttonScaleAnim }],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.registerBtn,
                  loading && { opacity: 0.7 },
                ]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    
                      <Ionicons name="ellipse" size={20} color="white" />
                  
                    <Text style={styles.registerText}>Registering...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.registerText}>Register</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Back to login */}
            <TouchableOpacity
              onPress={() => navigation.navigate("PatientLogin")}
              style={styles.linkContainer}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.link}>
                Already have an account? <Text style={styles.boldLink}>Login</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>

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
    backgroundColor: "rgba(221, 36, 118, 0.1)",
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
  registerBtn: {
    backgroundColor: "#dd2476",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    shadowColor: "#dd2476",
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
  registerText: {
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
    color: "#dd2476",
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