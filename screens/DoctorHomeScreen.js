import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Dimensions, Alert, Image,
  SafeAreaView, FlatList, Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import AnimatedRN, { FadeInLeft } from "react-native-reanimated";
import axios from "axios";
import { Audio } from "expo-av";
import BASE_URL from "./Config";
import apiClient from "./Apiclient";

const { width } = Dimensions.get("window");
const isWeb = width > 900;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
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

const G = {
  navy:   ["#0F172A", "#1E3A8A", "#2563EB"],
  blue:   ["#2563EB", "#3B82F6"],
  teal:   ["#0891B2", "#2563EB"],
  green:  ["#059669", "#0891B2"],
  red:    ["#DC2626", "#F59E0B"],
  purple: ["#7C3AED", "#2563EB"],
  amber:  ["#D97706", "#DC2626"],
};

// ─── Error Parser ─────────────────────────────────────────────────────────────
const parseApiError = (error) => {
  const errBody = error?.response?.data;
  if (!errBody) {
    return { type: "general", message: error?.message || "Something went wrong. Please try again." };
  }
  if (errBody?.data && typeof errBody.data === "object" && !Array.isArray(errBody.data)) {
    const fields = Object.entries(errBody.data).map(([key, msg]) => ({
      field: key.replace(/patientData\[\d+\]\./, "").replace(/([A-Z])/g, " $1").trim(),
      msg,
    }));
    return { type: "validation", message: errBody.message || "Validation Error", fields };
  }
  const msg =
    errBody?.message ||
    errBody?.error ||
    errBody?.detail ||
    (typeof errBody === "string" ? errBody : null) ||
    error?.message ||
    "Something went wrong.";
  return { type: "general", message: msg };
};

