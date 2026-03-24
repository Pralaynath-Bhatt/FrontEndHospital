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

const GENDERS = ["Male", "Female"];

export default function PatientRegisterScreen({ navigation }) {
  const [name, setName]                     = useState("");
  const [email, setEmail]                   = useState("");
  const [age, setAge]                       = useState("");
  const [gender, setGender]                 = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);

  const [isModalVisible, setModalVisible]   = useState(false);
  const [modalMessage, setModalMessage]     = useState("");
  const [modalIcon, setModalIcon]           = useState("");
  const [modalColor, setModalColor]         = useState("");

  // Mobile entrance animation
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

  const showModal = (icon, color, message) => {
    setModalIcon(icon);
    setModalColor(color);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !age.trim() || !gender || !password || !confirmPassword) {
      showModal("alert-circle-outline", "#EF4444", "Please fill in all fields.");
      return;
    }
    if (!validateEmail(email)) {
      showModal("alert-circle-outline", "#EF4444", "Please enter a valid email address.");
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      showModal("alert-circle-outline", "#EF4444", "Please enter a valid age (1–120).");
      return;
    }
    if (password.length < 6) {
      showModal("alert-circle-outline", "#EF4444", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      showModal("alert-circle-outline", "#EF4444", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/patient/register`, {
        name: name.trim(),
        email: email.trim(),
        age: ageNum,
        gender,
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

  const onModalOkPress = () => {
    setModalVisible(false);
    if (modalMessage === "Registration successful! Please login.") {
      navigation.navigate("PatientLogin");
    }
  };

  /* ─── Shared input renderer ────────────────────────────────── */
  const renderInput = (placeholder, value, setter, opts = {}) => {
    const isPassword = opts.secure;
    const isShowingPw = placeholder === "Password" ? showPassword : showConfirm;
    const togglePw    = placeholder === "Password"
      ? () => setShowPassword(v => !v)
      : () => setShowConfirm(v => !v);

    return (
      <View style={isWeb ? styles.webInputRow : styles.mobileInputRow}>
        <Ionicons name={opts.icon || "person-outline"} size={18} color="#94A3B8" style={{ marginRight: 10 }} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={setter}
          secureTextEntry={isPassword && !isShowingPw}
          keyboardType={opts.keyboardType || "default"}
          autoCapitalize="none"
          style={isWeb ? styles.webInput : styles.mobileInput}
          editable={!loading}
          maxLength={opts.maxLength}
        />
        {isPassword && (
          <TouchableOpacity onPress={togglePw}>
            <Ionicons name={isShowingPw ? "eye-outline" : "eye-off-outline"} size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* ─── Gender pill selector ─────────────────────────────────── */
  const GenderSelector = () => (
    <View style={isWeb ? styles.webGenderWrapper : styles.mobileGenderWrapper}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Ionicons name="male-female-outline" size={15} color="#94A3B8" style={{ marginRight: 6 }} />
        <Text style={isWeb ? styles.webGenderLabel : styles.mobileGenderLabel}>Gender</Text>
      </View>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => {
          const selected = gender === g;
          return (
            <TouchableOpacity
              key={g}
              onPress={() => setGender(g)}
              disabled={loading}
              style={[
                styles.genderPill,
                selected && styles.genderPillSelected,
              ]}
            >
              <Text style={[styles.genderPillText, selected && styles.genderPillTextSelected]}>
                {g}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  /* ─── Shared modal ─────────────────────────────────────────── */
  const AppModal = () => (
    <Modal isVisible={isModalVisible} onBackdropPress={onModalOkPress}
      animationIn="zoomIn" animationOut="zoomOut" backdropOpacity={0.45}>
      <View style={styles.modalContent}>
        <MaterialCommunityIcons name={modalIcon} size={60} color={modalColor} />
        <Text style={[styles.modalText, { color: modalColor }]}>{modalMessage}</Text>
        <TouchableOpacity onPress={onModalOkPress} style={[styles.modalButton, { backgroundColor: modalColor }]}>
          <Text style={styles.modalButtonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  /* ─── WEB layout ────────────────────────────────────────────── */
  if (isWeb) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={["#0F172A", "#1E3A8A", "#2563EB"]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Left branding — matches PatientLogin exactly */}
        <View style={styles.leftContent} pointerEvents="none">
          <Ionicons name="heart-outline" size={70} color="#fff" />
          <Text style={styles.webTitle}>Patient Portal</Text>
          <Text style={styles.webSubtitle}>
            Access your health insights and reports securely.
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
              <Text style={styles.webCardSubtitle}>Register to access your patient portal</Text>

              {renderInput("Full Name",        name,            setName,            { icon: "person-outline" })}
              {renderInput("Email",            email,           setEmail,           { icon: "mail-outline",         keyboardType: "email-address" })}

              {/* Age + Gender side by side on web */}
              <View style={styles.webRowFields}>
                {renderInput("Age", age, setAge, { icon: "calendar-outline", keyboardType: "number-pad", maxLength: 3 })}
                <View style={{ width: 14 }} />
                <GenderSelector />
              </View>

              {renderInput("Password",         password,        setPassword,        { icon: "lock-closed-outline",  secure: true })}
              {renderInput("Confirm Password", confirmPassword, setConfirmPassword, { icon: "lock-closed-outline",  secure: true })}

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

              <TouchableOpacity onPress={() => navigation.navigate("PatientLogin")} style={{ marginTop: 20 }} disabled={loading}>
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        <AppModal />
      </View>
    );
  }

  /* ─── MOBILE layout ─────────────────────────────────────────── */
  return (
    <LinearGradient colors={["#0F172A", "#1E3A8A", "#2563EB"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.mobileScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* Header — matches PatientLogin mobile */}
              <View style={styles.mobileHeader}>
                <Ionicons name="heart-outline" size={56} color="#fff" />
                <Text style={styles.mobileTitle}>Create Account</Text>
                <Text style={styles.mobileSubtitle}>Register for Patient Portal</Text>
              </View>

              {/* Card */}
              <View style={styles.mobileCard}>
                {renderInput("Full Name",        name,            setName,            { icon: "person-outline" })}
                {renderInput("Email",            email,           setEmail,           { icon: "mail-outline",        keyboardType: "email-address" })}

                {/* Age + Gender stacked on mobile */}
                {renderInput("Age", age, setAge, { icon: "calendar-outline", keyboardType: "number-pad", maxLength: 3 })}
                <GenderSelector />

                {renderInput("Password",         password,        setPassword,        { icon: "lock-closed-outline", secure: true })}
                {renderInput("Confirm Password", confirmPassword, setConfirmPassword, { icon: "lock-closed-outline", secure: true })}

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

                <TouchableOpacity onPress={() => navigation.navigate("PatientLogin")} style={{ marginTop: 18 }} disabled={loading}>
                  <Text style={styles.linkText}>
                    Already have an account? <Text style={styles.linkBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <AppModal />
    </LinearGradient>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({

  /* ── Web layout ── */
  leftContent: {
    position: "absolute",
    left: 120,
    top: "30%",
    maxWidth: 500,
  },
  webTitle: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 20,
  },
  webSubtitle: {
    color: "#CBD5F5",
    marginTop: 10,
    fontSize: 16,
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
    marginBottom: 24,
  },
  webRowFields: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  webInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    minHeight: 50,
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

  /* Gender — web */
  webGenderWrapper: {
    flex: 1,
    marginBottom: 16,
  },
  webGenderLabel: {
    fontSize: 13,
    color: "#94A3B8",
  },

  /* ── Mobile layout ── */
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

  /* Gender — mobile */
  mobileGenderWrapper: {
    marginBottom: 14,
  },
  mobileGenderLabel: {
    fontSize: 13,
    color: "#94A3B8",
  },

  /* Gender pills — shared */
  genderRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  genderPillSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  genderPillTextSelected: {
    color: "#fff",
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