// tabs/ECGTab.jsx
import React, { useState, useRef, useCallback, memo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Animated, Dimensions, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AnimatedRN from "react-native-reanimated";

import { C, G } from "../Constraint";
import {
  SectionCard, SectionHeading, FloatingInput,
  PrimaryButton, Divider, ErrorCard, parseApiError,
} from "./SharedComponents";
import BASE_URL from "../Config";
import apiClient from "../Apiclient";

const { width } = Dimensions.get("window");
const isWeb = width > 900;

const ECG_DIAGNOSIS_CONFIG = {
  Normal:       { colors: G.green,  label: "Normal"                },
  Abnormal:     { colors: G.amber,  label: "Abnormal"              },
  "MI":         { colors: G.red,    label: "Myocardial Infarction" },
  "History-MI": { colors: G.purple, label: "History of MI"         },
};

const TERRITORY_COLORS = { Anterior: C.blue, Lateral: C.green, Inferior: C.amber, Rhythm: C.red };
const ZONE_COLORS = { QRS_zone: C.blue, ST_zone: C.amber, Baseline_zone: C.green };

// ─── Sub-components ───────────────────────────────────────────────────────────

const ECGResultSection = memo(({ title, icon, iconColor, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={s.resultSection}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen(v => !v)} style={s.resultSectionHeader}>
        <View style={[s.resultIconBg, { backgroundColor: iconColor + "20" }]}>
          <MaterialCommunityIcons name={icon} size={15} color={iconColor} />
        </View>
        <Text style={s.resultSectionTitle}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={17} color={C.textMuted} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
      {open && <View style={s.resultSectionBody}>{children}</View>}
    </View>
  );
});

const ECGTerritoryBar = memo(({ label, value, color }) => {
  const pct = Math.round(value * 100);
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.barValue, { color }]}>{pct}%</Text>
    </View>
  );
});

const ECGZonePill = memo(({ label, value, color, dominant }) => (
  <View style={[s.zonePill, dominant && { borderColor: color, borderWidth: 1.5, backgroundColor: color + "15" }]}>
    <View style={[s.zoneDot, { backgroundColor: color }]} />
    <View style={{ flex: 1 }}>
      <Text style={s.zoneLabel}>{label}</Text>
      <Text style={[s.zoneValue, { color }]}>{Math.round(value * 100)}%</Text>
    </View>
    {dominant && (
      <View style={[s.dominantBadge, { backgroundColor: color }]}>
        <Text style={s.dominantBadgeText}>PRIMARY</Text>
      </View>
    )}
  </View>
));

const ECGLeadItem = memo(({ lead, score, rank }) => {
  const rankColors = ["#D97706", "#64748B", "#92400E", C.textMuted, C.textMuted];
  return (
    <View style={s.leadRow}>
      <View style={[s.rankBadge, { backgroundColor: rankColors[rank] + "20", borderColor: rankColors[rank] + "60", borderWidth: 1 }]}>
        <Text style={[s.rankText, { color: rankColors[rank] }]}>#{rank + 1}</Text>
      </View>
      <Text style={s.leadName}>{lead}</Text>
      <View style={s.leadBarTrack}>
        <LinearGradient colors={G.blue} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[s.leadBarFill, { width: Math.max(Math.round(score * 260), 10) }]} />
      </View>
      <Text style={s.leadScore}>{score.toFixed(4)}</Text>
    </View>
  );
});

// ─── Main ECGTab ──────────────────────────────────────────────────────────────

