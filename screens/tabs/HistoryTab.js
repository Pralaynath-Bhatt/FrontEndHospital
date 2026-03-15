// tabs/HistoryTab.jsx
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, FlatList, ActivityIndicator, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import AnimatedRN, { FadeInLeft } from "react-native-reanimated";
import axios from "axios";

import { C, G } from "../Constraint";
import { SectionCard, SectionHeading, Divider, ErrorCard, parseApiError } from "./SharedComponents";
import BASE_URL from "../Config";

const { width } = Dimensions.get("window");
const isWeb = width > 900;

// ─── Expandable Section ───────────────────────────────────────────────────────
const DiagnosisSection = ({ title, iconName, iconColor, bgColor, children, isExpandedDefault = false }) => {
  const [expanded, setExpanded] = useState(isExpandedDefault);
  return (
    <View style={s.sectionWrap}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setExpanded(v => !v)} style={s.sectionHeader}>
        <View style={[s.sectionIconBg, { backgroundColor: bgColor || iconColor + "22" }]}>
          <FontAwesome5 name={iconName} size={13} color={iconColor} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={17} color={C.textMuted} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
      {expanded && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
};

// ─── History Card ─────────────────────────────────────────────────────────────
const PatientDiagnosisItem = ({ item }) => {
  const isPositive = item.prediction.toLowerCase().includes("high") || item.prediction.toLowerCase().includes("positive");
  return (
    <AnimatedRN.View style={s.card} entering={FadeInLeft.duration(600)}>
      <LinearGradient colors={isPositive ? G.red : G.green} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.dateBanner}>
        <FontAwesome5 name="calendar-alt" size={11} color="rgba(255,255,255,0.85)" />
        <Text style={s.dateBannerText}>{item.date}</Text>
      </LinearGradient>
      <View style={s.cardBody}>
        <DiagnosisSection title="Symptoms & Input Details" iconName="stethoscope" iconColor={C.cyan} bgColor={C.cyanLight}>
          {item.symptoms.length > 0
            ? item.symptoms.map((sym, i) => (
              <View key={i} style={s.listRow}>
                <View style={[s.dot, { backgroundColor: C.cyan }]} />
                <Text style={s.listText}>{sym}</Text>
              </View>
            ))
            : <Text style={s.listText}>No detailed inputs recorded</Text>}
        </DiagnosisSection>
        <DiagnosisSection title="Prediction" iconName="heartbeat"
          iconColor={isPositive ? C.red : C.green} bgColor={isPositive ? C.redLight : C.greenLight} isExpandedDefault>
          <View style={s.predRow}>
            <FontAwesome5 name="heart" size={20} color={isPositive ? C.red : C.green} style={{ marginRight: 10 }} />
            <Text style={[s.predText, { color: isPositive ? C.red : C.green }]}>{item.prediction}</Text>
          </View>
        </DiagnosisSection>
        <DiagnosisSection title="Recommended Medicines" iconName="capsules" iconColor={C.purple} bgColor={C.purpleLight}>
          {item.medicines.length > 0
            ? item.medicines.map((m, i) => (
              <View key={i} style={s.listRow}>
                <View style={[s.dot, { backgroundColor: C.purple }]} />
                <Text style={s.listText}>{m}</Text>
              </View>
            ))
            : <Text style={s.listText}>No recommendations available</Text>}
        </DiagnosisSection>
        {item.transcript ? (
          <DiagnosisSection title="Audio Transcript" iconName="microphone" iconColor={C.blue} bgColor={C.bluePale}>
            <Text style={[s.listText, { fontStyle: "italic" }]}>{item.transcript}</Text>
          </DiagnosisSection>
        ) : null}
        {item.summary ? (
          <DiagnosisSection title="Summary" iconName="file-alt" iconColor={C.green} bgColor={C.greenLight}>
            <Text style={[s.listText, { fontStyle: "italic" }]}>{item.summary}</Text>
          </DiagnosisSection>
        ) : null}
        {item.deIdentifiedTranscript ? (
          <DiagnosisSection title="De-identified Transcript" iconName="shield-alt" iconColor={C.amber} bgColor={C.amberLight}>
            <Text style={[s.listText, { fontStyle: "italic" }]}>{item.deIdentifiedTranscript}</Text>
          </DiagnosisSection>
        ) : null}
      </View>
    </AnimatedRN.View>
  );
};

const renderItem = ({ item }) => <PatientDiagnosisItem item={item} />;

