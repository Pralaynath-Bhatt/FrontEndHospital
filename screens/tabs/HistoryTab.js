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

// ── Risk config ───────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  "High Risk":   { color: "#ef4444", bg: "#fef2f2", gradColors: ["#ef4444", "#dc2626"], icon: "heart-broken",        label: "High Risk"             },
  "Low Risk":    { color: "#10b981", bg: "#f0fdf4", gradColors: ["#10b981", "#059669"], icon: "heart",               label: "Low Risk"              },
  "Abnormal":    { color: "#f59e0b", bg: "#fffbeb", gradColors: ["#f59e0b", "#d97706"], icon: "exclamation-triangle", label: "Abnormal ECG"         },
  "MI":          { color: "#dc2626", bg: "#fef2f2", gradColors: ["#dc2626", "#b91c1c"], icon: "heartbeat",            label: "Myocardial Infarction" },
  "History-MI":  { color: "#7c3aed", bg: "#f5f3ff", gradColors: ["#7c3aed", "#6d28d9"], icon: "history",             label: "History of MI"         },
  "Normal":      { color: "#10b981", bg: "#f0fdf4", gradColors: ["#10b981", "#059669"], icon: "check-circle",         label: "Normal ECG"            },
};
const getRiskCfg = (r) =>
  RISK_CONFIG[r] ?? { color: "#64748b", bg: "#f8fafc", gradColors: ["#64748b", "#475569"], icon: "question-circle", label: r };

// ── Helpers ───────────────────────────────────────────────────────────────────
const isECGRecord = (inputData) =>
  inputData && "territorial_distribution" in inputData;

const HEART_FIELD_ORDER = [
  "Age", "Sex", "ChestPainType", "RestingBP", "Cholesterol",
  "FastingBS", "RestingECG", "MaxHR", "ExerciseAngina", "Oldpeak", "ST_Slope",
];
const HEART_UNITS = {
  RestingBP: "mm Hg", Cholesterol: "mg/dl", MaxHR: "bpm", Oldpeak: "mm", Age: "yrs",
};
const formatKey = (k) => k.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
const formatValue = (k, v) => {
  if (k === "Sex")            return v === "M" ? "Male" : "Female";
  if (k === "FastingBS")      return v === 1   ? "High (>120 mg/dl)" : "Normal";
  if (k === "ExerciseAngina") return v === "Y" ? "Yes" : "No";
  if (k === "ChestPainType") {
    return { TA: "Typical Angina", ATA: "Atypical Angina", NAP: "Non-Anginal Pain", ASY: "Asymptomatic" }[v] ?? v;
  }
  if (k === "RestingECG") {
    return { Normal: "Normal", ST: "ST-T Abnormality", LVH: "Left Ventricular Hypertrophy" }[v] ?? v;
  }
  return String(v);
};

const TERRITORY_COLORS = { Anterior: "#3b82f6", Lateral: "#10b981", Inferior: "#f59e0b", Rhythm: "#ef4444" };
const ZONE_COLORS      = { QRS_zone: "#6366f1", ST_zone: "#f59e0b", Baseline_zone: "#10b981" };

const getHeartActions = (riskLevel) => {
  if (riskLevel?.toLowerCase().includes("high"))
    return ["Aspirin (daily)", "Statins", "Beta-blockers", "Consult cardiologist immediately"];
  if (riskLevel?.toLowerCase().includes("medium") || riskLevel?.toLowerCase().includes("abnormal"))
    return ["Aspirin (as needed)", "Lifestyle modifications", "Follow-up in 3 months"];
  return ["Maintain healthy lifestyle", "Regular exercise (30 min/day)", "Annual checkup"];
};