export default function ECGTab() {
  const [ecgPatientName, setEcgPatientName] = useState("");
  const [ecgImage, setEcgImage]             = useState(null);
  const [ecgLoading, setEcgLoading]         = useState(false);
  const [ecgResult, setEcgResult]           = useState(null);
  const [ecgError, setEcgError]             = useState(null);
  const ecgPulseAnim                        = useRef(new Animated.Value(1)).current;

  const dismissError = useCallback(() => setEcgError(null), []);

  const startPulse = useCallback(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(ecgPulseAnim, { toValue: 1.03, duration: 700, useNativeDriver: true }),
      Animated.timing(ecgPulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
    ])).start();
  }, [ecgPulseAnim]);

  const stopPulse = useCallback(() => {
    ecgPulseAnim.stopAnimation();
    Animated.timing(ecgPulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [ecgPulseAnim]);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { setEcgError({ type: "general", message: "Please allow photo library access." }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 1 });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setEcgImage({ uri: asset.uri, name: asset.fileName || asset.uri.split("/").pop() || `ecg_${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" });
      setEcgResult(null); setEcgError(null);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { setEcgError({ type: "general", message: "Please allow camera access." }); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setEcgImage({ uri: asset.uri, name: asset.fileName || `ecg_photo_${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" });
      setEcgResult(null); setEcgError(null);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!ecgPatientName.trim()) { setEcgError({ type: "general", message: "Please enter the patient name." }); return; }
    if (!ecgImage) { setEcgError({ type: "general", message: "Please select or capture an ECG image." }); return; }
    setEcgLoading(true); setEcgError(null); setEcgResult(null); startPulse();
    try {
      const data = new FormData();
      data.append("patientName", ecgPatientName.trim());
      const isWebPlatform = typeof document !== "undefined";
      if (isWebPlatform) {
        const blob = await (await fetch(ecgImage.uri)).blob();
        data.append("ecgImage", new File([blob], ecgImage.name, { type: ecgImage.type || "image/jpeg" }));
      } else {
        data.append("ecgImage", { uri: ecgImage.uri, name: ecgImage.name, type: ecgImage.type || "image/jpeg" });
      }
      const response = await apiClient.post(`${BASE_URL}:8080/api/ecg/predict`, data, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 60000, transformRequest: (d) => d,
      });
      if (response.status === 200 && response.data) setEcgResult(response.data?.data ?? response.data);
      else setEcgError({ type: "general", message: "Unexpected response from ECG server." });
    } catch (err) {
      setEcgError(parseApiError(err));
    } finally {
      setEcgLoading(false); stopPulse();
    }
  }, [ecgPatientName, ecgImage, startPulse, stopPulse]);

  const ecgDiagConfig = ecgResult
    ? (ECG_DIAGNOSIS_CONFIG[ecgResult.diagnosis] ?? ECG_DIAGNOSIS_CONFIG["Abnormal"])
    : null;

  return (
    <ScrollView
      contentContainerStyle={{ padding: isWeb ? 28 : 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: C.bg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[{ flex: 1 }, isWeb && { width: 780, alignSelf: "center" }]}>

        <SectionCard>
          <SectionHeading icon="waveform" title="ECG Image Analysis" subtitle="AI-powered ECG diagnosis from image" color={C.cyan} />
          <Divider />

          <FloatingInput label="Patient Name" icon="account" value={ecgPatientName}
            onChangeText={setEcgPatientName} placeholder="e.g. John Doe" editable={!ecgLoading} />

          <View style={s.uploadRow}>
            <TouchableOpacity style={[s.uploadBtn, { flex: 1 }]} onPress={pickImage} disabled={ecgLoading} activeOpacity={0.8}>
              <View style={s.uploadBtnInner}>
                <MaterialCommunityIcons name="image-plus" size={22} color={C.blue} />
                <Text style={s.uploadBtnText}>Gallery</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.uploadBtn, { flex: 1 }]} onPress={takePhoto} disabled={ecgLoading} activeOpacity={0.8}>
              <View style={s.uploadBtnInner}>
                <MaterialCommunityIcons name="camera-plus" size={22} color={C.cyan} />
                <Text style={s.uploadBtnText}>Camera</Text>
              </View>
            </TouchableOpacity>
          </View>

          {ecgImage ? (
            <View style={s.previewWrap}>
              <Image source={{ uri: ecgImage.uri }} style={s.previewImg} resizeMode="contain" />
              <View style={s.previewFooter}>
                <MaterialCommunityIcons name="check-circle" size={15} color={C.green} />
                <Text style={s.previewFileName} numberOfLines={1}>{ecgImage.name}</Text>
              </View>
            </View>
          ) : (
            <View style={s.emptyPreview}>
              <MaterialCommunityIcons name="file-image-outline" size={44} color={C.textMuted} />
              <Text style={s.emptyPreviewText}>No ECG image selected</Text>
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: ecgPulseAnim }], marginTop: 14 }}>
            <PrimaryButton label="Analyze ECG" icon="heart-pulse" onPress={handleAnalyze}
              loading={ecgLoading} disabled={ecgLoading || !ecgImage || !ecgPatientName.trim()} gradient={G.teal} />
          </Animated.View>

          {ecgError ? <ErrorCard error={ecgError} onDismiss={dismissError} /> : null}
        </SectionCard>

        {/* ── ECG Results ── */}
        {ecgResult && ecgDiagConfig ? (
          <View style={{ marginTop: 16 }}>
            <LinearGradient colors={ecgDiagConfig.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.diagBanner}>
              <View style={{ flex: 1 }}>
                <Text style={s.diagLabel}>DIAGNOSIS</Text>
                <Text style={s.diagName}>{ecgResult.diagnosis}</Text>
                <Text style={s.diagFullName}>{ecgDiagConfig.label}</Text>
              </View>
              <View style={s.diagConfidWrap}>
                <Text style={s.diagConfidValue}>{ecgResult.confidence?.toFixed(1)}%</Text>
                <Text style={s.diagConfidLabel}>Confidence</Text>
              </View>
            </LinearGradient>

            <View style={s.patientRow}>
              <MaterialCommunityIcons name="account-circle" size={15} color={C.blue} />
              <Text style={s.patientRowText}>
                Patient: <Text style={{ color: C.textPrimary, fontWeight: "700" }}>{ecgPatientName}</Text>
              </Text>
            </View>

            <SectionCard>
              <ECGResultSection title="Clinical Interpretation" icon="stethoscope" iconColor={C.blue} defaultOpen>
                <Text style={s.interpretText}>{ecgResult.interpretation}</Text>
              </ECGResultSection>
              <ECGResultSection title="Territorial Distribution" icon="map-marker-radius" iconColor={C.amber} defaultOpen>
                <Text style={s.primaryTerr}>
                  Primary: <Text style={{ color: TERRITORY_COLORS[ecgResult.primaryTerritory] ?? C.textPrimary, fontWeight: "700" }}>
                    {ecgResult.primaryTerritory}
                  </Text>
                </Text>
                {ecgResult.territorialDistribution &&
                  Object.entries(ecgResult.territorialDistribution).map(([k, v]) => (
                    <ECGTerritoryBar key={k} label={k} value={v} color={TERRITORY_COLORS[k] ?? C.blue} />
                  ))}
              </ECGResultSection>
              <ECGResultSection title="Dominant Leads" icon="chart-bar" iconColor={C.green} defaultOpen>
                {ecgResult.dominantLeads?.map((item, idx) => (
                  <ECGLeadItem key={idx} lead={item.lead} score={item.score} rank={idx} />
                ))}
              </ECGResultSection>
              <ECGResultSection title="Waveform Zone Analysis" icon="wave" iconColor={C.purple} defaultOpen>
                <View style={s.zoneGrid}>
                  {ecgResult.waveformZones &&
                    Object.entries(ecgResult.waveformZones).map(([zone, val]) => (
                      <ECGZonePill key={zone}
                        label={zone.replace("_zone", "").replace("_", " ")}
                        value={val} color={ZONE_COLORS[zone] ?? C.blue}
                        dominant={zone === ecgResult.dominantZone} />
                    ))}
                </View>
              </ECGResultSection>
              <ECGResultSection title="Injury Pattern Indices" icon="heart-broken" iconColor={C.red}>
                <View style={s.indicesRow}>
                  <View style={[s.indexCard, { backgroundColor: C.redLight, borderColor: C.red + "40" }]}>
                    <Text style={s.indexTitle}>Acute Injury</Text>
                    <Text style={[s.indexValue, { color: C.red }]}>
                      {ecgResult.injuryIndices?.acute_injury_index?.toFixed(4)}
                    </Text>
                  </View>
                  <View style={[s.indexCard, { backgroundColor: C.purpleLight, borderColor: C.purple + "40" }]}>
                    <Text style={s.indexTitle}>Chronic Remodel</Text>
                    <Text style={[s.indexValue, { color: C.purple }]}>
                      {ecgResult.injuryIndices?.chronic_remodeling_index?.toFixed(4)}
                    </Text>
                  </View>
                </View>
                <View style={s.compareRow}>
                  <MaterialCommunityIcons
                    name={ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index ? "trending-up" : "trending-down"}
                    size={16}
                    color={ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index ? C.red : C.purple}
                  />
                  <Text style={s.compareText}>
                    {ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index
                      ? "Acute injury pattern dominant" : "Chronic remodeling pattern dominant"}
                  </Text>
                </View>
              </ECGResultSection>
            </SectionCard>
          </View>
        ) : null}

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  uploadRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  uploadBtn: { borderRadius: 12, borderWidth: 1.5, borderColor: C.border, overflow: "hidden" },
  uploadBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, backgroundColor: C.surfaceAlt },
  uploadBtnText: { color: C.textPrimary, fontWeight: "600", fontSize: 14 },
  previewWrap: { borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: C.blue + "50", marginBottom: 4 },
  previewImg: { width: "100%", height: 220, backgroundColor: C.surfaceBlu },
  previewFooter: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, backgroundColor: C.greenLight },
  previewFileName: { color: C.green, fontSize: 12, flex: 1, fontWeight: "600" },
  emptyPreview: { height: 100, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.bluePale, marginBottom: 4, backgroundColor: C.blueGhost },
  emptyPreviewText: { color: C.textMuted, fontSize: 13 },
  diagBanner: { borderRadius: 16, padding: 22, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  diagLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 2.5, fontWeight: "700" },
  diagName: { fontSize: 26, fontWeight: "800", color: "#fff", marginTop: 3 },
  diagFullName: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 },
  diagConfidWrap: { backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" },
  diagConfidValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  diagConfidLabel: { fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5, marginTop: 2 },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.blueGhost, borderRadius: 10, padding: 11, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  patientRowText: { color: C.textSecond, fontSize: 13 },
  resultSection: { borderBottomWidth: 1, borderBottomColor: C.border },
  resultSectionHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  resultIconBg: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  resultSectionTitle: { fontSize: 13, fontWeight: "700", color: C.textPrimary },
  resultSectionBody: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2 },
  interpretText: { color: C.textSecond, fontSize: 13, lineHeight: 22 },
  primaryTerr: { color: C.textSecond, fontSize: 12, marginBottom: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  barLabel: { width: 64, color: C.textSecond, fontSize: 11, fontWeight: "600" },
  barTrack: { flex: 1, height: 7, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barValue: { width: 34, fontSize: 11, fontWeight: "700", textAlign: "right" },
  leadRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 10, fontWeight: "700" },
  leadName: { width: 52, color: C.textPrimary, fontSize: 12, fontWeight: "600" },
  leadBarTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  leadBarFill: { height: "100%", borderRadius: 3 },
  leadScore: { width: 50, color: C.textSecond, fontSize: 11, textAlign: "right" },
  zoneGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  zonePill: { flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10, gap: 8, borderWidth: 1, borderColor: C.border, minWidth: 110, flex: 1 },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneLabel: { color: C.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  zoneValue: { fontSize: 15, fontWeight: "700" },
  dominantBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, marginLeft: "auto" },
  dominantBadgeText: { color: "#fff", fontSize: 7, fontWeight: "800", letterSpacing: 0.8 },
  indicesRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  indexCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1 },
  indexTitle: { color: C.textSecond, fontSize: 11, fontWeight: "600", marginBottom: 6, textAlign: "center" },
  indexValue: { fontSize: 18, fontWeight: "800" },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10 },
  compareText: { color: C.textSecond, fontSize: 12 },
});