// ─── Main HistoryTab ──────────────────────────────────────────────────────────
export default function HistoryTab() {
  const [searchText, setSearchText]   = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [diagnosisList, setList]      = useState([]);
  const [searched, setSearched]       = useState(false);

  const dismissError = useCallback(() => setError(null), []);

  const getMedicineRecommendations = useCallback((riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case "high":     return ["Aspirin (daily)", "Statins (for cholesterol)", "Beta-blockers (for heart rate)"];
      case "medium":   return ["Aspirin (as needed)", "Lifestyle changes recommended"];
      case "low":
      case "negative": return ["No immediate medication; maintain healthy lifestyle"];
      default:         return ["Consult a doctor for recommendations"];
    }
  }, []);

  const handleSearch = useCallback(async () => {
    const name = searchText.trim();
    if (!name) { setError({ type: "general", message: "Please enter a patient name to search." }); return; }
    setLoading(true); setError(null); setList([]); setSearched(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/patient/${encodeURIComponent(name)}/predictions`, {
        headers: { "Content-Type": "application/json" }, timeout: 10000,
      });
      if (response.status === 200 && response.data) {
        const predictions = Array.isArray(response.data.data || response.data)
          ? (response.data.data || response.data) : [];
        const transformed = predictions
          .filter(p => p && p.date && p.riskLevel)
          .map(prediction => {
            const inputData = prediction.inputData || {};
            return {
              date: new Date(prediction.date).toISOString().split("T")[0],
              symptoms: [
                `Age: ${inputData.Age || "N/A"}`,
                `Sex: ${inputData.Sex === "M" ? "Male" : "Female"}`,
                `Chest Pain: ${inputData.ChestPainType || "N/A"}`,
                `BP: ${inputData.RestingBP || "N/A"} mm Hg`,
                `Cholesterol: ${inputData.Cholesterol || "N/A"} mg/dl`,
                `Fasting BS: ${inputData.FastingBS === 1 ? "High" : "Normal"}`,
                `Resting ECG: ${inputData.RestingECG || "N/A"}`,
                `Max HR: ${inputData.MaxHR || "N/A"}`,
                `Exercise Angina: ${inputData.ExerciseAngina === "Y" ? "Yes" : "No"}`,
                `Oldpeak: ${inputData.Oldpeak || "N/A"}`,
                `ST Slope: ${inputData.ST_Slope || "N/A"}`,
              ].filter(sym => !sym.includes("N/A")),
              prediction: `Heart Disease ${prediction.riskLevel} (${((prediction.probability || 0) * 100).toFixed(1)}%)`,
              medicines: getMedicineRecommendations(prediction.riskLevel),
              transcript: inputData.transcript || "",
              summary: prediction.summary || "",
              deIdentifiedTranscript: prediction.deIdentifiedTranscript || "",
            };
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setList(transformed);
        if (transformed.length === 0) {
          setError({ type: "general", message: `No predictions found for "${name}".` });
        }
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError({ type: "general", message: `No predictions found for "${name}".` });
      } else if (err.code === "ECONNABORTED") {
        setError({ type: "general", message: "Request timed out. Please try again." });
      } else {
        setError(parseApiError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [searchText, getMedicineRecommendations]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: isWeb ? 28 : 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: C.bg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[{ flex: 1 }, isWeb && { width: 780, alignSelf: "center" }]}>

        <SectionCard>
          <SectionHeading icon="history" title="Patient History" subtitle="Search past predictions and records" color={C.green} />
          <Divider />

          <View style={s.searchRow}>
            <View style={s.searchInputWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[s.searchInput, { outlineStyle: "none" }]}
                placeholder="Search patient name..."
                placeholderTextColor={C.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                editable={!loading}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchText(""); setList([]); setError(null); setSearched(false); }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={handleSearch}
              disabled={loading || !searchText.trim()}
              style={[s.searchBtn, (loading || !searchText.trim()) && { opacity: 0.4 }]}
            >
              <LinearGradient colors={G.green} style={s.searchBtnInner}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* States */}
        {loading ? (
          <View style={s.stateBox}>
            <ActivityIndicator size="large" color={C.green} />
            <Text style={s.stateText}>Searching patient history...</Text>
          </View>
        ) : error ? (
          <View style={{ marginTop: 8 }}>
            <ErrorCard error={error} onDismiss={dismissError} />
            <TouchableOpacity onPress={handleSearch} style={[s.retryBtn, { marginTop: 10, alignSelf: "center" }]}>
              <Text style={s.retryBtnText}>Retry Search</Text>
            </TouchableOpacity>
          </View>
        ) : !searched ? (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="account-search-outline" size={52} color={C.textMuted} />
            <Text style={s.emptyStateTitle}>Search Patient Records</Text>
            <Text style={s.emptyStateSubtitle}>Enter a patient name above to view their past predictions and diagnoses.</Text>
          </View>
        ) : diagnosisList.length > 0 ? (
          <>
            <View style={s.resultsHeader}>
              <Text style={s.resultsCount}>{diagnosisList.length} record{diagnosisList.length !== 1 ? "s" : ""} found</Text>
            </View>
            <FlatList
              data={diagnosisList}
              renderItem={renderItem}
              keyExtractor={(item, i) => `${item.date}-${i}`}
              scrollEnabled={false}
              style={{ marginTop: 4 }}
            />
          </>
        ) : null}

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceBlu,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, minHeight: 50,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 12 },
  searchBtn: { borderRadius: 12, overflow: "hidden" },
  searchBtnInner: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  stateBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  stateText: { color: C.textSecond, fontSize: 15, textAlign: "center", lineHeight: 22 },
  retryBtn: { backgroundColor: C.blueGhost, borderWidth: 1.5, borderColor: C.bluePale, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: C.blue, fontWeight: "700", fontSize: 14 },
  emptyState: { alignItems: "center", paddingVertical: 52, gap: 10 },
  emptyStateTitle: { fontSize: 17, fontWeight: "700", color: C.textSecond },
  emptyStateSubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center", maxWidth: 280, lineHeight: 20 },
  resultsHeader: { paddingVertical: 10, paddingHorizontal: 2 },
  resultsCount: { fontSize: 12, fontWeight: "700", color: C.textMuted, letterSpacing: 0.5 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 14, borderWidth: 1,
    borderColor: C.border, overflow: "hidden",
    shadowColor: "#1E3A8A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  dateBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 16 },
  dateBannerText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cardBody: { padding: 4 },
  sectionWrap: { borderBottomWidth: 1, borderBottomColor: C.border },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  sectionIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: C.textPrimary, flex: 1 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },
  listRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6, gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  listText: { fontSize: 13, color: C.textSecond, flex: 1, lineHeight: 20 },
  predRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  predText: { fontSize: 16, fontWeight: "700" },
});