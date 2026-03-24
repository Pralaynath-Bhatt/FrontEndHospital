// tabs/ECGTab.jsx
import React, { useState, useRef, useCallback, memo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Animated, Dimensions, ActivityIndicator, Alert, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";

import { C, G } from "../Constraint";
import {
  SectionCard, SectionHeading, FloatingInput,
  PrimaryButton, Divider, ErrorCard, parseApiError,
} from "./SharedComponents";
import BASE_URL from "../Config";
import apiClient from "../Apiclient";

const { width, height } = Dimensions.get("window");
const isWeb = width > 900;

const ECG_DIAGNOSIS_CONFIG = {
  Normal:       { colors: G.green,  label: "Normal"                },
  Abnormal:     { colors: G.amber,  label: "Abnormal"              },
  "MI":         { colors: G.red,    label: "Myocardial Infarction" },
  "History-MI": { colors: G.purple, label: "History of MI"         },
};

const TERRITORY_COLORS = { Anterior: C.blue, Lateral: C.green, Inferior: C.amber, Rhythm: C.red };
const ZONE_COLORS      = { QRS_zone: C.blue, ST_zone: C.amber, Baseline_zone: C.green };

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

// ─── PDF Report Card ──────────────────────────────────────────────────────────

export const PdfReportCard = memo(({ ecgImage, patientName, ecgResult, onError }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const generateAndDownload = useCallback(async () => {
    if (!ecgImage || !patientName.trim()) return;
    try {
      setPdfLoading(true);
      setDownloaded(false);

      const formData = new FormData();
      formData.append("patientName", patientName.trim());

      if (Platform.OS === "web") {
        const blob = await (await fetch(ecgImage.uri)).blob();
        formData.append("ecgImages", new File([blob], ecgImage.name, { type: ecgImage.type || "image/jpeg" }));
      } else {
        formData.append("ecgImages", {
          uri:  ecgImage.uri,
          name: ecgImage.name,
          type: ecgImage.type || "image/jpeg",
        });
      }

      const response = await apiClient.post(
        `${BASE_URL}/api/ecg/predict/pdf`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 90000 }
      );

      const outer = response.data;
      const inner = outer?.data || outer;

      if (!inner?.base64Pdf) {
        onError({ type: "general", message: inner?.message || "PDF generation failed — no data returned." });
        return;
      }

      const { base64Pdf, fileName } = inner;
      const safeFileName = fileName || `ECG_Report_${patientName.replace(/\s+/g, "_")}_${Date.now()}.pdf`;

      if (Platform.OS === "web") {
        // ── Web: direct download via anchor tag ──
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${base64Pdf}`;
        link.download = safeFileName;
        link.click();

      } else {
        // ── Mobile (iOS + Android): write to cache, then share ──
        // cacheDirectory is reliable on both platforms and persists long enough to share
        const fileUri = FileSystem.cacheDirectory + safeFileName;

        await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (Platform.OS === "android") {
          // On Android, try to save to Downloads via MediaLibrary first
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === "granted") {
              const asset = await MediaLibrary.createAssetAsync(fileUri);
              // Move to Downloads album
              let album = await MediaLibrary.getAlbumAsync("Download");
              if (album == null) {
                await MediaLibrary.createAlbumAsync("Download", asset, false);
              } else {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
              }
              Alert.alert(
                "Report Saved",
                `"${safeFileName}" has been saved to your Downloads folder.`,
                [{ text: "OK" }]
              );
            } else {
              // Fall back to share sheet if permission denied
              await Sharing.shareAsync(fileUri, {
                mimeType: "application/pdf",
                dialogTitle: "Save ECG Report",
              });
            }
          } catch (mediaErr) {
            // If MediaLibrary fails for any reason, fall back to share sheet
            await Sharing.shareAsync(fileUri, {
              mimeType: "application/pdf",
              dialogTitle: "Save ECG Report",
            });
          }
        } else {
          // ── iOS: share sheet is the standard way (Save to Files option) ──
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "application/pdf",
              dialogTitle: "Save ECG Report",
              UTI: "com.adobe.pdf",
            });
          } else {
            Alert.alert("Saved", `Report saved to: ${fileUri}`);
          }
        }
      }

      setDownloaded(true);
    } catch (err) {
      const parsed = parseApiError(err);
      const detail = err?.response?.data?.data;
      onError({ type: parsed.type, message: detail || parsed.message });
    } finally {
      setPdfLoading(false);
    }
  }, [ecgImage, patientName, onError]);

  return (
    <SectionCard style={{ marginTop: 12 }}>
      <SectionHeading
        icon="file-pdf-box"
        title="ECG Report"
        subtitle="Generate and download a full PDF report to your device"
        color={C.red}
      />
      <Divider />

      {/* Info chips */}
      <View style={s.pdfInfoRow}>
        <View style={s.pdfInfoChip}>
          <MaterialCommunityIcons name="account" size={13} color={C.blue} />
          <Text style={s.pdfInfoChipText} numberOfLines={1}>{patientName}</Text>
        </View>
        <View style={s.pdfInfoChip}>
          <MaterialCommunityIcons name="heart-pulse" size={13} color={C.red} />
          <Text style={s.pdfInfoChipText}>{ecgResult?.diagnosis ?? "—"}</Text>
        </View>
        <View style={s.pdfInfoChip}>
          <MaterialCommunityIcons name="percent" size={13} color={C.amber} />
          <Text style={s.pdfInfoChipText}>{ecgResult?.confidence?.toFixed(1) ?? "—"}%</Text>
        </View>
      </View>

      {/* Success badge */}
      {downloaded && (
        <View style={s.downloadedBadge}>
          <MaterialCommunityIcons name="check-circle" size={16} color={C.green} />
          <Text style={s.downloadedText}>
            {Platform.OS === "android"
              ? "Report saved to Downloads folder"
              : Platform.OS === "ios"
              ? "Report ready — use Share to save to Files"
              : "Report downloaded successfully"}
          </Text>
        </View>
      )}

      {/* Download button */}
      <TouchableOpacity
        onPress={generateAndDownload}
        disabled={pdfLoading}
        activeOpacity={0.85}
        style={[s.pdfGenerateBtn, pdfLoading && { opacity: 0.6 }]}
      >
        <LinearGradient colors={G.red} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pdfGenerateBtnInner}>
          {pdfLoading
            ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
            : <MaterialCommunityIcons name="download" size={20} color="#fff" style={{ marginRight: 10 }} />
          }
          <Text style={s.pdfGenerateBtnText}>
            {pdfLoading ? "Generating report..." : downloaded ? "Download Again" : "Download PDF Report"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={s.pdfNote}>
        {Platform.OS === "android"
          ? "Report will be saved directly to your Downloads folder."
          : Platform.OS === "ios"
          ? "Tap Download then use the Share sheet to save to Files or share via email."
          : "Includes diagnosis, confidence, territorial distribution, dominant leads, waveform zones, injury indices, and clinical interpretation."}
      </Text>
    </SectionCard>
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 1,
    });
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
      if (typeof document !== "undefined") {
        const blob = await (await fetch(ecgImage.uri)).blob();
        data.append("ecgImage", new File([blob], ecgImage.name, { type: ecgImage.type || "image/jpeg" }));
      } else {
        data.append("ecgImage", { uri: ecgImage.uri, name: ecgImage.name, type: ecgImage.type || "image/jpeg" });
      }
      const response = await apiClient.post(`${BASE_URL}/api/ecg/predict`, data, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 60000, transformRequest: (d) => d,
      });
      if (response.status === 200 && response.data)
        setEcgResult(response.data?.data ?? response.data);
      else
        setEcgError({ type: "general", message: "Unexpected response from ECG server." });
    } catch (err) {
      const parsed = parseApiError(err);
      const detail = err?.response?.data?.data;
      setEcgError({ type: parsed.type, message: detail || parsed.message });
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

        {/* ── Upload & Analyze ── */}
        <SectionCard>
          <SectionHeading icon="waveform" title="ECG Image Analysis"
            subtitle="AI-powered ECG diagnosis from image" color={C.cyan} />
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
              loading={ecgLoading}
              disabled={ecgLoading || !ecgImage || !ecgPatientName.trim()}
              gradient={G.teal} />
          </Animated.View>

          {ecgError ? <ErrorCard error={ecgError} onDismiss={dismissError} /> : null}
        </SectionCard>

        {/* ── Results ── */}
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
                    name={ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index
                      ? "trending-up" : "trending-down"}
                    size={16}
                    color={ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index
                      ? C.red : C.purple}
                  />
                  <Text style={s.compareText}>
                    {ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index
                      ? "Acute injury pattern dominant" : "Chronic remodeling pattern dominant"}
                  </Text>
                </View>
              </ECGResultSection>
            </SectionCard>

            {/* ── PDF Report ── */}
            <PdfReportCard
              ecgImage={ecgImage}
              patientName={ecgPatientName}
              ecgResult={ecgResult}
              onError={setEcgError}
            />
          </View>
        ) : null}

      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Upload
  uploadRow:        { flexDirection: "row", gap: 12, marginBottom: 14 },
  uploadBtn:        { borderRadius: 12, borderWidth: 1.5, borderColor: C.border, overflow: "hidden" },
  uploadBtnInner:   { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, backgroundColor: C.surfaceAlt },
  uploadBtnText:    { color: C.textPrimary, fontWeight: "600", fontSize: 14 },
  previewWrap:      { borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: C.blue + "50", marginBottom: 4 },
  previewImg:       { width: "100%", height: 220, backgroundColor: C.surfaceBlu },
  previewFooter:    { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, backgroundColor: C.greenLight },
  previewFileName:  { color: C.green, fontSize: 12, flex: 1, fontWeight: "600" },
  emptyPreview:     { height: 100, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.bluePale, marginBottom: 4, backgroundColor: C.blueGhost },
  emptyPreviewText: { color: C.textMuted, fontSize: 13 },

  // Diagnosis
  diagBanner:      { borderRadius: 16, padding: 22, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  diagLabel:       { fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 2.5, fontWeight: "700" },
  diagName:        { fontSize: 26, fontWeight: "800", color: "#fff", marginTop: 3 },
  diagFullName:    { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 },
  diagConfidWrap:  { backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" },
  diagConfidValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  diagConfidLabel: { fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5, marginTop: 2 },
  patientRow:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.blueGhost, borderRadius: 10, padding: 11, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  patientRowText:  { color: C.textSecond, fontSize: 13 },

  // Result sections
  resultSection:       { borderBottomWidth: 1, borderBottomColor: C.border },
  resultSectionHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  resultIconBg:        { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  resultSectionTitle:  { fontSize: 13, fontWeight: "700", color: C.textPrimary },
  resultSectionBody:   { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2 },
  interpretText:       { color: C.textSecond, fontSize: 13, lineHeight: 22 },
  primaryTerr:         { color: C.textSecond, fontSize: 12, marginBottom: 10 },
  barRow:              { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  barLabel:            { width: 64, color: C.textSecond, fontSize: 11, fontWeight: "600" },
  barTrack:            { flex: 1, height: 7, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" },
  barFill:             { height: "100%", borderRadius: 4 },
  barValue:            { width: 34, fontSize: 11, fontWeight: "700", textAlign: "right" },
  leadRow:             { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  rankBadge:           { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rankText:            { fontSize: 10, fontWeight: "700" },
  leadName:            { width: 52, color: C.textPrimary, fontSize: 12, fontWeight: "600" },
  leadBarTrack:        { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  leadBarFill:         { height: "100%", borderRadius: 3 },
  leadScore:           { width: 50, color: C.textSecond, fontSize: 11, textAlign: "right" },
  zoneGrid:            { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  zonePill:            { flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10, gap: 8, borderWidth: 1, borderColor: C.border, minWidth: 110, flex: 1 },
  zoneDot:             { width: 8, height: 8, borderRadius: 4 },
  zoneLabel:           { color: C.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  zoneValue:           { fontSize: 15, fontWeight: "700" },
  dominantBadge:       { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, marginLeft: "auto" },
  dominantBadgeText:   { color: "#fff", fontSize: 7, fontWeight: "800", letterSpacing: 0.8 },
  indicesRow:          { flexDirection: "row", gap: 10, marginBottom: 10 },
  indexCard:           { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1 },
  indexTitle:          { color: C.textSecond, fontSize: 11, fontWeight: "600", marginBottom: 6, textAlign: "center" },
  indexValue:          { fontSize: 18, fontWeight: "800" },
  compareRow:          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10 },
  compareText:         { color: C.textSecond, fontSize: 12 },

  // PDF report card
  pdfInfoRow:          { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  pdfInfoChip:         { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: C.border },
  pdfInfoChipText:     { fontSize: 12, color: C.textSecond, fontWeight: "600", flex: 1 },
  downloadedBadge:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.greenLight, borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: C.green + "40" },
  downloadedText:      { color: C.green, fontSize: 13, fontWeight: "600", flex: 1 },
  pdfGenerateBtn:      { borderRadius: 14, overflow: "hidden", shadowColor: C.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 },
  pdfGenerateBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  pdfGenerateBtnText:  { fontSize: 15, fontWeight: "700", color: "#fff" },
  pdfNote:             { color: C.textMuted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 10, paddingHorizontal: 4 },
});