// ─── ErrorCard ────────────────────────────────────────────────────────────────
const ErrorCard = memo(({ error, onDismiss }) => {
  if (!error) return null;
  return (
    <View style={errS.wrap}>
      <View style={errS.header}>
        <MaterialCommunityIcons name="alert-circle" size={19} color={C.red} />
        <Text style={errS.headerText}>{error.message}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={errS.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close" size={16} color={C.red} />
          </TouchableOpacity>
        )}
      </View>
      {error.type === "validation" && error.fields?.length > 0 && (
        <View style={errS.fieldList}>
          {error.fields.map((e, i) => (
            <View key={i} style={errS.fieldRow}>
              <View style={errS.fieldDot} />
              <Text style={errS.fieldName}>{e.field}: </Text>
              <Text style={errS.fieldMsg}>{e.msg}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Memoized Primitives ──────────────────────────────────────────────────────

const SectionCard = memo(({ children, style }) => (
  <View style={[prim.sectionCard, style]}>{children}</View>
));

const SectionHeading = memo(({ icon, title, subtitle, color = C.blue }) => (
  <View style={prim.sectionHeading}>
    <LinearGradient colors={[color, color + "BB"]} style={prim.sectionHeadingIcon}>
      <MaterialCommunityIcons name={icon} size={20} color="#fff" />
    </LinearGradient>
    <View style={{ flex: 1 }}>
      <Text style={prim.sectionHeadingTitle}>{title}</Text>
      {subtitle ? <Text style={prim.sectionHeadingSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
));

// No useState inside — prevents web flickering
const FloatingInput = memo(({ label, icon, value, onChangeText, placeholder, keyboardType, editable = true, multiline }) => (
  <View style={prim.floatWrap}>
    <Text style={prim.floatLabel}>{label}</Text>
    <View style={[prim.floatBox, !editable && prim.floatBoxDisabled]}>
      {icon && <MaterialCommunityIcons name={icon} size={18} color={C.textMuted} style={{ marginRight: 10 }} />}
      <TextInput
        style={[prim.floatInput, multiline && { height: 80, textAlignVertical: "top" }, { outlineStyle: "none" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType || "default"}
        editable={editable}
        multiline={multiline}
      />
    </View>
  </View>
));

const FloatingPicker = memo(({ label, icon, selectedValue, onValueChange, enabled = true, children }) => (
  <View style={prim.floatWrap}>
    <Text style={prim.floatLabel}>{label}</Text>
    <View style={[prim.floatBox, !enabled && prim.floatBoxDisabled]}>
      {icon && <MaterialCommunityIcons name={icon} size={18} color={C.textMuted} style={{ marginRight: 10 }} />}
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={prim.pickerInner}
        enabled={enabled}
        dropdownIconColor={C.textSecond}
      >
        {children}
      </Picker>
    </View>
  </View>
));

const PrimaryButton = memo(({ label, icon, onPress, disabled, loading, gradient = G.blue }) => (
  <TouchableOpacity
    onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
    style={[prim.btnWrap, (disabled || loading) && { opacity: 0.5 }]}
  >
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={prim.btn}>
      {loading
        ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
        : icon && <MaterialCommunityIcons name={icon} size={20} color="#fff" style={{ marginRight: 10 }} />}
      <Text style={prim.btnText}>{loading ? "Processing..." : label}</Text>
    </LinearGradient>
  </TouchableOpacity>
));

// ─── Patient History Components ───────────────────────────────────────────────

const DiagnosisSection = memo(({ title, iconName, iconColor, bgColor, children, isExpandedDefault = false }) => {
  const [expanded, setExpanded] = useState(isExpandedDefault);
  const toggle = useCallback(() => setExpanded(v => !v), []);
  return (
    <View style={hist.sectionWrap}>
      <TouchableOpacity activeOpacity={0.8} onPress={toggle} style={hist.sectionHeader}>
        <View style={[hist.sectionIconBg, { backgroundColor: bgColor || iconColor + "22" }]}>
          <FontAwesome5 name={iconName} size={13} color={iconColor} />
        </View>
        <Text style={hist.sectionTitle}>{title}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={17} color={C.textMuted} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
      {expanded && <View style={hist.sectionBody}>{children}</View>}
    </View>
  );
});

const PatientDiagnosisItem = memo(({ item }) => {
  const isPositive = item.prediction.toLowerCase().includes("high") || item.prediction.toLowerCase().includes("positive");
  return (
    <AnimatedRN.View style={hist.card} entering={FadeInLeft.duration(600)}>
      <LinearGradient colors={isPositive ? G.red : G.green} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={hist.dateBanner}>
        <FontAwesome5 name="calendar-alt" size={11} color="rgba(255,255,255,0.85)" />
        <Text style={hist.dateBannerText}>{item.date}</Text>
      </LinearGradient>
      <View style={hist.cardBody}>
        <DiagnosisSection title="Symptoms & Input Details" iconName="stethoscope" iconColor={C.cyan} bgColor={C.cyanLight} isExpandedDefault={false}>
          {item.symptoms.length > 0
            ? item.symptoms.map((s, i) => (
              <View key={i} style={hist.listRow}>
                <View style={[hist.dot, { backgroundColor: C.cyan }]} />
                <Text style={hist.listText}>{s}</Text>
              </View>
            ))
            : <Text style={hist.listText}>No detailed inputs recorded</Text>}
        </DiagnosisSection>
        <DiagnosisSection title="Prediction" iconName="heartbeat"
          iconColor={isPositive ? C.red : C.green} bgColor={isPositive ? C.redLight : C.greenLight} isExpandedDefault>
          <View style={hist.predRow}>
            <FontAwesome5 name="heart" size={20} color={isPositive ? C.red : C.green} style={{ marginRight: 10 }} />
            <Text style={[hist.predText, { color: isPositive ? C.red : C.green }]}>{item.prediction}</Text>
          </View>
        </DiagnosisSection>
        <DiagnosisSection title="Recommended Medicines" iconName="capsules" iconColor={C.purple} bgColor={C.purpleLight} isExpandedDefault={false}>
          {item.medicines.length > 0
            ? item.medicines.map((m, i) => (
              <View key={i} style={hist.listRow}>
                <View style={[hist.dot, { backgroundColor: C.purple }]} />
                <Text style={hist.listText}>{m}</Text>
              </View>
            ))
            : <Text style={hist.listText}>No recommendations available</Text>}
        </DiagnosisSection>
        {item.transcript ? (
          <DiagnosisSection title="Audio Transcript" iconName="microphone" iconColor={C.blue} bgColor={C.bluePale} isExpandedDefault={false}>
            <Text style={[hist.listText, { fontStyle: "italic" }]}>{item.transcript}</Text>
          </DiagnosisSection>
        ) : null}
        {item.summary ? (
          <DiagnosisSection title="Summary" iconName="file-alt" iconColor={C.green} bgColor={C.greenLight} isExpandedDefault={false}>
            <Text style={[hist.listText, { fontStyle: "italic" }]}>{item.summary}</Text>
          </DiagnosisSection>
        ) : null}
        {item.deIdentifiedTranscript ? (
          <DiagnosisSection title="De-identified Transcript" iconName="shield-alt" iconColor={C.amber} bgColor={C.amberLight} isExpandedDefault={false}>
            <Text style={[hist.listText, { fontStyle: "italic" }]}>{item.deIdentifiedTranscript}</Text>
          </DiagnosisSection>
        ) : null}
      </View>
    </AnimatedRN.View>
  );
});

const renderPatientDiagnosisItem = ({ item }) => <PatientDiagnosisItem item={item} />;

// ─── ECG Sub-components ───────────────────────────────────────────────────────

const ECG_DIAGNOSIS_CONFIG = {
  Normal:       { colors: G.green,  label: "Normal"                },
  Abnormal:     { colors: G.amber,  label: "Abnormal"              },
  "MI":         { colors: G.red,    label: "Myocardial Infarction" },
  "History-MI": { colors: G.purple, label: "History of MI"         },
};

const TERRITORY_COLORS = { Anterior: C.blue, Lateral: C.green, Inferior: C.amber, Rhythm: C.red };
const ZONE_COLORS = { QRS_zone: C.blue, ST_zone: C.amber, Baseline_zone: C.green };

const ECGTerritoryBar = memo(({ label, value, color }) => {
  const pct = Math.round(value * 100);
  return (
    <View style={ecgS.barRow}>
      <Text style={ecgS.barLabel}>{label}</Text>
      <View style={ecgS.barTrack}>
        <View style={[ecgS.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[ecgS.barValue, { color }]}>{pct}%</Text>
    </View>
  );
});

const ECGZonePill = memo(({ label, value, color, dominant }) => (
  <View style={[ecgS.zonePill, dominant && { borderColor: color, borderWidth: 1.5, backgroundColor: color + "15" }]}>
    <View style={[ecgS.zoneDot, { backgroundColor: color }]} />
    <View style={{ flex: 1 }}>
      <Text style={ecgS.zoneLabel}>{label}</Text>
      <Text style={[ecgS.zoneValue, { color }]}>{Math.round(value * 100)}%</Text>
    </View>
    {dominant && (
      <View style={[ecgS.dominantBadge, { backgroundColor: color }]}>
        <Text style={ecgS.dominantBadgeText}>PRIMARY</Text>
      </View>
    )}
  </View>
));

const ECGLeadItem = memo(({ lead, score, rank }) => {
  const rankColors = ["#D97706", "#64748B", "#92400E", C.textMuted, C.textMuted];
  return (
    <View style={ecgS.leadRow}>
      <View style={[ecgS.rankBadge, { backgroundColor: rankColors[rank] + "20", borderColor: rankColors[rank] + "60", borderWidth: 1 }]}>
        <Text style={[ecgS.rankText, { color: rankColors[rank] }]}>#{rank + 1}</Text>
      </View>
      <Text style={ecgS.leadName}>{lead}</Text>
      <View style={ecgS.leadBarTrack}>
        <LinearGradient colors={G.blue} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[ecgS.leadBarFill, { width: Math.max(Math.round(score * 260), 10) }]} />
      </View>
      <Text style={ecgS.leadScore}>{score.toFixed(4)}</Text>
    </View>
  );
});

const ECGResultSection = memo(({ title, icon, iconColor, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen(v => !v), []);
  return (
    <View style={ecgS.resultSection}>
      <TouchableOpacity activeOpacity={0.8} onPress={toggle} style={ecgS.resultSectionHeader}>
        <View style={[ecgS.resultIconBg, { backgroundColor: iconColor + "20" }]}>
          <MaterialCommunityIcons name={icon} size={15} color={iconColor} />
        </View>
        <Text style={ecgS.resultSectionTitle}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={17} color={C.textMuted} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
      {open && <View style={ecgS.resultSectionBody}>{children}</View>}
    </View>
  );
});

// ─── Memoized Form Sections ───────────────────────────────────────────────────

const AudioSection = memo(({ audioPatientName, onNameChange, isRecording, isUploading, onRecord, audioError, onDismissError }) => (
  <SectionCard style={{ marginTop: 20 }}>
    <SectionHeading icon="microphone" title="Audio-Based Prediction" subtitle="Record consultation for AI analysis" color={C.purple} />
    <View style={main.divider} />
    <FloatingInput label="Patient Name" icon="account" value={audioPatientName}
      onChangeText={onNameChange} placeholder="e.g. John Doe" editable={!isRecording && !isUploading} />
    <TouchableOpacity onPress={onRecord} disabled={isUploading} activeOpacity={0.85} style={main.recordBtnWrap}>
      <LinearGradient colors={isRecording ? G.red : G.purple} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={main.recordBtn}>
        {isUploading
          ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: 12 }} />
          : <MaterialCommunityIcons name={isRecording ? "stop-circle" : "microphone"} size={24} color="#fff" style={{ marginRight: 12 }} />}
        <Text style={main.recordBtnText}>
          {isUploading ? "Analyzing..." : isRecording ? "Stop & Analyze" : "Start Recording"}
        </Text>
        {isRecording && <View style={main.recordingDot} />}
      </LinearGradient>
    </TouchableOpacity>
    {audioError ? <ErrorCard error={audioError} onDismiss={onDismissError} /> : null}
  </SectionCard>
));

const ManualPredictionSection = memo(({ formData, onFieldChange, isSubmitting, onSubmit }) => (
  <SectionCard style={{ marginTop: 16 }}>
    <SectionHeading icon="clipboard-text" title="Manual Prediction" subtitle="Enter patient vitals for risk assessment" color={C.blue} />
    <View style={main.divider} />
    <View style={main.twoCol}>
      <View style={{ flex: 1 }}>
        <FloatingInput label="Patient Name" icon="account" value={formData.patientName}
          onChangeText={onFieldChange.patientName} placeholder="Full name" editable={!isSubmitting} />
      </View>
      <View style={{ flex: 1 }}>
        <FloatingInput label="Age" icon="calendar" value={formData.Age}
          onChangeText={onFieldChange.Age} placeholder="Years" keyboardType="numeric" editable={!isSubmitting} />
      </View>
    </View>
    <View style={main.twoCol}>
      <View style={{ flex: 1 }}>
        <FloatingPicker label="Sex" icon="gender-male-female" selectedValue={formData.Sex}
          onValueChange={onFieldChange.Sex} enabled={!isSubmitting}>
          <Picker.Item label="Male (M)" value="M" />
          <Picker.Item label="Female (F)" value="F" />
        </FloatingPicker>
      </View>
      <View style={{ flex: 1 }}>
        <FloatingPicker label="Chest Pain Type" icon="heart-broken" selectedValue={formData.ChestPainType}
          onValueChange={onFieldChange.ChestPainType} enabled={!isSubmitting}>
          <Picker.Item label="ATA – Asymptomatic" value="ATA" />
          <Picker.Item label="NAP – Non-Anginal" value="NAP" />
          <Picker.Item label="ASY – Atypical" value="ASY" />
          <Picker.Item label="TA – Typical Angina" value="TA" />
        </FloatingPicker>
      </View>
    </View>
    <View style={main.twoCol}>
      <View style={{ flex: 1 }}>
        <FloatingInput label="Resting BP (mm Hg)" icon="pulse" value={formData.RestingBP}
          onChangeText={onFieldChange.RestingBP} placeholder="e.g. 120" keyboardType="numeric" editable={!isSubmitting} />
      </View>
      <View style={{ flex: 1 }}>
        <FloatingInput label="Cholesterol (mg/dl)" icon="water" value={formData.Cholesterol}
          onChangeText={onFieldChange.Cholesterol} placeholder="e.g. 200" keyboardType="numeric" editable={!isSubmitting} />
      </View>
    </View>
    <View style={main.twoCol}>
      <View style={{ flex: 1 }}>
        <FloatingInput label="Max Heart Rate" icon="heart-flash" value={formData.MaxHR}
          onChangeText={onFieldChange.MaxHR} placeholder="e.g. 150" keyboardType="numeric" editable={!isSubmitting} />
      </View>
      <View style={{ flex: 1 }}>
        <FloatingInput label="Oldpeak (ST Depr.)" icon="chart-line" value={formData.Oldpeak}
          onChangeText={onFieldChange.Oldpeak} placeholder="e.g. 1.5" keyboardType="decimal-pad" editable={!isSubmitting} />
      </View>
    </View>
    <View style={main.twoCol}>
      <View style={{ flex: 1 }}>
        <FloatingPicker label="Fasting Blood Sugar" icon="blood-bag" selectedValue={formData.FastingBS}
          onValueChange={onFieldChange.FastingBS} enabled={!isSubmitting}>
          <Picker.Item label="Normal (≤120)" value="0" />
          <Picker.Item label="High (>120)" value="1" />
        </FloatingPicker>
      </View>
      <View style={{ flex: 1 }}>
        <FloatingPicker label="Resting ECG" icon="waveform" selectedValue={formData.RestingECG}
          onValueChange={onFieldChange.RestingECG} enabled={!isSubmitting}>
          <Picker.Item label="Normal" value="Normal" />
          <Picker.Item label="ST" value="ST" />
          <Picker.Item label="LVH" value="LVH" />
        </FloatingPicker>
      </View>
    </View>
    <View style={main.twoCol}>
      <View style={{ flex: 1 }}>
        <FloatingPicker label="Exercise Angina" icon="run-fast" selectedValue={formData.ExerciseAngina}
          onValueChange={onFieldChange.ExerciseAngina} enabled={!isSubmitting}>
          <Picker.Item label="No" value="N" />
          <Picker.Item label="Yes" value="Y" />
        </FloatingPicker>
      </View>
      <View style={{ flex: 1 }}>
        <FloatingPicker label="ST Slope" icon="trending-up" selectedValue={formData.ST_Slope}
          onValueChange={onFieldChange.ST_Slope} enabled={!isSubmitting}>
          <Picker.Item label="Up" value="Up" />
          <Picker.Item label="Flat" value="Flat" />
          <Picker.Item label="Down" value="Down" />
        </FloatingPicker>
      </View>
    </View>
    <PrimaryButton label="Predict Heart Risk" icon="heart-search"
      onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting} gradient={G.blue} />
  </SectionCard>
));

const ECGSection = memo(({ ecgPatientName, onNameChange, ecgImage, ecgLoading, ecgError, onDismissError, ecgPulseAnim, onPickImage, onTakePhoto, onAnalyze }) => (
  <SectionCard style={{ marginTop: 16 }}>
    <SectionHeading icon="waveform" title="ECG Image Analysis" subtitle="AI-powered ECG diagnosis from image" color={C.cyan} />
    <View style={main.divider} />
    <FloatingInput label="Patient Name" icon="account" value={ecgPatientName}
      onChangeText={onNameChange} placeholder="e.g. John Doe" editable={!ecgLoading} />
    <View style={ecgS.uploadRow}>
      <TouchableOpacity style={[ecgS.uploadBtn, { flex: 1 }]} onPress={onPickImage} disabled={ecgLoading} activeOpacity={0.8}>
        <View style={ecgS.uploadBtnInner}>
          <MaterialCommunityIcons name="image-plus" size={22} color={C.blue} />
          <Text style={ecgS.uploadBtnText}>Gallery</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={[ecgS.uploadBtn, { flex: 1 }]} onPress={onTakePhoto} disabled={ecgLoading} activeOpacity={0.8}>
        <View style={ecgS.uploadBtnInner}>
          <MaterialCommunityIcons name="camera-plus" size={22} color={C.cyan} />
          <Text style={ecgS.uploadBtnText}>Camera</Text>
        </View>
      </TouchableOpacity>
    </View>
    {ecgImage ? (
      <View style={ecgS.previewWrap}>
        <Image source={{ uri: ecgImage.uri }} style={ecgS.previewImg} resizeMode="contain" />
        <View style={ecgS.previewFooter}>
          <MaterialCommunityIcons name="check-circle" size={15} color={C.green} />
          <Text style={ecgS.previewFileName} numberOfLines={1}>{ecgImage.name}</Text>
        </View>
      </View>
    ) : (
      <View style={ecgS.emptyPreview}>
        <MaterialCommunityIcons name="file-image-outline" size={44} color={C.textMuted} />
        <Text style={ecgS.emptyPreviewText}>No ECG image selected</Text>
      </View>
    )}
    <Animated.View style={{ transform: [{ scale: ecgPulseAnim }], marginTop: 14 }}>
      <PrimaryButton label="Analyze ECG" icon="heart-pulse" onPress={onAnalyze}
        loading={ecgLoading} disabled={ecgLoading || !ecgImage || !ecgPatientName.trim()} gradient={G.teal} />
    </Animated.View>
    {ecgError ? <ErrorCard error={ecgError} onDismiss={onDismissError} /> : null}
  </SectionCard>
));

const PatientHistorySection = memo(({ patientSearchText, onSearchChange, onSearch, patientLoading }) => (
  <SectionCard style={{ marginTop: 16 }}>
    <SectionHeading icon="history" title="Patient History" subtitle="Search past predictions and records" color={C.green} />
    <View style={main.divider} />
    <View style={main.searchRow}>
      <View style={main.searchInputWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[main.searchInput, { outlineStyle: "none" }]}
          placeholder="Search patient name..."
          placeholderTextColor={C.textMuted}
          value={patientSearchText}
          onChangeText={onSearchChange}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          editable={!patientLoading}
        />
      </View>
      <TouchableOpacity
        onPress={onSearch}
        disabled={patientLoading || !patientSearchText.trim()}
        style={[main.searchBtn, (patientLoading || !patientSearchText.trim()) && { opacity: 0.4 }]}
      >
        <LinearGradient colors={G.green} style={main.searchBtnInner}>
          {patientLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </SectionCard>
));

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function DoctorHomeScreen({ onLogout }) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]           = useState(false);
  const [recording, setRecording]               = useState(null);
  const [isUploading, setIsUploading]           = useState(false);
  const [audioPatientName, setAudioPatientName] = useState("");
  const [audioDiagnosisResult, setAudioDiagnosisResult] = useState(null);
  const [audioError, setAudioError]             = useState(null);

  const [formData, setFormData] = useState({
    patientName: "", Age: "", Sex: "M", ChestPainType: "ATA",
    RestingBP: "", Cholesterol: "", FastingBS: "0", RestingECG: "Normal",
    MaxHR: "", ExerciseAngina: "N", Oldpeak: "", ST_Slope: "Up",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heartResult, setHeartResult]   = useState(null);
  const [heartError, setHeartError]     = useState(null);

  const [patientSearchText, setPatientSearchText]       = useState("");
  const [patientLoading, setPatientLoading]             = useState(false);
  const [patientError, setPatientError]                 = useState(null);
  const [patientDiagnosisList, setPatientDiagnosisList] = useState([]);

  const [ecgPatientName, setEcgPatientName] = useState("");
  const [ecgImage, setEcgImage]             = useState(null);
  const [ecgLoading, setEcgLoading]         = useState(false);
  const [ecgResult, setEcgResult]           = useState(null);
  const [ecgError, setEcgError]             = useState(null);
  const ecgPulseAnim                        = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") Alert.alert("Permission required", "Microphone permission is required.");
    })();
  }, []);

  // ── All stable callbacks declared unconditionally at top level ────────────

  // Dismiss handlers — declared here, never inside JSX
  const dismissAudioError   = useCallback(() => setAudioError(null),   []);
  const dismissHeartError   = useCallback(() => setHeartError(null),   []);
  const dismissEcgError     = useCallback(() => setEcgError(null),     []);
  const dismissPatientError = useCallback(() => setPatientError(null), []);

  // Field change handlers — stable references so memo is never broken
  const fieldHandlers = {
    patientName:    useCallback(v => setFormData(p => ({ ...p, patientName: v })),    []),
    Age:            useCallback(v => setFormData(p => ({ ...p, Age: v })),            []),
    Sex:            useCallback(v => setFormData(p => ({ ...p, Sex: v })),            []),
    ChestPainType:  useCallback(v => setFormData(p => ({ ...p, ChestPainType: v })),  []),
    RestingBP:      useCallback(v => setFormData(p => ({ ...p, RestingBP: v })),      []),
    Cholesterol:    useCallback(v => setFormData(p => ({ ...p, Cholesterol: v })),    []),
    FastingBS:      useCallback(v => setFormData(p => ({ ...p, FastingBS: v })),      []),
    RestingECG:     useCallback(v => setFormData(p => ({ ...p, RestingECG: v })),     []),
    MaxHR:          useCallback(v => setFormData(p => ({ ...p, MaxHR: v })),          []),
    ExerciseAngina: useCallback(v => setFormData(p => ({ ...p, ExerciseAngina: v })), []),
    Oldpeak:        useCallback(v => setFormData(p => ({ ...p, Oldpeak: v })),        []),
    ST_Slope:       useCallback(v => setFormData(p => ({ ...p, ST_Slope: v })),       []),
  };

  const handleAudioNameChange  = useCallback(v => setAudioPatientName(v), []);
  const handleEcgNameChange    = useCallback(v => setEcgPatientName(v),   []);
  const handleSearchTextChange = useCallback(v => setPatientSearchText(v), []);

  const getMedicineRecommendations = useCallback((riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case "high":     return ["Aspirin (daily)", "Statins (for cholesterol)", "Beta-blockers (for heart rate)"];
      case "medium":   return ["Aspirin (as needed)", "Lifestyle changes recommended"];
      case "low":
      case "negative": return ["No immediate medication; maintain healthy lifestyle"];
      default:         return ["Consult a doctor for recommendations"];
    }
  }, []);

  // ── Audio ──────────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      setAudioDiagnosisResult(null);
      setAudioError(null);
      setIsRecording(true);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      setRecording(recording);
    } catch (error) {
      setIsRecording(false);
      setAudioError({ type: "general", message: "Failed to start recording: " + error.message });
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    if (!audioPatientName.trim()) {
      setAudioError({ type: "general", message: "Please enter patient name before stopping." });
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      setRecording(null);
      return;
    }
    try {
      setIsRecording(false);
      setIsUploading(true);
      setAudioError(null);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        setAudioError({ type: "general", message: "Recording URI not found." });
        setIsUploading(false);
        return;
      }
      const fd = new FormData();
      fd.append("patientName", audioPatientName.trim());
      if (uri.startsWith("blob:") || uri.startsWith("data:")) {
        const r = await fetch(uri);
        const blob = await r.blob();
        const fn = `recording_${Date.now()}.m4a`;
        fd.append("audioFile", new File([blob], fn, { type: "audio/m4a" }), fn);
      } else {
        const parts = uri.split("/");
        fd.append("audioFile", { uri, name: parts[parts.length - 1], type: "audio/m4a" });
      }
      const response = await apiClient.post(`${BASE_URL}:8080/api/heart/predict/audio`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.status === 200 && response.data) {
        const result = response.data.data || response.data;
        setAudioDiagnosisResult({
          date: new Date().toISOString().split("T")[0],
          symptoms: result.inputData ? [
            `Age: ${result.inputData.Age || "N/A"}`,
            `Sex: ${result.inputData.Sex === "M" ? "Male" : "Female"}`,
            `Chest Pain: ${result.inputData.ChestPainType || "N/A"}`,
            `BP: ${result.inputData.RestingBP || "N/A"} mm Hg`,
            `Cholesterol: ${result.inputData.Cholesterol || "N/A"} mg/dl`,
          ].filter(s => !s.includes("N/A")) : ["Audio analysis completed"],
          prediction: `Heart Disease ${result.riskLevel || "Unknown"} (${((result.probability || 0) * 100).toFixed(1)}%)`,
          medicines: getMedicineRecommendations(result.riskLevel),
          transcript: result.transcript || "",
          summary: result.summary || "",
          deIdentifiedTranscript: result.deIdentifiedTranscript || "",
        });
      }
    } catch (error) {
      setAudioError(parseApiError(error));
    } finally {
      setIsUploading(false);
      setRecording(null);
    }
  }, [recording, audioPatientName, getMedicineRecommendations]);

  const handleRecord = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ── Text Prediction ────────────────────────────────────────────────────────

  const handleHeartSubmit = useCallback(async () => {
    const required = ["patientName", "Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"];
    for (let f of required) {
      if (!formData[f]?.toString().trim()) {
        setHeartError({ type: "general", message: `${f.replace(/([A-Z])/g, " $1").trim()} is required.` });
        return;
      }
      if (f !== "patientName" && isNaN(parseFloat(formData[f]))) {
        setHeartError({ type: "general", message: `${f.replace(/([A-Z])/g, " $1").trim()} must be a number.` });
        return;
      }
    }
    try {
      setIsSubmitting(true);
      setHeartResult(null);
      setHeartError(null);
      const body = {
        patientName: formData.patientName.trim(),
        patientData: [{
          Age: parseInt(formData.Age),
          Sex: formData.Sex,
          ChestPainType: formData.ChestPainType,
          RestingBP: parseInt(formData.RestingBP),
          Cholesterol: parseInt(formData.Cholesterol),
          FastingBS: parseInt(formData.FastingBS),
          RestingECG: formData.RestingECG,
          MaxHR: parseInt(formData.MaxHR),
          ExerciseAngina: formData.ExerciseAngina,
          Oldpeak: parseFloat(formData.Oldpeak),
          ST_Slope: formData.ST_Slope,
        }],
      };
      const response = await apiClient.post(`${BASE_URL}:8080/api/heart/predict/text`, body, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.status === 200 && response.data) {
        const result = response.data.data || response.data;
        setHeartResult({ riskLevel: result.riskLevel || "Unknown", probability: result.probability || 0 });
      }
    } catch (error) {
      setHeartError(parseApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

  // ── Patient History ────────────────────────────────────────────────────────

  const handlePatientSearch = useCallback(async () => {
    const name = patientSearchText.trim();
    if (!name) {
      setPatientError({ type: "general", message: "Please enter a patient name to search." });
      return;
    }
    setPatientLoading(true);
    setPatientError(null);
    setPatientDiagnosisList([]);
    try {
      const response = await axios.get(`${BASE_URL}:8080/api/patient/${encodeURIComponent(name)}/predictions`, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });
      if (response.status === 200 && response.data) {
        const predictions = Array.isArray(response.data.data || response.data)
          ? (response.data.data || response.data) : [];
        const transformed = predictions
          .filter(p => p && p.date && p.riskLevel)
          .map(prediction => {
            const inputData = prediction.inputData || {};
            const symptoms = [
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
            ].filter(s => !s.includes("N/A"));
            return {
              date: new Date(prediction.date).toISOString().split("T")[0],
              symptoms,
              prediction: `Heart Disease ${prediction.riskLevel} (${((prediction.probability || 0) * 100).toFixed(1)}%)`,
              medicines: getMedicineRecommendations(prediction.riskLevel),
              transcript: inputData.transcript || "",
              summary: prediction.summary || "",
              deIdentifiedTranscript: prediction.deIdentifiedTranscript || "",
            };
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setPatientDiagnosisList(transformed);
        if (transformed.length === 0) {
          setPatientError({ type: "general", message: `No predictions found for "${name}".` });
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setPatientError({ type: "general", message: `No predictions found for "${name}".` });
      } else if (error.code === "ECONNABORTED") {
        setPatientError({ type: "general", message: "Request timed out. Please try again." });
      } else {
        setPatientError(parseApiError(error));
      }
    } finally {
      setPatientLoading(false);
    }
  }, [patientSearchText, getMedicineRecommendations]);

  const handleRetrySearch = useCallback(() => {
    setPatientError(null);
    handlePatientSearch();
  }, [handlePatientSearch]);

  // ── ECG ────────────────────────────────────────────────────────────────────

  const startEcgPulse = useCallback(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(ecgPulseAnim, { toValue: 1.03, duration: 700, useNativeDriver: true }),
      Animated.timing(ecgPulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
    ])).start();
  }, [ecgPulseAnim]);

  const stopEcgPulse = useCallback(() => {
    ecgPulseAnim.stopAnimation();
    Animated.timing(ecgPulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [ecgPulseAnim]);

  const pickEcgImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setEcgError({ type: "general", message: "Please allow access to your photo library." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 1,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setEcgImage({ uri: asset.uri, name: asset.fileName || asset.uri.split("/").pop() || `ecg_${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" });
      setEcgResult(null);
      setEcgError(null);
    }
  }, []);

  const takeEcgPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setEcgError({ type: "general", message: "Please allow camera access." });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setEcgImage({ uri: asset.uri, name: asset.fileName || `ecg_photo_${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" });
      setEcgResult(null);
      setEcgError(null);
    }
  }, []);

  const handleEcgAnalyze = useCallback(async () => {
    if (!ecgPatientName.trim()) {
      setEcgError({ type: "general", message: "Please enter the patient name." });
      return;
    }
    if (!ecgImage) {
      setEcgError({ type: "general", message: "Please select or capture an ECG image." });
      return;
    }
    setEcgLoading(true);
    setEcgError(null);
    setEcgResult(null);
    startEcgPulse();
    try {
      const data = new FormData();
      data.append("patientName", ecgPatientName.trim());
      const isWebPlatform = typeof document !== "undefined";
      if (isWebPlatform) {
        const fetchResponse = await fetch(ecgImage.uri);
        const blob = await fetchResponse.blob();
        data.append("ecgImage", new File([blob], ecgImage.name, { type: ecgImage.type || "image/jpeg" }));
      } else {
        data.append("ecgImage", { uri: ecgImage.uri, name: ecgImage.name, type: ecgImage.type || "image/jpeg" });
      }
      const response = await apiClient.post(`${BASE_URL}:8080/api/ecg/predict`, data, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
        transformRequest: (d) => d,
      });
      if (response.status === 200 && response.data) {
        setEcgResult(response.data?.data ?? response.data);
      } else {
        setEcgError({ type: "general", message: "Unexpected response from ECG server." });
      }
    } catch (err) {
      setEcgError(parseApiError(err));
    } finally {
      setEcgLoading(false);
      stopEcgPulse();
    }
  }, [ecgPatientName, ecgImage, startEcgPulse, stopEcgPulse]);

  const ecgDiagConfig = ecgResult
    ? (ECG_DIAGNOSIS_CONFIG[ecgResult.diagnosis] ?? ECG_DIAGNOSIS_CONFIG["Abnormal"])
    : null;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      <LinearGradient colors={G.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={main.topBar}>
        <LinearGradient colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.07)"]} style={main.topBarIcon}>
          <MaterialCommunityIcons name="heart-pulse" size={24} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={main.topBarTitle}>CardioAI</Text>
          <Text style={main.topBarSub}>Heart Disease Prediction System</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={main.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={15} color="#fff" />
          <Text style={main.logoutText}>Logout</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: isWeb ? 28 : 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: C.bg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[{ flex: 1 }, isWeb && { width: 780, alignSelf: "center" }]}>

          {/* ══ AUDIO PREDICTION ══ */}
          <AudioSection
            audioPatientName={audioPatientName}
            onNameChange={handleAudioNameChange}
            isRecording={isRecording}
            isUploading={isUploading}
            onRecord={handleRecord}
            audioError={audioError}
            onDismissError={dismissAudioError}
          />
          {audioDiagnosisResult ? (
            <View style={{ marginTop: 12 }}>
              <PatientDiagnosisItem item={audioDiagnosisResult} />
            </View>
          ) : null}

          {/* ══ MANUAL PREDICTION ══ */}
          <ManualPredictionSection
            formData={formData}
            onFieldChange={fieldHandlers}
            isSubmitting={isSubmitting}
            onSubmit={handleHeartSubmit}
          />
          {heartError ? <ErrorCard error={heartError} onDismiss={dismissHeartError} /> : null}
          {heartResult ? (
            <View style={main.resultCard}>
              <LinearGradient
                colors={heartResult.riskLevel?.toLowerCase() === "high" ? G.red : G.green}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={main.resultCardInner}
              >
                <View style={main.resultIconWrap}>
                  <MaterialCommunityIcons name="heart-pulse" size={30} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={main.resultLabel}>Risk Level</Text>
                  <Text style={main.resultValue}>{heartResult.riskLevel}</Text>
                </View>
                <View style={main.resultProbWrap}>
                  <Text style={main.resultProbValue}>{(heartResult.probability * 100).toFixed(1)}%</Text>
                  <Text style={main.resultProbLabel}>Probability</Text>
                </View>
              </LinearGradient>
            </View>
          ) : null}

          {/* ══ ECG ANALYSIS ══ */}
          <ECGSection
            ecgPatientName={ecgPatientName}
            onNameChange={handleEcgNameChange}
            ecgImage={ecgImage}
            ecgLoading={ecgLoading}
            ecgError={ecgError}
            onDismissError={dismissEcgError}
            ecgPulseAnim={ecgPulseAnim}
            onPickImage={pickEcgImage}
            onTakePhoto={takeEcgPhoto}
            onAnalyze={handleEcgAnalyze}
          />

          {/* ECG Results */}
          {ecgResult && ecgDiagConfig ? (
            <View style={{ marginTop: 16 }}>
              <LinearGradient colors={ecgDiagConfig.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ecgS.diagBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={ecgS.diagLabel}>DIAGNOSIS</Text>
                  <Text style={ecgS.diagName}>{ecgResult.diagnosis}</Text>
                  <Text style={ecgS.diagFullName}>{ecgDiagConfig.label}</Text>
                </View>
                <View style={ecgS.diagConfidWrap}>
                  <Text style={ecgS.diagConfidValue}>{ecgResult.confidence?.toFixed(1)}%</Text>
                  <Text style={ecgS.diagConfidLabel}>Confidence</Text>
                </View>
              </LinearGradient>

              <View style={ecgS.patientRow}>
                <MaterialCommunityIcons name="account-circle" size={15} color={C.blue} />
                <Text style={ecgS.patientRowText}>
                  Patient: <Text style={{ color: C.textPrimary, fontWeight: "700" }}>{ecgPatientName}</Text>
                </Text>
              </View>

              <SectionCard>
                <ECGResultSection title="Clinical Interpretation" icon="stethoscope" iconColor={C.blue} defaultOpen>
                  <Text style={ecgS.interpretText}>{ecgResult.interpretation}</Text>
                </ECGResultSection>
                <ECGResultSection title="Territorial Distribution" icon="map-marker-radius" iconColor={C.amber} defaultOpen>
                  <Text style={ecgS.primaryTerr}>
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
                  <View style={ecgS.zoneGrid}>
                    {ecgResult.waveformZones &&
                      Object.entries(ecgResult.waveformZones).map(([zone, val]) => (
                        <ECGZonePill key={zone}
                          label={zone.replace("_zone", "").replace("_", " ")}
                          value={val} color={ZONE_COLORS[zone] ?? C.blue}
                          dominant={zone === ecgResult.dominantZone} />
                      ))}
                  </View>
                </ECGResultSection>
                <ECGResultSection title="Injury Pattern Indices" icon="heart-broken" iconColor={C.red} defaultOpen={false}>
                  <View style={ecgS.indicesRow}>
                    <View style={[ecgS.indexCard, { backgroundColor: C.redLight, borderColor: C.red + "40" }]}>
                      <Text style={ecgS.indexTitle}>Acute Injury</Text>
                      <Text style={[ecgS.indexValue, { color: C.red }]}>
                        {ecgResult.injuryIndices?.acute_injury_index?.toFixed(4)}
                      </Text>
                    </View>
                    <View style={[ecgS.indexCard, { backgroundColor: C.purpleLight, borderColor: C.purple + "40" }]}>
                      <Text style={ecgS.indexTitle}>Chronic Remodel</Text>
                      <Text style={[ecgS.indexValue, { color: C.purple }]}>
                        {ecgResult.injuryIndices?.chronic_remodeling_index?.toFixed(4)}
                      </Text>
                    </View>
                  </View>
                  <View style={ecgS.compareRow}>
                    <MaterialCommunityIcons
                      name={ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index
                        ? "trending-up" : "trending-down"}
                      size={16}
                      color={ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index
                        ? C.red : C.purple}
                    />
                    <Text style={ecgS.compareText}>
                      {ecgResult.injuryIndices?.acute_injury_index > ecgResult.injuryIndices?.chronic_remodeling_index
                        ? "Acute injury pattern dominant" : "Chronic remodeling pattern dominant"}
                    </Text>
                  </View>
                </ECGResultSection>
              </SectionCard>

          
            </View>
          ) : null}

          {/* ══ PATIENT HISTORY ══ */}
          <PatientHistorySection
            patientSearchText={patientSearchText}
            onSearchChange={handleSearchTextChange}
            onSearch={handlePatientSearch}
            patientLoading={patientLoading}
          />

          {patientLoading ? (
            <View style={main.stateBox}>
              <ActivityIndicator size="large" color={C.blue} />
              <Text style={main.stateText}>Searching patient history...</Text>
            </View>
          ) : patientError ? (
            <View style={{ marginTop: 8 }}>
              <ErrorCard error={patientError} onDismiss={dismissPatientError} />
              <TouchableOpacity onPress={handleRetrySearch} style={[main.retryBtn, { marginTop: 10, alignSelf: "center" }]}>
                <Text style={main.retryBtnText}>Retry Search</Text>
              </TouchableOpacity>
            </View>
          ) : patientDiagnosisList.length > 0 ? (
            <FlatList
              data={patientDiagnosisList}
              renderItem={renderPatientDiagnosisItem}
              keyExtractor={(item, i) => `${item.date}-${i}`}
              scrollEnabled={false}
              style={{ marginTop: 12 }}
            />
          ) : null}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const prim = StyleSheet.create({
  sectionCard: {
    backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 20, shadowColor: "#1E3A8A", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09, shadowRadius: 12, elevation: 4,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  sectionHeadingIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sectionHeadingTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, letterSpacing: 0.2 },
  sectionHeadingSubtitle: { fontSize: 12, color: C.textSecond, marginTop: 2 },
  floatWrap: { marginBottom: 14 },
  floatLabel: { fontSize: 10, fontWeight: "700", color: C.textSecond, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  floatBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceBlu,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, minHeight: 50,
  },
  floatBoxDisabled: { opacity: 0.45 },
  floatInput: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 12 },
  pickerInner: { flex: 1, color: C.textPrimary, height: 50, backgroundColor: "transparent" },
  btnWrap: {
    borderRadius: 14, overflow: "hidden", marginTop: 6,
    shadowColor: C.darkBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15 },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
});

const main = StyleSheet.create({
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,
  },
  topBarIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  topBarTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  topBarSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  twoCol: { flexDirection: "row", gap: 12 },
  recordBtnWrap: {
    borderRadius: 14, overflow: "hidden", marginTop: 6,
    shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  recordBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15 },
  recordBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff", marginLeft: 10, opacity: 0.9 },
  resultCard: { marginTop: 14, borderRadius: 16, overflow: "hidden" },
  resultCardInner: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  resultIconWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  resultLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1.2 },
  resultValue: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 3 },
  resultProbWrap: { alignItems: "flex-end" },
  resultProbValue: { fontSize: 30, fontWeight: "800", color: "#fff" },
  resultProbLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1 },
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
});

const hist = StyleSheet.create({
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

const ecgS = StyleSheet.create({
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
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 7, padding: 12, marginTop: 4, marginBottom: 8 },
  disclaimerText: { color: C.textMuted, fontSize: 11, flex: 1, lineHeight: 17 },
});

const errS = StyleSheet.create({
  wrap: {
    marginTop: 14, borderRadius: 14, borderWidth: 1,
    borderColor: C.red + "40", backgroundColor: C.redLight, overflow: "hidden",
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.red + "20",
    backgroundColor: C.red + "12",
  },
  headerText: { fontSize: 14, fontWeight: "700", color: C.red, flex: 1 },
  dismissBtn: { padding: 4 },
  fieldList: { padding: 14, gap: 6 },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  fieldDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.red, marginTop: 7 },
  fieldName: { fontSize: 13, fontWeight: "700", color: C.textPrimary },
  fieldMsg: { fontSize: 13, color: C.red, flex: 1 },
});