import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList, ScrollView,
  SafeAreaView, TouchableOpacity, RefreshControl,
} from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import BASE_URL from "./Config";

// ── ngrok-safe axios instance ─────────────────────────────────────────────────
const api = axios.create({
  headers: { "ngrok-skip-browser-warning": "true" },
  timeout: 15000,
});

// ── Risk level config ─────────────────────────────────────────────────────────
const RISK_CONFIG = {
  "High Risk":   { color: "#ef4444", bg: "#fef2f2", icon: "heart-broken",        label: "High Risk"             },
  "Low Risk":    { color: "#10b981", bg: "#f0fdf4", icon: "heart",               label: "Low Risk"              },
  "Abnormal":    { color: "#f59e0b", bg: "#fffbeb", icon: "exclamation-triangle", label: "Abnormal ECG"         },
  "MI":          { color: "#dc2626", bg: "#fef2f2", icon: "heartbeat",            label: "Myocardial Infarction" },
  "History-MI":  { color: "#7c3aed", bg: "#f5f3ff", icon: "history",             label: "History of MI"         },
  "Normal":      { color: "#10b981", bg: "#f0fdf4", icon: "check-circle",         label: "Normal ECG"            },
};
const getRiskCfg = (r) =>
  RISK_CONFIG[r] ?? { color: "#64748b", bg: "#f8fafc", icon: "question-circle", label: r };

// ── Helpers ───────────────────────────────────────────────────────────────────
const isECGRecord = (inputData) =>
  inputData && "territorial_distribution" in inputData;

const formatKey = (k) =>
  k.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();

const formatValue = (k, v) => {
  if (k === "Sex")            return v === "M" ? "Male" : "Female";
  if (k === "FastingBS")      return v === 1   ? "High (>120 mg/dl)" : "Normal";
  if (k === "ExerciseAngina") return v === "Y" ? "Yes" : "No";
  if (k === "ChestPainType") {
    const map = { TA: "Typical Angina", ATA: "Atypical Angina", NAP: "Non-Anginal Pain", ASY: "Asymptomatic" };
    return map[v] ?? v;
  }
  if (k === "RestingECG") {
    const map = { Normal: "Normal", ST: "ST-T Abnormality", LVH: "Left Ventricular Hypertrophy" };
    return map[v] ?? v;
  }
  return String(v);
};

const HEART_FIELD_ORDER = [
  "Age", "Sex", "ChestPainType", "RestingBP", "Cholesterol",
  "FastingBS", "RestingECG", "MaxHR", "ExerciseAngina", "Oldpeak", "ST_Slope",
];
const HEART_UNITS = {
  RestingBP: "mm Hg", Cholesterol: "mg/dl", MaxHR: "bpm", Oldpeak: "mm", Age: "yrs",
};

const TERRITORY_COLORS = { Anterior: "#3b82f6", Lateral: "#10b981", Inferior: "#f59e0b", Rhythm: "#ef4444" };
const ZONE_COLORS      = { QRS_zone: "#6366f1", ST_zone: "#f59e0b", Baseline_zone: "#10b981" };

// ── Collapsible Section ───────────────────────────────────────────────────────
const Section = ({ title, iconName, iconLib = "fa5", color, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={s.section}>
      <TouchableOpacity style={s.sectionHeader} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <View style={[s.iconCircle, { backgroundColor: color }]}>
          {iconLib === "mci"
            ? <MaterialCommunityIcons name={iconName} size={14} color="#fff" />
            : <FontAwesome5 name={iconName} size={12} color="#fff" />}
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18} color="#94a3b8"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>
      {open && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
};

// ── Distribution bar ──────────────────────────────────────────────────────────
const DistBar = ({ label, value, color }) => {
  const pct = Math.round(value * 100);
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.barPct, { color }]}>{pct}%</Text>
    </View>
  );
};