// ── Collapsible Section ───────────────────────────────────────────────────────
const Section = ({ title, iconName, iconLib = "fa5", color, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={s.sectionWrap}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen(v => !v)} style={s.sectionHeader}>
        <View style={[s.sectionIconBg, { backgroundColor: color + "22" }]}>
          {iconLib === "mci"
            ? <MaterialCommunityIcons name={iconName} size={14} color={color} />
            : <FontAwesome5 name={iconName} size={12} color={color} />}
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={17} color={C.textMuted} style={{ marginLeft: "auto" }} />
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
const HeartBody = ({ inputData, riskLevel, cfg }) => {
  const fields = HEART_FIELD_ORDER
    .filter(k => inputData[k] !== undefined && inputData[k] !== null)
    .map(k => ({
      key:  formatKey(k),
      val:  formatValue(k, inputData[k]),
      unit: HEART_UNITS[k] ?? "",
    }));

  const pairs = [];
  for (let i = 0; i < fields.length; i += 2) pairs.push(fields.slice(i, i + 2));

  const actions = getHeartActions(riskLevel);

  return (
    <>
      <Section title="Clinical Parameters" iconName="stethoscope" color="#3b82f6" defaultOpen>
        {pairs.map((pair, pi) => (
          <View key={pi} style={s.gridRow}>
            {pair.map(f => (
              <View key={f.key} style={s.gridCell}>
                <Text style={s.gridKey}>{f.key}</Text>
                <Text style={s.gridVal}>
                  {f.val}{f.unit ? <Text style={s.gridUnit}> {f.unit}</Text> : null}
                </Text>
              </View>
            ))}
            {pair.length === 1 && <View style={s.gridCell} />}
          </View>
        ))}
      </Section>

      <Section title="Recommended Actions" iconName="pills" color="#8b5cf6">
        {actions.map((a, i) => (
          <View key={i} style={s.listRow}>
            <View style={[s.dot, { backgroundColor: cfg.color }]} />
            <Text style={s.listText}>{a}</Text>
          </View>
        ))}
      </Section>

      {!!inputData.transcript && (
        <Section title="Audio Transcript" iconName="microphone" color="#f59e0b">
          <Text style={[s.listText, { fontStyle: "italic" }]}>{inputData.transcript}</Text>
        </Section>
      )}
    </>
  );
};

// ── ECG body ──────────────────────────────────────────────────────────────────
const ECGBody = ({ inputData }) => {
  const td = inputData.territorial_distribution ?? {};
  const wz = inputData.waveform_zones ?? {};
  const ii = inputData.injury_indices ?? {};
  const dl = inputData.dominant_leads ?? [];
  const rankColors = ["#d97706", "#64748b", "#92400e", "#94a3b8", "#94a3b8"];

  return (
    <>
      <Section title="Clinical Interpretation" iconName="stethoscope" color="#3b82f6" defaultOpen>
        <Text style={s.interpretText}>{inputData.interpretation}</Text>
        <View style={s.pillRow}>
          <View style={[s.pill, { backgroundColor: "#dbeafe" }]}>
            <Text style={[s.pillText, { color: "#1d4ed8" }]}>Primary: {inputData.primary_territory}</Text>
          </View>
          <View style={[s.pill, { backgroundColor: "#ede9fe" }]}>
            <Text style={[s.pillText, { color: "#6d28d9" }]}>
              Dominant: {inputData.dominant_zone?.replace("_zone", "")}
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
                width: Math.max(Math.round(lead.score * 280), 8),
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

// ── Unified Record Card ───────────────────────────────────────────────────────
const RecordCard = ({ item }) => {
  const cfg    = getRiskCfg(item.riskLevel);
  const isECG  = isECGRecord(item.inputData);
  const pct    = (item.probability * 100).toFixed(1);
  const dateObj = new Date(item.date);

  return (
    <AnimatedRN.View style={s.card} entering={FadeInLeft.duration(500)}>
      {/* Coloured header */}
      <LinearGradient
        colors={cfg.gradColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.cardHeader}
      >
        <View style={s.cardHeaderLeft}>
          {/* Type tag */}
          <View style={s.typeTag}>
            <MaterialCommunityIcons
              name={isECG ? "heart-pulse" : "stethoscope"}
              size={11} color={cfg.color}
            />
            <Text style={[s.typeTagText, { color: cfg.color }]}>
              {isECG ? "ECG" : "Heart Risk"}
            </Text>
          </View>
          {/* Date + time */}
          <View style={s.dateRow}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={s.dateText}>
              {dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
            <Text style={s.timeText}>
              {dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>
        {/* Confidence bubble */}
        <View style={s.confWrap}>
          <Text style={s.confVal}>{pct}%</Text>
          <Text style={s.confLabel}>confidence</Text>
        </View>
      </LinearGradient>

      {/* Risk badge */}
      <View style={[s.riskBadge, { backgroundColor: cfg.bg }]}>
        <FontAwesome5 name={cfg.icon} size={20} color={cfg.color} />
        <View style={{ flex: 1 }}>
          <Text style={[s.riskLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={s.riskSub}>{item.riskLevel} · {pct}% probability</Text>
        </View>
      </View>

      {/* Body */}
      <View style={s.cardBody}>
        {isECG
          ? <ECGBody inputData={item.inputData} />
          : <HeartBody inputData={item.inputData} riskLevel={item.riskLevel} cfg={cfg} />}
      </View>
    </AnimatedRN.View>
  );
};

const renderItem = ({ item }) => <RecordCard item={item} />;

// ── Main HistoryTab ───────────────────────────────────────────────────────────
export default function HistoryTab() {
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [records, setRecords]       = useState([]);
  const [searched, setSearched]     = useState(false);
  const [activeFilter, setFilter]   = useState("all");

  const dismissError = useCallback(() => setError(null), []);

  const handleSearch = useCallback(async () => {
    const name = searchText.trim();
    if (!name) {
      setError({ type: "general", message: "Please enter a patient name to search." });
      return;
    }
    setLoading(true); setError(null); setRecords([]); setSearched(true); setFilter("all");
    try {
      const response = await axios.get(
        `${BASE_URL}/api/patient/${encodeURIComponent(name)}/predictions`,
        { headers: { "ngrok-skip-browser-warning": "true" }, timeout: 15000 }
      );
      const raw = response.data?.data ?? response.data ?? [];
      const data = Array.isArray(raw) ? raw : [];
      const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(sorted);
      if (sorted.length === 0)
        setError({ type: "general", message: `No records found for "${name}".` });
    } catch (err) {
      const detail = err?.response?.data?.data || err?.response?.data?.message || null;
      if (err.response?.status === 404)
        setError({ type: "general", message: `No records found for "${name}".` });
      else if (err.code === "ECONNABORTED")
        setError({ type: "general", message: "Request timed out. Please try again." });
      else
        setError({ type: parseApiError(err).type, message: detail || parseApiError(err).message });
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  // Filter options derived from fetched records
  const FILTERS = [
    { key: "all",        label: "All"        },
    { key: "High Risk",  label: "High Risk"  },
    { key: "Low Risk",   label: "Low Risk"   },
    { key: "Abnormal",   label: "Abnormal"   },
    { key: "MI",         label: "MI"         },
    { key: "History-MI", label: "History-MI" },
    { key: "Normal",     label: "Normal"     },
    { key: "ecg",        label: "ECG Only"   },
    { key: "heart",      label: "Heart Only" },
  ];

  const filtered = records.filter(p => {
    if (activeFilter === "all")        return true;
    if (activeFilter === "ecg")        return isECGRecord(p.inputData);
    if (activeFilter === "heart")      return !isECGRecord(p.inputData);
    return p.riskLevel === activeFilter;
  });

  // Summary counts
  const highCount  = records.filter(p => p.riskLevel === "High Risk").length;
  const ecgCount   = records.filter(p => isECGRecord(p.inputData)).length;
  const heartCount = records.filter(p => !isECGRecord(p.inputData)).length;

  return (
    <ScrollView
      contentContainerStyle={{ padding: isWeb ? 28 : 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: C.bg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[{ flex: 1 }, isWeb && { width: 780, alignSelf: "center" }]}>

        {/* ── Search card ── */}
        <SectionCard>
          <SectionHeading icon="history" title="Patient History"
            subtitle="Search past predictions and ECG records" color={C.green} />
          <Divider />
          <View style={s.searchRow}>
            <View style={s.searchInputWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[s.searchInput, { outlineStyle: "none" }]}
                placeholder="Enter patient name..."
                placeholderTextColor={C.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                editable={!loading}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => {
                  setSearchText(""); setRecords([]); setError(null); setSearched(false); setFilter("all");
                }}>
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

        {/* ── Loading ── */}
        {loading && (
          <View style={s.stateBox}>
            <ActivityIndicator size="large" color={C.green} />
            <Text style={s.stateText}>Searching patient history...</Text>
          </View>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <View style={{ marginTop: 8 }}>
            <ErrorCard error={error} onDismiss={dismissError} />
            <TouchableOpacity onPress={handleSearch} style={[s.retryBtn, { marginTop: 10, alignSelf: "center" }]}>
              <Text style={s.retryBtnText}>Retry Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && !searched && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="account-search-outline" size={52} color={C.textMuted} />
            <Text style={s.emptyStateTitle}>Search Patient Records</Text>
            <Text style={s.emptyStateSubtitle}>
              Enter a patient name above to view their past heart risk predictions and ECG diagnoses.
            </Text>
          </View>
        )}

        {/* ── Results ── */}
        {!loading && !error && records.length > 0 && (
          <>
            {/* Stats */}
            <View style={s.statsRow}>
              <View style={[s.stat, { backgroundColor: "#dbeafe" }]}>
                <Text style={s.statNum}>{records.length}</Text>
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
              {FILTERS.map(f => {
                const cfg = getRiskCfg(f.key);
                const active = activeFilter === f.key;
                const pillColor = f.key === "all" ? C.blue
                  : f.key === "ecg" ? "#0ea5e9"
                  : f.key === "heart" ? "#f43f5e"
                  : cfg.color;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    activeOpacity={0.8}
                    style={[s.filterPill, active && { backgroundColor: pillColor, borderColor: pillColor }]}
                  >
                    <Text style={[s.filterPillText, active && { color: "#fff" }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={s.resultsCount}>
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              {activeFilter !== "all" ? ` · filtered by "${activeFilter}"` : ""}
            </Text>

            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={(item, i) => `${item.date}-${i}`}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={[s.stateBox, { paddingVertical: 24 }]}>
                  <MaterialCommunityIcons name="filter-remove-outline" size={40} color={C.textMuted} />
                  <Text style={s.stateText}>No records match this filter</Text>
                </View>
              }
            />
          </>
        )}

      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Search
  searchRow:       { flexDirection: "row", alignItems: "center", gap: 10 },
  searchInputWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceBlu, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, minHeight: 50 },
  searchInput:     { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 12 },
  searchBtn:       { borderRadius: 12, overflow: "hidden" },
  searchBtnInner:  { width: 50, height: 50, alignItems: "center", justifyContent: "center" },

  // States
  stateBox:           { alignItems: "center", paddingVertical: 40, gap: 12 },
  stateText:          { color: C.textSecond, fontSize: 15, textAlign: "center", lineHeight: 22 },
  retryBtn:           { backgroundColor: C.blueGhost, borderWidth: 1.5, borderColor: C.bluePale, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText:       { color: C.blue, fontWeight: "700", fontSize: 14 },
  emptyState:         { alignItems: "center", paddingVertical: 52, gap: 10 },
  emptyStateTitle:    { fontSize: 17, fontWeight: "700", color: C.textSecond },
  emptyStateSubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center", maxWidth: 300, lineHeight: 20 },

  // Stats
  statsRow:  { flexDirection: "row", gap: 10, marginTop: 14 },
  stat:      { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  statNum:   { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  statLabel: { fontSize: 11, color: "#64748b", marginTop: 2 },

  // Filters
  filterPill:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  filterPillText: { fontSize: 12, fontWeight: "600", color: C.textSecond },
  resultsCount:   { fontSize: 12, color: C.textMuted, marginBottom: 8 },

  // Card
  card:           { backgroundColor: C.surface, borderRadius: 18, marginBottom: 14, overflow: "hidden", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardHeader:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  cardHeaderLeft: { flex: 1, gap: 4 },
  typeTag:        { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeTagText:    { fontSize: 10, fontWeight: "700" },
  dateRow:        { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText:       { fontSize: 13, color: "#fff", fontWeight: "600" },
  timeText:       { fontSize: 11, color: "rgba(255,255,255,0.75)" },
  confWrap:       { backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  confVal:        { fontSize: 18, fontWeight: "800", color: "#fff" },
  confLabel:      { fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: 1 },
  riskBadge:      { flexDirection: "row", alignItems: "center", gap: 12, margin: 12, padding: 14, borderRadius: 12 },
  riskLabel:      { fontSize: 15, fontWeight: "700" },
  riskSub:        { fontSize: 12, color: C.textMuted, marginTop: 2 },
  cardBody:       { paddingBottom: 4 },

  // Sections
  sectionWrap:   { borderTopWidth: 1, borderTopColor: C.border },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  sectionIconBg: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle:  { fontSize: 13, fontWeight: "700", color: C.textPrimary, flex: 1 },
  sectionBody:   { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },

  // Heart grid
  gridRow:   { flexDirection: "row", gap: 10, marginBottom: 10 },
  gridCell:  { flex: 1, backgroundColor: C.surfaceBlu, borderRadius: 10, padding: 10 },
  gridKey:   { fontSize: 10, color: C.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  gridVal:   { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  gridUnit:  { fontSize: 11, fontWeight: "400", color: C.textSecond },

  listRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 6, gap: 8 },
  dot:       { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  listText:  { fontSize: 13, color: C.textSecond, flex: 1, lineHeight: 20 },

  // Bars
  barRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  barLabel: { width: 72, fontSize: 11, color: C.textSecond, fontWeight: "600" },
  barTrack: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" },
  barFill:  { height: "100%", borderRadius: 4 },
  barPct:   { width: 36, fontSize: 11, fontWeight: "700", textAlign: "right" },

  // ECG leads
  leadRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  rankBadge:    { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rankText:     { fontSize: 10, fontWeight: "700" },
  leadName:     { width: 56, fontSize: 12, fontWeight: "600", color: C.textPrimary },
  leadBarTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  leadBarFill:  { height: "100%", borderRadius: 3 },
  leadScore:    { width: 52, fontSize: 11, color: C.textSecond, textAlign: "right" },

  // ECG interpretation
  interpretText: { fontSize: 13, color: C.textSecond, lineHeight: 21, marginBottom: 10 },
  pillRow:       { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText:      { fontSize: 11, fontWeight: "600" },

  // Injury indices
  indicesRow:  { flexDirection: "row", gap: 10, marginBottom: 10 },
  indexCard:   { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1 },
  indexLabel:  { fontSize: 11, fontWeight: "600", color: C.textSecond, marginBottom: 6, textAlign: "center" },
  indexVal:    { fontSize: 18, fontWeight: "800" },
  compareRow:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surfaceBlu, borderRadius: 10, padding: 10 },
  compareText: { fontSize: 12, color: C.textSecond },
});