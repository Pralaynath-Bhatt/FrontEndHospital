// DoctorHomeScreen.jsx — Main entry point with tab navigation
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import ECGTab from "./tabs/EcgTab";
import AudioTab from "./tabs/AudioTab";
import ManualTab from "./tabs/ManualTab";
import HistoryTab from "./tabs/HistoryTab";

const { width } = Dimensions.get("window");
const isWeb = width > 900;

export const C = {
  bg:          "#EEF2FF",
  surface:     "#FFFFFF",
  surfaceAlt:  "#F0F6FF",
  surfaceBlu:  "#EBF3FF",
  navy:        "#0F172A",
  darkBlue:    "#1E3A8A",
  blue:        "#2563EB",
  blueMid:     "#3B82F6",
  blueLight:   "#60A5FA",
  bluePale:    "#BFDBFE",
  blueGhost:   "#EFF6FF",
  border:      "#DBEAFE",
  green:       "#059669",
  greenLight:  "#D1FAE5",
  red:         "#DC2626",
  redLight:    "#FEE2E2",
  amber:       "#D97706",
  amberLight:  "#FEF3C7",
  purple:      "#7C3AED",
  purpleLight: "#EDE9FE",
  cyan:        "#0891B2",
  cyanLight:   "#CFFAFE",
  textPrimary: "#0F172A",
  textSecond:  "#3B5A8A",
  textMuted:   "#94A3B8",
};

export const G = {
  navy:   ["#0F172A", "#1E3A8A", "#2563EB"],
  blue:   ["#2563EB", "#3B82F6"],
  teal:   ["#0891B2", "#2563EB"],
  green:  ["#059669", "#0891B2"],
  red:    ["#DC2626", "#F59E0B"],
  purple: ["#7C3AED", "#2563EB"],
  amber:  ["#D97706", "#DC2626"],
};

const TABS = [
  { id: "ecg",     label: "ECG",     icon: "waveform",       gradient: G.teal   },
  { id: "audio",   label: "Audio",   icon: "microphone",     gradient: G.purple },
  { id: "manual",  label: "Manual",  icon: "clipboard-text", gradient: G.blue   },
  { id: "history", label: "History", icon: "history",        gradient: G.green  },
];

export default function DoctorHomeScreen({ onLogout }) {
  const [activeTab, setActiveTab] = useState("ecg");

  const renderTab = useCallback(() => {
    switch (activeTab) {
      case "ecg":     return <ECGTab />;
      case "audio":   return <AudioTab />;
      case "manual":  return <ManualTab />;
      case "history": return <HistoryTab />;
      default:        return <ECGTab />;
    }
  }, [activeTab]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── Top Bar ── */}
      <LinearGradient colors={G.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.topBar}>
        <LinearGradient colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.07)"]} style={s.topBarIcon}>
          <MaterialCommunityIcons name="heart-pulse" size={24} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.topBarTitle}>CardioAI</Text>
          <Text style={s.topBarSub}>Heart Disease Prediction System</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={s.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={15} color="#fff" />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Tab Bar ── */}
      <View style={s.tabBar}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[s.tabItem, active && s.tabItemActive]}
              activeOpacity={0.75}
            >
              {active ? (
                <LinearGradient colors={tab.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.tabInnerActive}>
                  <MaterialCommunityIcons name={tab.icon} size={16} color="#fff" />
                  <Text style={s.tabLabelActive}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <View style={s.tabInner}>
                  <MaterialCommunityIcons name={tab.icon} size={16} color={C.textMuted} />
                  <Text style={s.tabLabel}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Active Tab Content ── */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {renderTab()}
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,
  },
  topBarIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  topBarTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  topBarSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  tabBar: {
    flexDirection: "row", backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
  },
  tabItem: { flex: 1, borderRadius: 10, overflow: "hidden" },
  tabItemActive: {},
  tabInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, paddingHorizontal: 4,
    backgroundColor: C.surfaceAlt, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  tabInnerActive: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 10,
  },
  tabLabel: { fontSize: 12, fontWeight: "600", color: C.textMuted },
  tabLabelActive: { fontSize: 12, fontWeight: "700", color: "#fff" },
});