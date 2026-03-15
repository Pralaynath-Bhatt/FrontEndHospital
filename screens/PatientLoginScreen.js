import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import axios from "axios";
import BASE_URL from "./Config";

const { width } = Dimensions.get("window");
const isWeb = width > 900;

export default function PatientLoginScreen({ navigation, onLogin }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalIcon, setModalIcon] = useState("");
  const [modalColor, setModalColor] = useState("");

  const handleLogin = async () => {
    if (!name || !password) {
      setModalIcon("alert-circle-outline");
      setModalColor("#EF4444");
      setModalMessage("Please enter name and password.");
      setModalVisible(true);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}/api/patient/login`, {
        name,
        password,
      });

      if (response.status === 200) {
        setModalIcon("check-circle-outline");
        setModalColor("#22C55E");
        setModalMessage("Login successful!");

        setTimeout(() => {
          if (onLogin) onLogin(name);
        }, 800);
      }
    } catch (error) {
      setModalIcon("alert-circle-outline");
      setModalColor("#EF4444");
      setModalMessage("Invalid credentials or network error.");
    }

    setModalVisible(true);
    setLoading(false);
  };

  /* ================= MOBILE ================= */

  if (!isWeb) {
    return (
      <LinearGradient
        colors={["#0F172A", "#1E3A8A", "#2563EB"]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.mobileContainer}
        >
          <Ionicons name="heart-outline" size={70} color="#fff" />

          <Text style={styles.mobileTitle}>Patient Login</Text>

          <View style={styles.mobileCard}>
            <TextInput
              placeholder="Full Name"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <Text style={styles.loginText}>
                {loading ? "Signing In..." : "Login"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("PatientRegister")}
              style={{ marginTop: 15 }}
            >
              <Text style={styles.link}>
                Don't have an account? Register
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
        <Ionicons name="heart-outline" size={70} color="#fff" />
        <Text style={styles.webTitle}>Patient Portal</Text>
        <Text style={styles.webSubtitle}>
          Access your health insights and reports securely.
        </Text>
      </View>

      <View style={styles.rightPanel}>
        <View style={styles.webCard}>

          <Text style={styles.webLoginTitle}>Sign In</Text>

          <TextInput
            placeholder="Full Name"
            style={styles.webInput}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.webInput}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.webLoginBtn} onPress={handleLogin}>
            <Text style={styles.webLoginText}>
              {loading ? "Signing In..." : "Login"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("PatientRegister")}
            style={{ marginTop: 20 }}
          >
            <Text style={{ textAlign: "center", color: "#2563EB" }}>
              Create new account
            </Text>
          </TouchableOpacity>

        </View>
      </View>

      <Modal isVisible={isModalVisible}>
        <View style={styles.modalBox}>
          <MaterialCommunityIcons
            name={modalIcon}
            size={60}
            color={modalColor}
          />
          <Text style={{ marginVertical: 20, color: modalColor }}>
            {modalMessage}
          </Text>
          <TouchableOpacity
            style={[styles.modalBtn, { backgroundColor: modalColor }]}
            onPress={() => setModalVisible(false)}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>

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
    borderColor: "#E5E7EB",
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

  loginText: {
    color: "#fff",
    fontWeight: "700",
  },

  link: {
    textAlign: "center",
    color: "#2563EB",
    fontWeight: "600",
  },

  leftContent: {
    position: "absolute",
    left: 120,
    top: "30%",
  },

  webTitle: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
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
  },

  modalBox: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
  },

  modalBtn: {
    padding: 12,
    borderRadius: 12,
  },

});
