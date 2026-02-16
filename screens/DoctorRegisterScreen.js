// Responsive DoctorRegisterScreen for laptop/tablet widths
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
  useWindowDimensions,
  ScrollView,
} from "react-native";
import BASE_URL from "./Config";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import axios from "axios";

export default function DoctorRegisterScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768; // tablets / laptops

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

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.spring(headerScaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setModalIcon("alert-circle-outline");
      setModalColor("#FF6347");
      setModalMessage("Please fill all fields.");
      setModalVisible(true);
      return;
    }
    if (!validateEmail(email)) {
      setModalIcon("alert-circle-outline");
      setModalColor("#FF6347");
      setModalMessage("Please enter a valid email address.");
      setModalVisible(true);
      return;
    }
    if (password !== confirmPassword) {
      setModalIcon("alert-circle-outline");
      setModalColor("#FF6347");
      setModalMessage("Passwords do not match.");
      setModalVisible(true);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}:8080/api/doctor/register`, {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (response.status === 200) {
        setModalIcon("check-circle-outline");
        setModalColor("#4CAF50");
        setModalMessage("Registration successful! Please login.");
      } else {
        setModalIcon("alert-circle-outline");
        setModalColor("#FF6347");
        setModalMessage("Registration failed. Please try again.");
      }
    } catch (error) {
      setModalIcon("alert-circle-outline");
      setModalColor("#FF6347");
      setModalMessage(error?.response?.data?.message || "Network error. Please try again later.");
    } finally {
      setLoading(false);
      setModalVisible(true);
    }
  };

  const onModalOkPress = () => {
    setModalVisible(false);
    if (modalMessage === "Registration successful! Please login.") {
      navigation.navigate("DoctorLogin");
    }
  };

  return (
    <LinearGradient colors={["#3a7bd5", "#3a6073"]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <Animated.View
              style={[
                styles.card,
                isLargeScreen && styles.cardLarge,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: headerScaleAnim }] },
              ]}
            >
              <Ionicons name="person-add-outline" size={isLargeScreen ? 90 : 70} color="#3a7bd5" />
              <Text style={styles.title}>Doctor Registration</Text>
              <Text style={styles.subtitle}>Create your account to get started.</Text>

              <Input icon="person-outline" placeholder="Full Name" value={name} setValue={setName} />
              <Input icon="mail-outline" placeholder="Email" value={email} setValue={setEmail} keyboardType="email-address" />
              <Input icon="lock-closed-outline" placeholder="Password" value={password} setValue={setPassword} secure />
              <Input icon="lock-closed-outline" placeholder="Confirm Password" value={confirmPassword} setValue={setConfirmPassword} secure />

              <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
                <Text style={styles.registerText}>{loading ? "Registering..." : "Register"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("DoctorLogin")} style={{ marginTop: 20 }}>
                <Text style={styles.link}>Already have an account? <Text style={styles.boldLink}>Login</Text></Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>

        <Modal isVisible={isModalVisible} onBackdropPress={() => setModalVisible(false)}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: modalScaleAnim }] }]}>
            <MaterialCommunityIcons name={modalIcon} size={60} color={modalColor} />
            <Text style={[styles.modalText, { color: modalColor }]}>{modalMessage}</Text>
            <TouchableOpacity onPress={onModalOkPress} style={[styles.modalButton, { backgroundColor: modalColor }]}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const Input = ({ icon, placeholder, value, setValue, secure, keyboardType }) => (
  <View style={styles.inputContainer}>
    <Ionicons name={icon} size={22} color="#666" style={{ marginRight: 10 }} />
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={setValue}
      secureTextEntry={secure}
      keyboardType={keyboardType}
      style={styles.input}
    />
  </View>
);

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },

  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    padding: 28,
    elevation: 10,
  },
  cardLarge: {
    maxWidth: 520,
    padding: 40,
  },

  title: { fontSize: 30, fontWeight: "800", textAlign: "center", marginTop: 10 },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 25 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "#f9f9f9",
  },
  input: { flex: 1, height: 48, fontSize: 16 },

  registerBtn: {
    backgroundColor: "#3a7bd5",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  registerText: { color: "white", textAlign: "center", fontWeight: "700", fontSize: 18 },

  link: { textAlign: "center", color: "#666" },
  boldLink: { color: "#3a7bd5", fontWeight: "700" },

  modalContent: { backgroundColor: "white", padding: 25, borderRadius: 20, alignItems: "center" },
  modalText: { fontSize: 16, marginVertical: 15, textAlign: "center" },
  modalButton: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10 },
  modalButtonText: { color: "white", fontWeight: "700" },
});