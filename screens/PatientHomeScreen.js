import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import BASE_URL from "./Config";

/* ---------------- Expandable Section ---------------- */

const DiagnosisSection = ({ title, icon, color, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.sectionBox}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setOpen(!open)}
      >
        <FontAwesome5 name={icon} size={16} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color="#555"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>

      {open && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

/* ---------------- Diagnosis Card ---------------- */

const DiagnosisCard = ({ item }) => {
  const riskColor =
    item.prediction.toLowerCase().includes("high")
      ? "#ef4444"
      : item.prediction.toLowerCase().includes("medium")
      ? "#f59e0b"
      : "#10b981";

  return (
    <Animated.View entering={FadeInUp.duration(500)} style={styles.card}>
      <LinearGradient
        colors={[riskColor, "#ffffff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.dateBadge}
      >
        <Text style={styles.dateText}>{item.date}</Text>
      </LinearGradient>

      <DiagnosisSection title="Prediction" icon="heartbeat" color={riskColor}>
        <Text style={[styles.prediction, { color: riskColor }]}>
          {item.prediction}
        </Text>
      </DiagnosisSection>

      <DiagnosisSection title="Symptoms" icon="stethoscope" color="#3b82f6">
        {item.symptoms.map((s, i) => (
          <Text key={i} style={styles.listItem}>
            • {s}
          </Text>
        ))}
      </DiagnosisSection>

      <DiagnosisSection title="Medicines" icon="capsules" color="#8b5cf6">
        {item.medicines.map((m, i) => (
          <Text key={i} style={styles.listItem}>
            • {m}
          </Text>
        ))}
      </DiagnosisSection>

      {item.summary ? (
        <DiagnosisSection title="Summary" icon="file-alt" color="#14b8a6">
          <Text style={styles.summary}>{item.summary}</Text>
        </DiagnosisSection>
      ) : null}
    </Animated.View>
  );
};

/* ---------------- Main Screen ---------------- */

export default function PatientHomeScreen({ route, navigation, onLogout }) {
  const { patientName } = route.params || {};

  const [list, setList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  /* -------- Fetch Data -------- */

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${BASE_URL}:8080/api/patient/${encodeURIComponent(
          patientName
        )}/predictions`
      );

      const data = res.data.data.map((p) => ({
        date: new Date(p.date).toISOString().split("T")[0],
        prediction: `Heart Disease ${p.riskLevel} (${(
          p.probability * 100
        ).toFixed(1)}%)`,
        symptoms: Object.values(p.inputData || {}),
        medicines:
          p.riskLevel === "High"
            ? ["Aspirin", "Statins", "Beta blockers"]
            : p.riskLevel === "Medium"
            ? ["Lifestyle changes"]
            : ["Healthy lifestyle"],
        summary: p.summary || "",
      }));

      setList(data);
      setFiltered(data);
    } catch (e) {
      console.log("Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* -------- Search -------- */

  useEffect(() => {
    let temp = [...list];

    if (search)
      temp = temp.filter(
        (i) =>
          i.date.includes(search) ||
          i.prediction.toLowerCase().includes(search.toLowerCase())
      );

    temp.sort((a, b) =>
      sortNewest
        ? new Date(b.date) - new Date(a.date)
        : new Date(a.date) - new Date(b.date)
    );

    setFiltered(temp);
  }, [search, sortNewest, list]);

  /* -------- Refresh -------- */

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  /* -------- Logout -------- */

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigation.replace("PatientLoginScreen");
  };

  /* -------- UI -------- */

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={{ marginTop: 10 }}>Loading health records...</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#e6fffa", "#f8fafc"]} style={{ flex: 1 }}>
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => i.toString()}
          renderItem={({ item }) => <DiagnosisCard item={item} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={styles.header}>
                <Ionicons name="person-circle" size={55} color="#0f766e" />
                <View>
                  <Text style={styles.welcome}>Welcome</Text>
                  <Text style={styles.name}>{patientName}</Text>
                </View>
              </View>

              {/* Search */}
              <TextInput
                placeholder="Search by date or risk..."
                value={search}
                onChangeText={setSearch}
                style={styles.search}
              />

              {/* Sort Toggle */}
              <TouchableOpacity
                style={styles.sortBtn}
                onPress={() => setSortNewest(!sortNewest)}
              >
                <Text style={{ color: "white" }}>
                  Sort: {sortNewest ? "Newest" : "Oldest"}
                </Text>
              </TouchableOpacity>
            </>
          }
        />

        {/* Logout Floating */}
        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={26} color="white" />
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },

  welcome: { fontSize: 14, color: "#64748b" },
  name: { fontSize: 22, fontWeight: "bold", color: "#0f172a" },

  search: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 3,
  },

  sortBtn: {
    backgroundColor: "#0f766e",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 20,
    marginBottom: 18,
    elevation: 5,
  },

  dateBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },

  dateText: { color: "white", fontWeight: "bold" },

  prediction: { fontSize: 16, fontWeight: "700", marginTop: 6 },

  sectionBox: { marginTop: 12 },
  sectionHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  sectionTitle: { fontWeight: "700", fontSize: 15 },

  sectionContent: { marginTop: 8 },
  listItem: { marginVertical: 2, color: "#334155" },
  summary: { fontStyle: "italic", color: "#475569" },

  logout: {
    position: "absolute",
    bottom: 30,
    right: 25,
    backgroundColor: "#dc2626",
    width: 60,
    height: 60,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
});