// ── Heart Risk body ───────────────────────────────────────────────────────────
const HeartBody = ({ item, cfg }) => {
  const recActions =
    item.riskLevel?.toLowerCase().includes("high")
      ? ["Aspirin (daily)", "Statins", "Beta-blockers", "Consult cardiologist immediately"]
      : item.riskLevel?.toLowerCase().includes("medium") || item.riskLevel?.toLowerCase().includes("abnormal")
      ? ["Aspirin (as needed)", "Lifestyle modifications", "Follow-up in 3 months"]
      : ["Maintain healthy lifestyle", "Regular exercise (30 min/day)", "Annual checkup"];

  const fields = HEART_FIELD_ORDER
    .filter(k => item.inputData[k] !== undefined && item.inputData[k] !== null)
    .map(k => ({
      key:  formatKey(k),
      val:  formatValue(k, item.inputData[k]),
      unit: HEART_UNITS[k] ?? "",
    }));

  const pairs = [];
  for (let i = 0; i < fields.length; i += 2)
    pairs.push(fields.slice(i, i + 2));

  return (
    <>
      <Section title="Clinical Parameters" iconName="stethoscope" color="#3b82f6" defaultOpen>
        {pairs.map((pair, pi) => (
          <View key={pi} style={s.gridRow}>
            {pair.map(f => (
              <View key={f.key} style={s.gridCell}>
                <Text style={s.gridKey}>{f.key}</Text>
                <Text style={s.gridVal}>
                  {f.val}
                  {f.unit ? <Text style={s.gridUnit}> {f.unit}</Text> : null}
                </Text>
              </View>
            ))}
            {pair.length === 1 && <View style={s.gridCell} />}
          </View>
        ))}
      </Section>

      <Section title="Recommended Actions" iconName="pills" color="#8b5cf6">
        {recActions.map((a, i) => (
          <View key={i} style={s.actionRow}>
            <View style={[s.actionDot, { backgroundColor: cfg.color }]} />
            <Text style={s.actionText}>{a}</Text>
          </View>
        ))}
      </Section>

      {!!item.inputData.transcript && (
        <Section title="Audio Transcript" iconName="microphone" color="#f59e0b">
          <Text style={s.transcriptText}>{item.inputData.transcript}</Text>
        </Section>
      )}
    </>
  );
};

