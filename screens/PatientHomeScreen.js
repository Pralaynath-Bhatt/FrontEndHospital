import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  SafeAreaView, TouchableOpacity, TextInput, RefreshControl,
} from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import BASE_URL from "./Config";

const CollapsibleSection = ({ title, icon, color, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setIsOpen(!isOpen)}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.iconCircle, { backgroundColor: color }]}>
            <FontAwesome5 name={icon} size={14} color="#fff" />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
      </TouchableOpacity>
      {isOpen && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

const DiagnosisCard = ({ item }) => {
  const isHigh = item.prediction.toLowerCase().includes("high");
  const isMed = item.prediction.toLowerCase().includes("medium");
  const riskColor = isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#10b981";
  const riskBg = isHigh ? "#fef2f2" : isMed ? "#fffbeb" : "#f0fdf4";

  return (
    <Animated.View entering={FadeInLeft} style={styles.card}>
      <LinearGradient colors={[riskColor, riskColor + "dd"]} style={styles.dateHeader}>
        <Ionicons name="calendar-outline" size={16} color="#fff" />
        <Text style={styles.dateText}>{item.date}</Text>
      </LinearGradient>

      <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
        <FontAwesome5 name="heartbeat" size={24} color={riskColor} />
        <Text style={[styles.riskText, { color: riskColor }]}>{item.prediction}</Text>
      </View>

      <CollapsibleSection title="Patient Details" icon="user-md" color="#3b82f6" defaultOpen>
        {item.symptoms.map((s, i) => (
          <View key={i} style={styles.detailRow}>
            <View style={styles.bullet} />
            <Text style={styles.detailText}>{s}</Text>
          </View>
        ))}
      </CollapsibleSection>

      {item.medicines.length > 0 && (
        <CollapsibleSection title="Recommended Actions" icon="pills" color="#8b5cf6">
          {item.medicines.map((m, i) => (
            <View key={i} style={styles.medicineRow}>
              <Ionicons name="medical" size={16} color="#8b5cf6" />
              <Text style={styles.medicineText}>{m}</Text>
            </View>
          ))}
        </CollapsibleSection>
      )}

      {item.transcript && (
        <CollapsibleSection title="Audio Transcript" icon="microphone" color="#f59e0b">
          <Text style={styles.transcriptText}>{item.transcript}</Text>
        </CollapsibleSection>
      )}
    </Animated.View>
  );
};

export default function PatientHomeScreen({ route, navigation, onLogout }) {
  const { patientName } = route.params || {};
  const [list, setList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/patient/${encodeURIComponent(patientName)}/predictions`);
      
      const data = res.data.data.map(p => {
        const input = p.inputData || {};
        const symptoms = Object.entries(input)
          .filter(([k, v]) => k !== "transcript" && v !== null)
          .map(([k, v]) => {
            const key = k.replace(/([A-Z])/g, " $1").trim();
            let val = v;
            if (k === "Sex") val = v === "M" ? "Male" : "Female";
            if (k === "FastingBS") val = v === 1 ? "High" : "Normal";
            if (k === "ExerciseAngina") val = v === "Y" ? "Yes" : "No";
            return `${key}: ${val}`;
          });

        const medicines = p.riskLevel?.toLowerCase().includes("high")
          ? ["Aspirin (daily)", "Statins", "Beta-blockers", "See cardiologist"]
          : p.riskLevel?.toLowerCase().includes("medium")
          ? ["Aspirin (as needed)", "Lifestyle changes"]
          : ["Maintain healthy lifestyle", "Regular exercise"];

        return {
          date: new Date(p.date).toISOString().split("T")[0],
          prediction: `Heart Disease ${p.riskLevel} (${(p.probability * 100).toFixed(1)}%)`,
          symptoms,
          medicines,
          transcript: input.transcript || "",
        };
      });

      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setList(data);
      setFiltered(data);
    } catch (e) {
      console.log("Error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (patientName) fetchData();
  }, [patientName]);

  useEffect(() => {
    let temp = [...list];
    if (search) {
      temp = temp.filter(i =>
        i.date.includes(search) || i.prediction.toLowerCase().includes(search.toLowerCase())
      );
    }
    temp.sort((a, b) => sortNewest ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date));
    setFiltered(temp);
  }, [search, sortNewest, list]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading records...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#f8fafc", "#fff"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
            <View>
              <Text style={styles.welcome}>Welcome back,</Text>
              <Text style={styles.name}>{patientName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.replace("PatientLoginScreen")}>
            <Ionicons name="log-out-outline" size={26} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: "#dbeafe" }]}>
            <Text style={styles.statNum}>{filtered.length}</Text>
            <Text style={styles.statLabel}>Records</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: "#fef3c7" }]}>
            <Text style={styles.statNum}>
              {filtered.filter(i => i.prediction.toLowerCase().includes("high")).length}
            </Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: "#dcfce7" }]}>
            <Text style={styles.statNum}>
              {filtered.filter(i => i.prediction.toLowerCase().includes("low")).length}
            </Text>
            <Text style={styles.statLabel}>Low Risk</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortNewest(!sortNewest)}>
          <Ionicons name={sortNewest ? "arrow-down" : "arrow-up"} size={16} color="#fff" />
          <Text style={styles.sortText}>{sortNewest ? "Newest" : "Oldest"} First</Text>
        </TouchableOpacity>

        <FlatList
          data={filtered}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => <DiagnosisCard item={item} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#64748b" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" },
  welcome: { fontSize: 14, color: "#64748b" },
  name: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  stats: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  stat: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
  statNum: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#0f172a" },
  sortBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4f46e5", marginHorizontal: 20, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, gap: 8, marginBottom: 16 },
  sortText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  dateHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  dateText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  riskBadge: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, margin: 12, borderRadius: 12 },
  riskText: { fontSize: 18, fontWeight: "700", flex: 1 },
  section: { borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 16 },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, gap: 8 },
  bullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#3b82f6", marginTop: 7 },
  detailText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 20 },
  medicineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  medicineText: { flex: 1, fontSize: 14, color: "#475569" },
  transcriptText: { fontSize: 14, color: "#475569", lineHeight: 20, fontStyle: "italic" },
});