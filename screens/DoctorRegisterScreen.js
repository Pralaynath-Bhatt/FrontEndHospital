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
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import axios from "axios";
import BASE_URL from "./Config";

const { width } = Dimensions.get("window");
const isWeb = width > 900;

export default function DoctorRegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalIcon, setModalIcon] = useState("");
  const [modalColor, setModalColor] = useState("");

  // Animations (mobile only)
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!isWeb) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8,   useNativeDriver: true }),
      ]).start();
    }
  }, []);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.toLowerCase());

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      showModal("alert-circle-outline", "#EF4444", "Please fill in all fields.");
      return;
    }
    if (!validateEmail(email)) {
      showModal("alert-circle-outline", "#EF4444", "Please enter a valid email address.");
      return;
    }
    if (password !== confirmPassword) {
      showModal("alert-circle-outline", "#EF4444", "Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      showModal("alert-circle-outline", "#EF4444", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/doctor/register`, {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (response.status === 200) {
        showModal("check-circle-outline", "#22C55E", "Registration successful! Please login.");
      } else {
        showModal("alert-circle-outline", "#EF4444", "Registration failed. Please try again.");
      }
    } catch (error) {
      showModal(
        "alert-circle-outline",
        "#EF4444",
        error?.response?.data?.message || "Network error. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const showModal = (icon, color, message) => {
    setModalIcon(icon);
    setModalColor(color);
    setModalMessage(message);
    setModalVisible(true);
  };

  const onModalOkPress = () => {
    setModalVisible(false);
    if (modalMessage === "Registration successful! Please login.") {
      navigation.navigate("DoctorLogin");
    }
  };

  /* ─── shared input renderer ─────────────────────────────────── */
  const renderInput = (placeholder, value, setter, opts = {}) => {
    const isPassword = opts.secure;
    const showToggle = isPassword && (
      placeholder === "Password" ? showPassword : showConfirmPassword
    );
    const toggleFn = placeholder === "Password"
      ? () => setShowPassword(v => !v)
      : () => setShowConfirmPassword(v => !v);

    return (
      <View style={isWeb ? styles.webInputRow : styles.mobileInputRow}>
        <Ionicons
          name={opts.icon || "person-outline"}
          size={18}
          color="#94A3B8"
          style={{ marginRight: 10 }}
        />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={setter}
          secureTextEntry={isPassword && !showToggle}
          keyboardType={opts.keyboardType}
          autoCapitalize="none"
          style={isWeb ? styles.webInput : styles.mobileInput}
          editable={!loading}
        />
        {isPassword && (
          <TouchableOpacity onPress={toggleFn}>
            <Ionicons
              name={showToggle ? "eye-outline" : "eye-off-outline"}
              size={18}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* ─── WEB layout ─────────────────────────────────────────────── */
  if (isWeb) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={["#0F172A", "#1E3A8A", "#2563EB"]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Left branding panel */}
        <View style={styles.leftContent} pointerEvents="none">
          <Ionicons name="medkit-outline" size={70} color="#fff" />
          <Text style={styles.webTitle}>MediChat AI</Text>
          <Text style={styles.webSubtitle}>
            Clinical decision intelligence platform for modern healthcare systems.
          </Text>
        </View>

        {/* Right white panel */}
        <View style={styles.rightPanel}>
          <ScrollView
            contentContainerStyle={styles.rightScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.webCard}>
              <Text style={styles.webLoginTitle}>Create Account</Text>
              <Text style={styles.webCardSubtitle}>
                Register as a doctor to get started
              </Text>

              {renderInput("Full Name",         name,            setName,            { icon: "person-outline" })}
              {renderInput("Email",             email,           setEmail,           { icon: "mail-outline", keyboardType: "email-address" })}
              {renderInput("Password",          password,        setPassword,        { icon: "lock-closed-outline", secure: true })}
              {renderInput("Confirm Password",  confirmPassword, setConfirmPassword, { icon: "lock-closed-outline", secure: true })}

              <TouchableOpacity
                style={[styles.webLoginBtn, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.webLoginText}>Create Account</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate("DoctorLogin")}
                style={{ marginTop: 20 }}
                disabled={loading}
              >
                <Text style={styles.linkText}>
                  Already have an account?{" "}
                  <Text style={styles.linkBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Modal */}
        <Modal isVisible={isModalVisible} onBackdropPress={onModalOkPress}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name={modalIcon} size={60} color={modalColor} />
            <Text style={[styles.modalText, { color: modalColor }]}>{modalMessage}</Text>
            <TouchableOpacity
              onPress={onModalOkPress}
              style={[styles.modalButton, { backgroundColor: modalColor }]}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    );
  }

  /* ─── MOBILE layout ──────────────────────────────────────────── */
  return (
    <LinearGradient colors={["#1E3A8A", "#2563EB"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.mobileScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {/* Top icon + title */}
              <View style={styles.mobileHeader}>
                <Ionicons name="person-add-outline" size={56} color="#fff" />
                <Text style={styles.mobileTitle}>Create Account</Text>
                <Text style={styles.mobileSubtitle}>Register to access MediChat AI</Text>
              </View>

              {/* Card */}
              <View style={styles.mobileCard}>
                {renderInput("Full Name",         name,            setName,            { icon: "person-outline" })}
                {renderInput("Email",             email,           setEmail,           { icon: "mail-outline", keyboardType: "email-address" })}
                {renderInput("Password",          password,        setPassword,        { icon: "lock-closed-outline", secure: true })}
                {renderInput("Confirm Password",  confirmPassword, setConfirmPassword, { icon: "lock-closed-outline", secure: true })}

                <TouchableOpacity
                  style={[styles.mobileLoginBtn, loading && styles.btnDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.mobileLoginText}>Register</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate("DoctorLogin")}
                  style={{ marginTop: 18 }}
                  disabled={loading}
                >
                  <Text style={styles.linkText}>
                    Already have an account?{" "}
                    <Text style={styles.linkBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Modal */}
      <Modal isVisible={isModalVisible} onBackdropPress={onModalOkPress}>
        <View style={styles.modalContent}>
          <MaterialCommunityIcons name={modalIcon} size={60} color={modalColor} />
          <Text style={[styles.modalText, { color: modalColor }]}>{modalMessage}</Text>
          <TouchableOpacity
            onPress={onModalOkPress}
            style={[styles.modalButton, { backgroundColor: modalColor }]}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({

  /* ── Web ── */
  leftContent: {
    position: "absolute",
    left: 120,
    top: "25%",
    maxWidth: 500,
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
    borderTopLeftRadius: 60,
    borderBottomLeftRadius: 60,
  },
  rightScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  webCard: {
    width: 380,
  },
  webLoginTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  webCardSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 28,
  },
  webInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
  },
  webInput: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: "#0F172A",
    outlineStyle: "none",
  },
  webLoginBtn: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  webLoginText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  /* ── Mobile ── */
  mobileScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  mobileHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  mobileTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 14,
  },
  mobileSubtitle: {
    color: "#BFDBFE",
    fontSize: 14,
    marginTop: 4,
  },
  mobileCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
  },
  mobileInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "#F8FAFC",
  },
  mobileInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: "#0F172A",
  },
  mobileLoginBtn: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  mobileLoginText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  /* ── Shared ── */
  btnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },
  linkText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
  },
  linkBold: {
    color: "#2563EB",
    fontWeight: "700",
  },

  /* ── Modal ── */
  modalContent: {
    backgroundColor: "white",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    marginVertical: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  modalButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
});