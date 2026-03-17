import React, { useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const isWeb = width > 768;

const FEATURES = [
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

export default function WelcomeScreen({ navigation }) {
  const scrollX      = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

        {/* ── Header ── */}
        <LinearGradient colors={["#1E3A8A", "#2563EB"]} style={s.header}>
          <LinearGradient
            colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.07)"]}
            style={s.headerIconWrap}
          >
            <MaterialCommunityIcons name="heart-pulse" size={44} color="#fff" />
          </LinearGradient>
          <Text style={s.appTitle}>CardioAI</Text>
          <Text style={s.tagline}>
            Smart. Secure. AI-powered cardiovascular healthcare.
          </Text>

          {/* Stat chips */}
          <View style={s.chipRow}>
            <View style={s.chip}>
              <MaterialCommunityIcons name="brain" size={13} color="#93C5FD" />
              <Text style={s.chipText}>AI Powered</Text>
            </View>
            <View style={s.chip}>
              <MaterialCommunityIcons name="shield-lock" size={13} color="#93C5FD" />
              <Text style={s.chipText}>Secure</Text>
            </View>
            <View style={s.chip}>
              <MaterialCommunityIcons name="heart-pulse" size={13} color="#93C5FD" />
              <Text style={s.chipText}>ECG Analysis</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* ── Feature cards ── */}
          {isWeb ? (
            <View style={[s.featureRow, { flexDirection: "row" }]}>
              {FEATURES.map((item, i) => (
                <View key={i} style={s.webCard}>
                  {item.icon}
                  <Text style={s.featureTitle}>{item.title}</Text>
                  <Text style={s.featureText}>{item.text}</Text>
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
                onMomentumScrollEnd={(e) =>
                  setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / (width * 0.8)))
                }
                scrollEventThrottle={16}
              >
                {FEATURES.map((item, i) => {
                  const inputRange = [
                    (i - 1) * width * 0.8,
                    i       * width * 0.8,
                    (i + 1) * width * 0.8,
                  ];
                  const scale = scrollX.interpolate({
                    inputRange, outputRange: [0.9, 1, 0.9], extrapolate: "clamp",
                  });
                  return (
                    <Animated.View key={i} style={[s.mobileCard, { transform: [{ scale }] }]}>
                      <LinearGradient colors={item.gradient} style={s.cardGradient}>
                        {item.icon}
                        <Text style={s.featureTitle}>{item.title}</Text>
                        <Text style={s.featureText}>{item.text}</Text>
                      </LinearGradient>
                    </Animated.View>
                  );
                })}
              </Animated.ScrollView>

              <View style={s.dotsRow}>
                {FEATURES.map((_, i) => (
                  <View key={i} style={[s.dot, activeIndex === i && s.dotActive]} />
                ))}
              </View>
            </>
          )}

          {/* ── Divider label ── */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>Get Started</Text>
            <View style={s.dividerLine} />
          </View>

          {/* ── CTA buttons ── */}
          <View style={s.ctaSection}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate("DoctorLogin")}
            >
              <LinearGradient
                colors={["#1E3A8A", "#2563EB"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.primaryBtn}
              >
                <View style={s.btnIconWrap}>
                  <MaterialCommunityIcons name="stethoscope" size={20} color="#2563EB" />
                </View>
                <Text style={s.primaryText}>Continue as Doctor</Text>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.secondaryBtn}
              activeOpacity={0.88}
              onPress={() => navigation.navigate("PatientLogin")}
            >
              <View style={[s.btnIconWrap, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="person" size={20} color="#2563EB" />
              </View>
              <Text style={s.secondaryText}>Continue as Patient</Text>
              <Ionicons name="arrow-forward" size={18} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {/* ── Footer note ── */}
          <Text style={s.footerNote}>
            For clinical decision support only.{"\n"}Not a substitute for professional medical advice.
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFF" },

  // Header
  header: {
    paddingTop: 40, paddingBottom: 36,
    alignItems: "center",
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerIconWrap: {
    width: 88, height: 88, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  appTitle: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  tagline:  { fontSize: 14, color: "#BFDBFE", marginTop: 8, textAlign: "center", paddingHorizontal: 36, lineHeight: 22 },

  chipRow: { flexDirection: "row", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 20 },
  chip:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:{ fontSize: 12, color: "#BFDBFE", fontWeight: "600" },

  // Body
  body:        { paddingTop: 30, paddingBottom: 50, alignItems: "center" },
  featureRow:  { width: "100%", maxWidth: 1000, gap: 20, justifyContent: "center", paddingHorizontal: 20 },
  webCard:     { backgroundColor: "#fff", borderRadius: 20, padding: 25, flex: 1, alignItems: "center", shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  mobileCard:  { width: width * 0.75, marginRight: 20 },
  cardGradient:{ borderRadius: 20, padding: 25, alignItems: "center" },
  featureTitle:{ fontSize: 17, fontWeight: "700", marginTop: 12, color: "#0F172A", textAlign: "center" },
  featureText: { fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 8, lineHeight: 20 },

  dotsRow:  { flexDirection: "row", marginTop: 15 },
  dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: "#CBD5E1", marginHorizontal: 5 },
  dotActive:{ backgroundColor: "#2563EB", width: 18 },

  // Divider
  dividerRow:  { flexDirection: "row", alignItems: "center", width: "85%", marginTop: 32, marginBottom: 4, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { fontSize: 12, color: "#94A3B8", fontWeight: "600", letterSpacing: 1 },

  // CTA
  ctaSection:   { width: "85%", marginTop: 12, gap: 14 },
  primaryBtn:   { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 18, gap: 12 },
  btnIconWrap:  { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  primaryText:  { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 18, gap: 12, borderWidth: 1.5, borderColor: "#DBEAFE", backgroundColor: "#fff" },
  secondaryText:{ flex: 1, color: "#2563EB", fontSize: 16, fontWeight: "600" },

  footerNote: { marginTop: 28, fontSize: 11, color: "#94A3B8", textAlign: "center", lineHeight: 18, paddingHorizontal: 40 },
});