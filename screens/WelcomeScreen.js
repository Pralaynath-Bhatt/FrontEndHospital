import React, { useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getCurrentIp, saveServerIp } from "./Config";

const { width } = Dimensions.get("window");
const isWeb = width > 768;

export default function WelcomeScreen({ navigation }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  // ── IP modal ───────────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [ipInput,      setIpInput]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [testing,      setTesting]      = useState(false);
  const [testResult,   setTestResult]   = useState(null); // null | "ok" | "fail"
  const [displayIp,    setDisplayIp]    = useState(getCurrentIp);

  const openModal = useCallback(() => {
    setIpInput(getCurrentIp());
    setTestResult(null);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTestResult(null);
  }, []);

  const handleTest = useCallback(async () => {
    const ip = ipInput.trim();
    if (!ip) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${ip}:8080/actuator/health`, {
        signal: AbortSignal.timeout(4000),
      });
      setTestResult(res.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  }, [ipInput]);

  const handleSave = useCallback(async () => {
    const ip = ipInput.trim();
    if (!ip) {
      Alert.alert("Invalid", "Please enter an IP address.");
      return;
    }
    setSaving(true);
    try {
      await saveServerIp(ip);
      setDisplayIp(ip);
      closeModal();
    } catch {
      Alert.alert("Error", "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }, [ipInput, closeModal]);

  // ── Feature cards ──────────────────────────────────────────────────────────
  const features = [
    {
      icon:     <MaterialIcons name="analytics" size={28} color="#2563EB" />,
      title:    "AI Predictions",
      text:     "Get intelligent cardiovascular risk analysis instantly.",
      gradient: ["#EEF2FF", "#FFFFFF"],
    },
    {
      icon:     <Ionicons name="shield-checkmark" size={28} color="#14B8A6" />,
      title:    "Secure & Private",
      text:     "Advanced encryption ensures patient data safety.",
      gradient: ["#ECFEFF", "#FFFFFF"],
    },
    {
      icon:     <FontAwesome5 name="chart-line" size={26} color="#7C3AED" />,
      title:    "Clinical Insights",
      text:     "Data-driven recommendations for doctors and patients.",
      gradient: ["#F5F3FF", "#FFFFFF"],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <LinearGradient colors={["#1E3A8A", "#2563EB"]} style={styles.header}>
          <Ionicons name="medkit" size={55} color="#fff" />
          <Text style={styles.appTitle}>MediChat AI</Text>
          <Text style={styles.tagline}>
            Smart. Secure. AI-powered healthcare insights.
          </Text>

          {/* IP pill — tap to open settings modal */}
          <TouchableOpacity onPress={openModal} style={styles.ipPill} activeOpacity={0.8}>
            <MaterialCommunityIcons name="server-network" size={13} color="#93C5FD" />
            <Text style={styles.ipPillText} numberOfLines={1}>{displayIp}</Text>
            <MaterialCommunityIcons name="pencil" size={12} color="#93C5FD" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── FEATURES ──────────────────────────────────────────────────── */}
          {isWeb ? (
            <View style={[styles.featureRow, { flexDirection: "row" }]}>
              {features.map((item, index) => (
                <View key={index} style={styles.webCard}>
                  {item.icon}
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureText}>{item.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              <Animated.ScrollView
                horizontal pagingEnabled
                snapToInterval={width * 0.8}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: true }
                )}
                onMomentumScrollEnd={(e) => {
                  setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / (width * 0.8)));
                }}
                scrollEventThrottle={16}
              >
                {features.map((item, index) => {
                  const inputRange = [
                    (index - 1) * width * 0.8,
                    index       * width * 0.8,
                    (index + 1) * width * 0.8,
                  ];
                  const scale = scrollX.interpolate({
                    inputRange, outputRange: [0.9, 1, 0.9], extrapolate: "clamp",
                  });
                  return (
                    <Animated.View key={index} style={[styles.mobileCard, { transform: [{ scale }] }]}>
                      <LinearGradient colors={item.gradient} style={styles.cardGradient}>
                        {item.icon}
                        <Text style={styles.featureTitle}>{item.title}</Text>
                        <Text style={styles.featureText}>{item.text}</Text>
                      </LinearGradient>
                    </Animated.View>
                  );
                })}
              </Animated.ScrollView>

              <View style={styles.dotsContainer}>
                {features.map((_, i) => (
                  <View key={i} style={[styles.dot, activeIndex === i && styles.activeDot]} />
                ))}
              </View>
            </>
          )}

          {/* ── CTA ───────────────────────────────────────────────────────── */}
          <View style={styles.ctaSection}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("DoctorLogin")}>
              <Text style={styles.primaryText}>Continue as Doctor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate("PatientLogin")}>
              <Text style={styles.secondaryText}>Continue as Patient</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* ── IP SETTINGS MODAL ───────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>

            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <LinearGradient colors={["#2563EB", "#3B82F6"]} style={styles.modalHeaderIcon}>
                <MaterialCommunityIcons name="server-network" size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Server IP</Text>
                <Text style={styles.modalSub}>Set your laptop's IP on this network</Text>
              </View>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Active IP */}
            <View style={styles.currentBanner}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
              <Text style={styles.currentText}>
                Active: <Text style={{ fontWeight: "800" }}>{displayIp}</Text>
              </Text>
            </View>

            {/* Input + test */}
            <Text style={styles.inputLabel}>NEW IP ADDRESS</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { outlineStyle: "none" }]}
                value={ipInput}
                onChangeText={v => { setIpInput(v); setTestResult(null); }}
                placeholder="e.g. http://192.168.1.100"
                placeholderTextColor="#94A3B8"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={handleTest}
                disabled={testing || !ipInput.trim()}
                style={[styles.testBtn, (!ipInput.trim() || testing) && { opacity: 0.4 }]}
              >
                {testing
                  ? <ActivityIndicator size="small" color="#2563EB" />
                  : <MaterialCommunityIcons name="connection" size={20} color="#2563EB" />}
              </TouchableOpacity>
            </View>

            {testResult === "ok" && (
              <View style={[styles.resultBanner, { backgroundColor: "#D1FAE5" }]}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
                <Text style={[styles.resultText, { color: "#059669" }]}>Server reachable ✓</Text>
              </View>
            )}
            {testResult === "fail" && (
              <View style={[styles.resultBanner, { backgroundColor: "#FEE2E2" }]}>
                <MaterialCommunityIcons name="alert-circle" size={14} color="#DC2626" />
                <Text style={[styles.resultText, { color: "#DC2626" }]}>
                  Cannot reach server. Check IP and make sure Spring Boot is running.
                </Text>
              </View>
            )}

            {/* Tip */}
            <View style={styles.tipBox}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color="#D97706" />
              <Text style={styles.tipText}>
                Run <Text style={styles.tipCode}>ipconfig</Text> (Windows) or{" "}
                <Text style={styles.tipCode}>ifconfig</Text> (Mac/Linux) on your laptop.
                Include <Text style={styles.tipCode}>http://</Text> — e.g.{" "}
                <Text style={styles.tipCode}>http://192.168.1.5</Text>.
                Phone and laptop must be on the same network.
              </Text>
            </View>

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#2563EB", "#3B82F6"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.saveBtnInner}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
                  : <MaterialCommunityIcons name="content-save" size={20} color="#fff" style={{ marginRight: 10 }} />}
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save & Apply"}</Text>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFF" },

  header: {
    paddingVertical: 45, alignItems: "center",
    borderBottomLeftRadius: 25, borderBottomRightRadius: 25,
  },
  appTitle: { fontSize: 30, fontWeight: "800", color: "#fff", marginTop: 12 },
  tagline:  { fontSize: 14, color: "#E0E7FF", marginTop: 6, textAlign: "center", paddingHorizontal: 30 },

  ipPill: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  ipPillText: { fontSize: 12, color: "#BFDBFE", fontWeight: "600", maxWidth: 200 },

  body:        { paddingTop: 30, paddingBottom: 50, alignItems: "center" },
  featureRow:  { width: "100%", maxWidth: 1000, gap: 20, justifyContent: "center" },
  webCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 25,
    flex: 1, alignItems: "center",
    shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  mobileCard:   { width: width * 0.75, marginRight: 20 },
  cardGradient: { borderRadius: 20, padding: 25, alignItems: "center" },
  featureTitle: { fontSize: 18, fontWeight: "700", marginTop: 12, color: "#0F172A", textAlign: "center" },
  featureText:  { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8, lineHeight: 20 },
  dotsContainer:{ flexDirection: "row", marginTop: 15 },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: "#CBD5E1", marginHorizontal: 5 },
  activeDot:    { backgroundColor: "#2563EB", width: 18 },

  ctaSection:   { width: "85%", marginTop: 35 },
  primaryBtn:   { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 18, alignItems: "center", marginBottom: 15 },
  primaryText:  { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { borderWidth: 1.5, borderColor: "#2563EB", paddingVertical: 16, borderRadius: 18, alignItems: "center", backgroundColor: "#fff" },
  secondaryText:{ color: "#2563EB", fontSize: 16, fontWeight: "600" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44,
  },
  modalHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 20 },
  modalHeader:     { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  modalHeaderIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  modalTitle:      { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  modalSub:        { fontSize: 12, color: "#94A3B8", marginTop: 2 },

  currentBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#D1FAE5", borderRadius: 10, padding: 12, marginBottom: 16,
  },
  currentText: { fontSize: 13, color: "#065F46" },

  inputLabel: {
    fontSize: 10, fontWeight: "700", color: "#3B5A8A",
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  input: {
    flex: 1, backgroundColor: "#EBF3FF", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#DBEAFE",
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: "#0F172A", fontWeight: "600",
  },
  testBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: "#EFF6FF", borderWidth: 1.5, borderColor: "#DBEAFE",
    alignItems: "center", justifyContent: "center",
  },
  resultBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 10, marginBottom: 10 },
  resultText:   { fontSize: 13, flex: 1, fontWeight: "500" },

  tipBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FFFBEB", borderRadius: 10, padding: 12, marginBottom: 16,
  },
  tipText: { fontSize: 12, color: "#92400E", flex: 1, lineHeight: 18 },
  tipCode: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontWeight: "700" },

  saveBtn:      { borderRadius: 14, overflow: "hidden" },
  saveBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15 },
  saveBtnText:  { fontSize: 16, fontWeight: "700", color: "#fff" },
});