// ── ECG body ──────────────────────────────────────────────────────────────────
const ECGBody = ({ item }) => {
  const d  = item.inputData;
  const td = d.territorial_distribution ?? {};
  const wz = d.waveform_zones ?? {};
  const ii = d.injury_indices ?? {};
  const dl = d.dominant_leads ?? [];
  const rankColors = ["#d97706", "#64748b", "#92400e", "#94a3b8", "#94a3b8"];

  return (
    <>
      <Section title="Clinical Interpretation" iconName="stethoscope" color="#3b82f6" defaultOpen>
        <Text style={s.interpretText}>{d.interpretation}</Text>
        <View style={s.pillRow}>
          <View style={[s.pill, { backgroundColor: "#dbeafe" }]}>
            <Text style={[s.pillText, { color: "#1d4ed8" }]}>
              Primary: {d.primary_territory}
            </Text>
          </View>
          <View style={[s.pill, { backgroundColor: "#ede9fe" }]}>
            <Text style={[s.pillText, { color: "#6d28d9" }]}>
              Dominant: {d.dominant_zone?.replace("_zone", "")}
            </Text>
          </View>
        </View>
      </Section>

      <Section title="Territorial Distribution" iconName="map-marker-alt" color="#f59e0b" defaultOpen>
        {Object.entries(td).map(([k, v]) => (
          <DistBar key={k} label={k} value={v} color={TERRITORY_COLORS[k] ?? "#64748b"} />
        ))}
      </Section>

      <Section title="Waveform Zone Analysis" iconName="chart-line" iconLib="mci" color="#6366f1" defaultOpen>
        {Object.entries(wz).map(([k, v]) => (
          <DistBar
            key={k}
            label={k.replace("_zone", "").replace("_", " ")}
            value={v}
            color={ZONE_COLORS[k] ?? "#64748b"}
          />
        ))}
      </Section>

      <Section title="Dominant Leads" iconName="chart-bar" color="#10b981" defaultOpen>
        {dl.map((lead, idx) => (
          <View key={idx} style={s.leadRow}>
            <View style={[s.rankBadge, { backgroundColor: rankColors[idx] + "25" }]}>
              <Text style={[s.rankText, { color: rankColors[idx] }]}>#{idx + 1}</Text>
            </View>
            <Text style={s.leadName}>{lead.lead}</Text>
            <View style={s.leadBarTrack}>
              <View style={[s.leadBarFill, {
                width: Math.max(Math.round(lead.score * 300), 8),
                backgroundColor: rankColors[idx],
              }]} />
            </View>
            <Text style={s.leadScore}>{lead.score.toFixed(4)}</Text>
          </View>
        ))}
      </Section>

      <Section title="Injury Pattern Indices" iconName="heart-broken" color="#ef4444">
        <View style={s.indicesRow}>
          <View style={[s.indexCard, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
            <Text style={s.indexLabel}>Acute Injury</Text>
            <Text style={[s.indexVal, { color: "#ef4444" }]}>
              {ii.acute_injury_index?.toFixed(4)}
            </Text>
          </View>
          <View style={[s.indexCard, { backgroundColor: "#f5f3ff", borderColor: "#c4b5fd" }]}>
            <Text style={s.indexLabel}>Chronic Remodel</Text>
            <Text style={[s.indexVal, { color: "#7c3aed" }]}>
              {ii.chronic_remodeling_index?.toFixed(4)}
            </Text>
          </View>
        </View>
        <View style={s.compareRow}>
          <MaterialCommunityIcons
            name={ii.acute_injury_index > ii.chronic_remodeling_index ? "trending-up" : "trending-down"}
            size={16}
            color={ii.acute_injury_index > ii.chronic_remodeling_index ? "#ef4444" : "#7c3aed"}
          />
          <Text style={s.compareText}>
            {ii.acute_injury_index > ii.chronic_remodeling_index
              ? "Acute injury pattern dominant"
              : "Chronic remodeling pattern dominant"}
          </Text>
        </View>
      </Section>
    </>
  );
};

// ── Unified Diagnosis Card ────────────────────────────────────────────────────
const DiagnosisCard = ({ item }) => {
  const cfg   = getRiskCfg(item.riskLevel);
  const isECG = isECGRecord(item.inputData);
  const pct   = (item.probability * 100).toFixed(1);
  const dateObj = new Date(item.date);

  return (
    <Animated.View entering={FadeInLeft} style={s.card}>
      {/* Coloured header */}
      <LinearGradient
        colors={[cfg.color, cfg.color + "bb"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.cardHeader}
      >
        <View style={s.cardHeaderLeft}>
          {/* Type tag */}
          <View style={s.cardTypeTag}>
            <MaterialCommunityIcons
              name={isECG ? "heart-pulse" : "stethoscope"}
              size={11} color={cfg.color}
            />
            <Text style={[s.cardTypeText, { color: cfg.color }]}>
              {isECG ? "ECG" : "Heart Risk"}
            </Text>
          </View>
          {/* Date + time */}
          <View style={s.cardDateRow}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={s.cardDate}>
              {dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
            <Text style={s.cardTime}>
              {dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>
        {/* Confidence bubble */}
        <View style={s.cardConfWrap}>
          <Text style={s.cardConfVal}>{pct}%</Text>
          <Text style={s.cardConfLabel}>confidence</Text>
        </View>
      </LinearGradient>

      {/* Risk badge */}
      <View style={[s.riskBadge, { backgroundColor: cfg.bg }]}>
        <FontAwesome5 name={cfg.icon} size={22} color={cfg.color} />
        <View style={{ flex: 1 }}>
          <Text style={[s.riskLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={s.riskSub}>{item.riskLevel} · {pct}% probability</Text>
        </View>
      </View>

      {isECG ? <ECGBody item={item} /> : <HeartBody item={item} cfg={cfg} />}
    </Animated.View>
  );
};

// ── Filter pill ───────────────────────────────────────────────────────────────
const FilterPill = ({ label, active, color, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[s.filterPill, active && { backgroundColor: color, borderColor: color }]}
  >
    <Text style={[s.filterPillText, active && { color: "#fff" }]}>{label}</Text>
  </TouchableOpacity>
);

const FILTERS = [
  { key: "all",        label: "All",        color: "#4f46e5" },
  { key: "High Risk",  label: "High Risk",  color: "#ef4444" },
  { key: "Low Risk",   label: "Low Risk",   color: "#10b981" },
  { key: "Abnormal",   label: "Abnormal",   color: "#f59e0b" },
  { key: "MI",         label: "MI",         color: "#dc2626" },
  { key: "History-MI", label: "History-MI", color: "#7c3aed" },
  { key: "Normal",     label: "Normal",     color: "#10b981" },
  { key: "ecg",        label: "ECG Only",   color: "#0ea5e9" },
  { key: "heart",      label: "Heart Only", color: "#f43f5e" },
];

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PatientHomeScreen({ route, navigation, onLogout }) {
  const { patientName } = route.params || {};

  const [list, setList]             = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [activeFilter, setFilter]   = useState("all");
  const [error, setError]           = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.get(
        `${BASE_URL}/api/patient/${encodeURIComponent(patientName)}/predictions`
      );
      const raw = res.data.data ?? [];
      const sorted = [...raw].sort((a, b) => new Date(b.date) - new Date(a.date));
      setList(sorted);
      setFiltered(sorted);
    } catch (e) {
      const detail =
        e?.response?.data?.data ||
        e?.response?.data?.message ||
        e.message ||
        "Failed to load records.";
      setError(detail);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientName]);

  useEffect(() => { if (patientName) fetchData(); }, [fetchData]);

  useEffect(() => {
    let temp = [...list];

    if (activeFilter === "ecg")        temp = temp.filter(p => isECGRecord(p.inputData));
    else if (activeFilter === "heart") temp = temp.filter(p => !isECGRecord(p.inputData));
    else if (activeFilter !== "all")   temp = temp.filter(p => p.riskLevel === activeFilter);

    temp.sort((a, b) =>
      sortNewest
        ? new Date(b.date) - new Date(a.date)
        : new Date(a.date) - new Date(b.date)
    );
    setFiltered(temp);
  }, [sortNewest, list, activeFilter]);

  const highCount  = list.filter(p => p.riskLevel === "High Risk").length;
  const ecgCount   = list.filter(p => isECGRecord(p.inputData)).length;
  const heartCount = list.filter(p => !isECGRecord(p.inputData)).length;

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={s.loadingText}>Loading records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchData} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <LinearGradient colors={["#f8fafc", "#ffffff"]} style={{ flex: 1 }}>

        {/* Header */}
        <LinearGradient colors={["#0F172A", "#1E3A8A", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.topBar}>
          <LinearGradient colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.07)"]} style={s.topBarIcon}>
            <Ionicons name="person" size={22} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={s.topBarTitle}>{patientName}</Text>
            <Text style={s.topBarSub}>Patient Health Records</Text>
          </View>
          <TouchableOpacity
            onPress={onLogout}
            style={s.logoutBtn}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="logout" size={15} color="#fff" />
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats */}
        <View style={s.stats}>
          <View style={[s.stat, { backgroundColor: "#dbeafe" }]}>
            <Text style={s.statNum}>{list.length}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={[s.stat, { backgroundColor: "#fef3c7" }]}>
            <Text style={s.statNum}>{highCount}</Text>
            <Text style={s.statLabel}>High Risk</Text>
          </View>
          <View style={[s.stat, { backgroundColor: "#f0fdf4" }]}>
            <Text style={s.statNum}>{ecgCount}</Text>
            <Text style={s.statLabel}>ECG</Text>
          </View>
          <View style={[s.stat, { backgroundColor: "#fdf4ff" }]}>
            <Text style={s.statNum}>{heartCount}</Text>
            <Text style={s.statLabel}>Heart</Text>
          </View>
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
        >
          {FILTERS.map(f => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={activeFilter === f.key}
              color={f.color}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>

        <View style={s.resultRow}>
          <Text style={s.resultCount}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity
            onPress={() => setSortNewest(v => !v)}
            style={s.sortToggle}
            activeOpacity={0.8}
          >
            <Ionicons name={sortNewest ? "arrow-down" : "arrow-up"} size={14} color="#fff" />
            <Text style={s.sortToggleText}>{sortNewest ? "Newest" : "Oldest"}</Text>
          </TouchableOpacity>
        </View>

        {/* Records */}
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => <DiagnosisCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[s.center, { marginTop: 60 }]}>
              <Ionicons name="document-outline" size={48} color="#94a3b8" />
              <Text style={s.loadingText}>No records match your filter</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              colors={["#4f46e5"]}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
            />
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: "#f8fafc" },
  center:         { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText:    { marginTop: 16, fontSize: 15, color: "#64748b", textAlign: "center" },
  errorText:      { marginTop: 16, fontSize: 14, color: "#ef4444", textAlign: "center", lineHeight: 22 },
  retryBtn:       { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, backgroundColor: "#4f46e5", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText:      { color: "#fff", fontSize: 15, fontWeight: "600" },

  // Top bar (DoctorHomeScreen style)
  topBar:         { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  topBarIcon:     { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  topBarTitle:    { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  topBarSub:      { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  logoutBtn:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  logoutText:     { color: "#fff", fontSize: 13, fontWeight: "600" },

  stats:          { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 14, marginTop: 14 },
  stat:           { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  statNum:        { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  statLabel:      { fontSize: 11, color: "#64748b", marginTop: 2 },

  filterPill:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  filterPillText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  resultRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8 },
  resultCount:    { fontSize: 12, color: "#94a3b8" },
  sortToggle:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#4f46e5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sortToggleText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Card
  card:           { backgroundColor: "#fff", borderRadius: 18, marginBottom: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  cardHeader:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  cardHeaderLeft: { flex: 1, gap: 4 },
  cardTypeTag:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  cardTypeText:   { fontSize: 10, fontWeight: "700" },
  cardDateRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  cardDate:       { fontSize: 13, color: "#fff", fontWeight: "600" },
  cardTime:       { fontSize: 11, color: "rgba(255,255,255,0.75)" },
  cardConfWrap:   { backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  cardConfVal:    { fontSize: 18, fontWeight: "800", color: "#fff" },
  cardConfLabel:  { fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: 1 },
  riskBadge:      { flexDirection: "row", alignItems: "center", gap: 12, margin: 12, padding: 14, borderRadius: 12 },
  riskLabel:      { fontSize: 16, fontWeight: "700" },
  riskSub:        { fontSize: 12, color: "#64748b", marginTop: 2 },

  // Section
  section:        { borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  sectionHeader:  { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  iconCircle:     { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionTitle:   { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  sectionBody:    { paddingHorizontal: 16, paddingBottom: 14 },

  // Heart grid
  gridRow:        { flexDirection: "row", gap: 10, marginBottom: 10 },
  gridCell:       { flex: 1, backgroundColor: "#f8fafc", borderRadius: 10, padding: 10 },
  gridKey:        { fontSize: 10, color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  gridVal:        { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  gridUnit:       { fontSize: 11, fontWeight: "400", color: "#64748b" },

  actionRow:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  actionDot:      { width: 7, height: 7, borderRadius: 3.5 },
  actionText:     { flex: 1, fontSize: 13, color: "#475569" },
  transcriptText: { fontSize: 13, color: "#475569", lineHeight: 20, fontStyle: "italic" },

  // Bars
  barRow:         { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  barLabel:       { width: 72, fontSize: 11, color: "#64748b", fontWeight: "600" },
  barTrack:       { flex: 1, height: 8, backgroundColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  barFill:        { height: "100%", borderRadius: 4 },
  barPct:         { width: 36, fontSize: 11, fontWeight: "700", textAlign: "right" },

  // ECG leads
  leadRow:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  rankBadge:      { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rankText:       { fontSize: 10, fontWeight: "700" },
  leadName:       { width: 56, fontSize: 12, fontWeight: "600", color: "#1e293b" },
  leadBarTrack:   { flex: 1, height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden" },
  leadBarFill:    { height: "100%", borderRadius: 3 },
  leadScore:      { width: 52, fontSize: 11, color: "#64748b", textAlign: "right" },

  // ECG interpretation
  interpretText:  { fontSize: 13, color: "#475569", lineHeight: 21, marginBottom: 10 },
  pillRow:        { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText:       { fontSize: 11, fontWeight: "600" },

  // Injury indices
  indicesRow:     { flexDirection: "row", gap: 10, marginBottom: 10 },
  indexCard:      { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1 },
  indexLabel:     { fontSize: 11, fontWeight: "600", color: "#64748b", marginBottom: 6, textAlign: "center" },
  indexVal:       { fontSize: 18, fontWeight: "800" },
  compareRow:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f8fafc", borderRadius: 10, padding: 10 },
  compareText:    { fontSize: 12, color: "#475569" },
});