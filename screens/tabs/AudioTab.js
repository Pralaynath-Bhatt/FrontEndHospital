// tabs/AudioTab.jsx
// Flow: Record → Transcript + Summary + Extracted Data → Doctor edits → Send to manual model
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions, Alert, TextInput, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Audio } from "expo-av";

import { C, G } from "../Constraint";
import {
  SectionCard, SectionHeading, FloatingInput,
  PrimaryButton, Divider, TwoCol, ErrorCard, parseApiError,
} from "./SharedComponents";
import BASE_URL from "../Config";
import apiClient from "../Apiclient";

// Conditionally import native-only modules to avoid web bundling errors
let FileSystem, Sharing;
if (Platform.OS !== "web") {
  FileSystem = require("expo-file-system");
  Sharing    = require("expo-sharing");
}

const { width } = Dimensions.get("window");
const isWeb = width > 900;

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ["Record", "Review", "Result"];

const StepBar = ({ current }) => (
  <View style={s.stepBar}>
    {STEPS.map((label, i) => {
      const done   = i < current;
      const active = i === current;
      return (
        <React.Fragment key={label}>
          <View style={s.stepItem}>
            <LinearGradient
              colors={done ? G.green : active ? G.blue : ["#E2E8F0", "#CBD5E1"]}
              style={s.stepCircle}
            >
              {done
                ? <MaterialCommunityIcons name="check" size={14} color="#fff" />
                : <Text style={[s.stepNum, active && { color: "#fff" }]}>{i + 1}</Text>}
            </LinearGradient>
            <Text style={[
              s.stepLabel,
              active && { color: C.blue, fontWeight: "700" },
              done && { color: C.green },
            ]}>
              {label}
            </Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[s.stepLine, done && { backgroundColor: C.green }]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

// ─── Confidence badge ─────────────────────────────────────────────────────────
const FieldBadge = ({ extracted }) => (
  <View style={[s.badge, extracted ? s.badgeGreen : s.badgeAmber]}>
    <MaterialCommunityIcons
      name={extracted ? "check-circle" : "alert-circle"}
      size={11}
      color={extracted ? C.green : C.amber}
    />
    <Text style={[s.badgeText, { color: extracted ? C.green : C.amber }]}>
      {extracted ? "Extracted" : "Verify"}
    </Text>
  </View>
);

// ─── Reusable text input ──────────────────────────────────────────────────────
const TextInputInline = ({ value, onChangeText, keyboardType }) => (
  <TextInput
    style={{
      flex: 1, fontSize: 15, color: C.textPrimary,
      paddingVertical: 12, outlineStyle: "none",
    }}
    value={value}
    onChangeText={onChangeText}
    keyboardType={keyboardType || "default"}
    placeholderTextColor={C.textMuted}
  />
);

// ─── Field wrapper with confidence badge ──────────────────────────────────────
const Field = ({ label, icon, conf, children }) => (
  <View style={s.fieldWrap}>
    <View style={s.fieldHeaderRow}>
      <Text style={s.floatLabel}>{label}</Text>
      {conf !== undefined && <FieldBadge extracted={conf} />}
    </View>
    <View style={[s.floatBox, conf === false && s.floatBoxWarning]}>
      {icon && (
        <MaterialCommunityIcons
          name={icon} size={18}
          color={conf === false ? C.amber : C.textMuted}
          style={{ marginRight: 10 }}
        />
      )}
      {children}
    </View>
  </View>
);

// ─── Main AudioTab ────────────────────────────────────────────────────────────
export default function AudioTab() {
  const [step, setStep]               = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording]     = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [audioError, setAudioError]   = useState(null);

  const [transcript, setTranscript] = useState("");
  const [summary, setSummary]       = useState("");
  const [confidence, setConfidence] = useState({});
  const [stats, setStats]           = useState(null);

  const [formData, setFormData] = useState({
    Age: "", Sex: "M", ChestPainType: "NAP",
    RestingBP: "", Cholesterol: "", FastingBS: "0",
    RestingECG: "Normal", MaxHR: "", ExerciseAngina: "N",
    Oldpeak: "", ST_Slope: "Up",
  });

  const [isPredicting, setIsPredicting] = useState(false);
  const [predResult, setPredResult]     = useState(null);
  const [predError, setPredError]       = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError]         = useState(null);

  const dismissAudioError = useCallback(() => setAudioError(null), []);
  const dismissPredError  = useCallback(() => setPredError(null), []);
  const dismissPdfError   = useCallback(() => setPdfError(null), []);
  const set = useCallback((key) => (v) => setFormData(p => ({ ...p, [key]: v })), []);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted")
        Alert.alert("Permission required", "Microphone permission is needed to record.");
    })();
  }, []);

  // ── Recording ───────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setAudioError(null);
      setIsRecording(true);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY,
      );
      setRecording(rec);
    } catch (error) {
      setIsRecording(false);
      setAudioError({ type: "general", message: "Failed to start recording: " + error.message });
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return;

    if (!patientName.trim()) {
      setAudioError({ type: "general", message: "Please enter the patient name before stopping." });
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
      fd.append("patientName", patientName.trim());

      if (uri.startsWith("blob:") || uri.startsWith("data:")) {
        const blob = await (await fetch(uri)).blob();
        const fn   = `recording_${Date.now()}.m4a`;
        fd.append("audioFile", new File([blob], fn, { type: "audio/m4a" }), fn);
      } else {
        const parts = uri.split("/");
        fd.append("audioFile", { uri, name: parts[parts.length - 1], type: "audio/m4a" });
      }

      const response = await apiClient.post(
        `${BASE_URL}/api/heart/predict/audio`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 90000 },
      );

      const outer = response.data;
      const inner = outer?.data || outer;

      if (inner?.success === true || outer?.success === true) {
        const ex   = inner.extractedData || {};
        const conf = inner.confidence    || {};

        setFormData({
          Age:            ex.Age?.toString()         || "",
          Sex:            ex.Sex                     || "M",
          ChestPainType:  ex.ChestPainType           || "NAP",
          RestingBP:      ex.RestingBP?.toString()   || "",
          Cholesterol:    ex.Cholesterol?.toString() || "",
          FastingBS:      ex.FastingBS?.toString()   || "0",
          RestingECG:     ex.RestingECG              || "Normal",
          MaxHR:          ex.MaxHR?.toString()       || "",
          ExerciseAngina: ex.ExerciseAngina          || "N",
          Oldpeak:        ex.Oldpeak?.toString()     || "",
          ST_Slope:       ex.ST_Slope                || "Up",
        });

        setTranscript(inner.transcript  || "");
        const rawSummary = inner.summary || "";
        setSummary(rawSummary.split("\n\n⚠")[0].trim());
        setConfidence(conf);
        setStats(inner.stats || null);
        setPatientName(inner.patient_name || patientName);
        setStep(1);
      } else {
        setAudioError({
          type: "general",
          message: inner?.error || outer?.message || "Transcription failed.",
        });
      }
    } catch (error) {
      setAudioError(parseApiError(error));
    } finally {
      setIsUploading(false);
      setRecording(null);
    }
  }, [recording, patientName]);

  const handleRecord = useCallback(() => {
    if (isRecording) stopRecording(); else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ── Prediction ──────────────────────────────────────────────────────────────
  const handlePredict = useCallback(async () => {
    const required = ["Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"];
    for (const f of required) {
      if (!formData[f]?.toString().trim() || isNaN(parseFloat(formData[f]))) {
        setPredError({
          type: "general",
          message: `${f.replace(/([A-Z])/g, " $1").trim()} is required and must be a number.`,
        });
        return;
      }
    }

    try {
      setIsPredicting(true);
      setPredResult(null);
      setPredError(null);

      const body = {
        patientName: patientName.trim(),
        patientData: [{
          Age:            parseInt(formData.Age),
          Sex:            formData.Sex,
          ChestPainType:  formData.ChestPainType,
          RestingBP:      parseInt(formData.RestingBP),
          Cholesterol:    parseInt(formData.Cholesterol),
          FastingBS:      parseInt(formData.FastingBS),
          RestingECG:     formData.RestingECG,
          MaxHR:          parseInt(formData.MaxHR),
          ExerciseAngina: formData.ExerciseAngina,
          Oldpeak:        parseFloat(formData.Oldpeak),
          ST_Slope:       formData.ST_Slope,
        }],
        audioTranscript: transcript,
        audioSummary:    summary,
      };

      const response = await apiClient.post(
        `${BASE_URL}/api/heart/predict/text`,
        body,
        { headers: { "Content-Type": "application/json" } },
      );

      const outer  = response.data;
      const result = outer?.data || outer;

      if (response.status === 200 && result) {
        setPredResult({
          riskLevel:   result.riskLevel   || result.RiskLevel   || "Unknown",
          probability: result.probability || result.Probability || 0,
          diagnosis:   result.riskLevel   || result.RiskLevel   || "Unknown",
          confidence:  (result.probability || result.Probability || 0) * 100,
        });
        setStep(2);
      }
    } catch (error) {
      setPredError(parseApiError(error));
    } finally {
      setIsPredicting(false);
    }
  }, [formData, patientName, transcript, summary]);

  // ── PDF Download ─────────────────────────────────────────────────────────────
  const buildPdfBody = useCallback(() => ({
    patientName: patientName.trim(),
    patientData: [{
      Age:            parseInt(formData.Age),
      Sex:            formData.Sex,
      ChestPainType:  formData.ChestPainType,
      RestingBP:      parseInt(formData.RestingBP),
      Cholesterol:    parseInt(formData.Cholesterol),
      FastingBS:      parseInt(formData.FastingBS),
      RestingECG:     formData.RestingECG,
      MaxHR:          parseInt(formData.MaxHR),
      ExerciseAngina: formData.ExerciseAngina,
      Oldpeak:        parseFloat(formData.Oldpeak),
      ST_Slope:       formData.ST_Slope,
    }],
    audioTranscript: transcript,
    audioSummary:    summary,
  }), [formData, patientName, transcript, summary]);

  const downloadPdf = useCallback(async () => {
  try {
    setIsPdfLoading(true);
    setPdfError(null);

    const body = buildPdfBody();
    const fileName = `${patientName.trim() || "report"}_heart_report.pdf`;

    // ─────────────────────────────────────────────
    // API CALL USING apiClient (TOKEN AUTO INCLUDED)
    // ─────────────────────────────────────────────
    const response = await apiClient.post(
      `${BASE_URL}/api/heart/predict/text/pdf`,
      body,
      {
        responseType: "blob", // 🔥 VERY IMPORTANT
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const blob = response.data;

    // ─────────────────────────────────────────────
    // 🌐 WEB DOWNLOAD
    // ─────────────────────────────────────────────
    if (Platform.OS === "web") {
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

    // ─────────────────────────────────────────────
    // 📱 MOBILE (ANDROID / IOS)
    // ─────────────────────────────────────────────
    else {
      const base64 = await blobToBase64(blob);

      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "Download Heart Report",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `Report saved to:\n${fileUri}`);
      }
    }

  } catch (error) {
    setPdfError(parseApiError(error));
  } finally {
    setIsPdfLoading(false);
  }
}, [buildPdfBody, patientName]);

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const base64data = reader.result.split(",")[1];
      resolve(base64data);
    };
    reader.readAsDataURL(blob);
  });
};

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setStep(0);
    setIsRecording(false);
    setRecording(null);
    setPatientName("");
    setTranscript("");
    setSummary("");
    setConfidence({});
    setStats(null);
    setFormData({
      Age: "", Sex: "M", ChestPainType: "NAP", RestingBP: "", Cholesterol: "",
      FastingBS: "0", RestingECG: "Normal", MaxHR: "", ExerciseAngina: "N",
      Oldpeak: "", ST_Slope: "Up",
    });
    setPredResult(null);
    setPredError(null);
    setAudioError(null);
    setPdfError(null);
  }, []);

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={{ padding: isWeb ? 28 : 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: C.bg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[{ flex: 1 }, isWeb && { width: 780, alignSelf: "center" }]}>

        <StepBar current={step} />

        {/* ══ STEP 0 — RECORD ══════════════════════════════════════════════════ */}
        {step === 0 && (
          <SectionCard style={{ marginTop: 12 }}>
            <SectionHeading
              icon="microphone" title="Audio-Based Prediction" color={C.purple}
              subtitle="Record the consultation — we'll transcribe and extract clinical data for you to review"
            />
            <Divider />

            <FloatingInput
              label="Patient Name" icon="account" value={patientName}
              onChangeText={setPatientName} placeholder="e.g. John Doe"
              editable={!isRecording && !isUploading}
            />

            <TouchableOpacity
              onPress={handleRecord} disabled={isUploading}
              activeOpacity={0.85} style={s.recordBtnWrap}
            >
              <LinearGradient
                colors={isRecording ? G.red : G.purple}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.recordBtn}
              >
                {isUploading
                  ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: 12 }} />
                  : <MaterialCommunityIcons
                      name={isRecording ? "stop-circle" : "microphone"}
                      size={24} color="#fff" style={{ marginRight: 12 }}
                    />
                }
                <Text style={s.recordBtnText}>
                  {isUploading
                    ? "Transcribing & extracting..."
                    : isRecording ? "Stop Recording" : "Start Recording"}
                </Text>
                {isRecording && <View style={s.recordingDot} />}
              </LinearGradient>
            </TouchableOpacity>

            {isUploading && (
              <View style={s.hint}>
                <MaterialCommunityIcons name="information-outline" size={14} color={C.textMuted} />
                <Text style={s.hintText}>
                  Transcribing audio and extracting clinical data — this may take a moment.
                </Text>
              </View>
            )}

            {audioError && <ErrorCard error={audioError} onDismiss={dismissAudioError} />}
          </SectionCard>
        )}

        {/* ══ STEP 1 — REVIEW & EDIT ═══════════════════════════════════════════ */}
        {step === 1 && (
          <>
            {/* Transcript card */}
            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading icon="text-to-speech" title="Transcript" color={C.blue} />
              <Divider />
              <View style={s.transcriptBox}>
                <Text style={s.transcriptText}>
                  {transcript || "No transcript available."}
                </Text>
              </View>
            </SectionCard>

            {/* Clinical summary card */}
            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading
                icon="file-document-outline" title="Clinical Summary"
                subtitle="Auto-generated from confirmed fields only" color={C.cyan}
              />
              <Divider />
              <Text style={s.summaryText}>{summary}</Text>
              {stats && (
                <View style={s.statsRow}>
                  <View style={[s.statChip, { backgroundColor: C.greenLight }]}>
                    <MaterialCommunityIcons name="check-circle" size={13} color={C.green} />
                    <Text style={[s.statChipText, { color: C.green }]}>
                      {stats.extracted_fields} extracted
                    </Text>
                  </View>
                  <View style={[s.statChip, { backgroundColor: C.amberLight }]}>
                    <MaterialCommunityIcons name="alert-circle" size={13} color={C.amber} />
                    <Text style={[s.statChipText, { color: C.amber }]}>
                      {stats.defaulted_fields} need review
                    </Text>
                  </View>
                </View>
              )}
            </SectionCard>

            {/* Edit form card */}
            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading
                icon="pencil-box-multiple" title="Review & Edit" color={C.amber}
                subtitle="Amber fields were not detected — verify before predicting"
              />
              <Divider />

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <Field label="Age" icon="calendar" conf={confidence.Age}>
                    <TextInputInline value={formData.Age} onChangeText={set("Age")} keyboardType="numeric" />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Sex" conf={confidence.Sex}>
                    <Picker selectedValue={formData.Sex} onValueChange={set("Sex")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                      <Picker.Item label="Male (M)"   value="M" />
                      <Picker.Item label="Female (F)" value="F" />
                    </Picker>
                  </Field>
                </View>
              </TwoCol>

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <Field label="Chest Pain Type" conf={confidence.ChestPainType}>
                    <Picker selectedValue={formData.ChestPainType} onValueChange={set("ChestPainType")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                      <Picker.Item label="TA – Typical Angina" value="TA"  />
                      <Picker.Item label="ATA – Atypical"      value="ATA" />
                      <Picker.Item label="NAP – Non-Anginal"   value="NAP" />
                      <Picker.Item label="ASY – Asymptomatic"  value="ASY" />
                    </Picker>
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Exercise Angina" conf={confidence.ExerciseAngina}>
                    <Picker selectedValue={formData.ExerciseAngina} onValueChange={set("ExerciseAngina")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                      <Picker.Item label="No"  value="N" />
                      <Picker.Item label="Yes" value="Y" />
                    </Picker>
                  </Field>
                </View>
              </TwoCol>

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <Field label="Resting BP (mm Hg)" icon="pulse" conf={confidence.RestingBP}>
                    <TextInputInline value={formData.RestingBP} onChangeText={set("RestingBP")} keyboardType="numeric" />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Cholesterol (mg/dl)" icon="water" conf={confidence.Cholesterol}>
                    <TextInputInline value={formData.Cholesterol} onChangeText={set("Cholesterol")} keyboardType="numeric" />
                  </Field>
                </View>
              </TwoCol>

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <Field label="Max Heart Rate" icon="heart-flash" conf={confidence.MaxHR}>
                    <TextInputInline value={formData.MaxHR} onChangeText={set("MaxHR")} keyboardType="numeric" />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Oldpeak (ST Depr.)" icon="chart-line" conf={confidence.Oldpeak}>
                    <TextInputInline value={formData.Oldpeak} onChangeText={set("Oldpeak")} keyboardType="decimal-pad" />
                  </Field>
                </View>
              </TwoCol>

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <Field label="Fasting Blood Sugar" conf={confidence.FastingBS}>
                    <Picker selectedValue={formData.FastingBS} onValueChange={set("FastingBS")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                      <Picker.Item label="Normal (≤120)" value="0" />
                      <Picker.Item label="High (>120)"   value="1" />
                    </Picker>
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Resting ECG" conf={confidence.RestingECG}>
                    <Picker selectedValue={formData.RestingECG} onValueChange={set("RestingECG")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                      <Picker.Item label="Normal" value="Normal" />
                      <Picker.Item label="ST"     value="ST"     />
                      <Picker.Item label="LVH"    value="LVH"    />
                    </Picker>
                  </Field>
                </View>
              </TwoCol>

              <Field label="ST Slope" conf={confidence.ST_Slope}>
                <Picker selectedValue={formData.ST_Slope} onValueChange={set("ST_Slope")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                  <Picker.Item label="Up"   value="Up"   />
                  <Picker.Item label="Flat" value="Flat" />
                  <Picker.Item label="Down" value="Down" />
                </Picker>
              </Field>

              {predError && <ErrorCard error={predError} onDismiss={dismissPredError} />}

              <View style={s.actionRow}>
                <TouchableOpacity onPress={handleReset} style={s.backBtn}>
                  <MaterialCommunityIcons name="arrow-left" size={16} color={C.textSecond} />
                  <Text style={s.backBtnText}>Re-record</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Confirm & Predict" icon="heart-search"
                    onPress={handlePredict} loading={isPredicting}
                    disabled={isPredicting} gradient={G.blue}
                  />
                </View>
              </View>
            </SectionCard>
          </>
        )}

        {/* ══ STEP 2 — RESULT ══════════════════════════════════════════════════ */}
        {step === 2 && predResult && (
          <>
            {/* Risk result banner */}
            <View style={s.resultCard}>
              <LinearGradient
                colors={predResult.riskLevel?.toLowerCase().includes("high") ? G.red : G.green}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.resultCardInner}
              >
                <View style={s.resultIconWrap}>
                  <MaterialCommunityIcons name="heart-pulse" size={30} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resultPatient}>{patientName}</Text>
                  <Text style={s.resultValue}>{predResult.riskLevel}</Text>
                  <Text style={s.resultSub}>Via audio consultation</Text>
                </View>
                <View style={s.resultProbWrap}>
                  <Text style={s.resultProbValue}>
                    {(predResult.probability * 100).toFixed(1)}%
                  </Text>
                  <Text style={s.resultProbLabel}>Probability</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Transcript reference */}
            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading icon="text-to-speech" title="Transcript Reference" color={C.textMuted} />
              <Divider />
              <View style={s.transcriptBox}>
                <Text style={s.transcriptText}>{transcript}</Text>
              </View>
            </SectionCard>

            {/* ── PDF Report Card ── */}
            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading
                icon="file-pdf-box" title="Download Report" color={C.purple}
                subtitle="Generate a full PDF report for this consultation"
              />
              <Divider />
              <PrimaryButton
                label={isPdfLoading ? "Generating PDF…" : "Download PDF Report"}
                icon="download"
                onPress={downloadPdf}
                loading={isPdfLoading}
                disabled={isPdfLoading}
                gradient={G.purple}
              />
            </SectionCard>

            {pdfError && (
              <View style={{ marginTop: 8 }}>
                <ErrorCard error={pdfError} onDismiss={dismissPdfError} />
              </View>
            )}

            <TouchableOpacity
              onPress={handleReset}
              style={[s.backBtn, { alignSelf: "center", marginTop: 20 }]}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color={C.blue} />
              <Text style={[s.backBtnText, { color: C.blue }]}>New recording</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Step bar
  stepBar:    { flexDirection: "row", alignItems: "center", marginBottom: 4, paddingHorizontal: 8 },
  stepItem:   { alignItems: "center", gap: 4 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNum:    { fontSize: 12, fontWeight: "700", color: C.textMuted },
  stepLabel:  { fontSize: 11, color: C.textMuted, fontWeight: "500" },
  stepLine:   { flex: 1, height: 2, backgroundColor: C.border, marginHorizontal: 6, marginBottom: 16 },

  // Record button
  recordBtnWrap: {
    borderRadius: 14, overflow: "hidden", marginTop: 6,
    shadowColor: C.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  recordBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15 },
  recordBtnText:  { fontSize: 16, fontWeight: "700", color: "#fff" },
  recordingDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff", marginLeft: 10, opacity: 0.9 },
  hint:           { flexDirection: "row", gap: 6, alignItems: "flex-start", marginTop: 10, paddingHorizontal: 4 },
  hintText:       { color: C.textMuted, fontSize: 12, flex: 1, lineHeight: 18 },

  // Transcript / summary
  transcriptBox:  { backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  transcriptText: { color: C.textSecond, fontSize: 13, lineHeight: 22, fontStyle: "italic" },
  summaryText:    { color: C.textSecond, fontSize: 13, lineHeight: 22, marginBottom: 12 },
  statsRow:       { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statChip:       { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  statChipText:   { fontSize: 12, fontWeight: "700" },

  // Form fields
  fieldWrap:      { marginBottom: 14 },
  fieldHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  floatLabel:     { fontSize: 10, fontWeight: "700", color: C.textSecond, letterSpacing: 1.2, textTransform: "uppercase" },
  floatBox:       { flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceBlu, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, minHeight: 50 },
  floatBoxWarning:{ borderColor: C.amber, backgroundColor: "#FEF3C755" },
  pickerInner:    { flex: 1, color: C.textPrimary, height: 50, backgroundColor: "transparent" },

  // Badges
  badge:      { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeGreen: { backgroundColor: C.greenLight },
  badgeAmber: { backgroundColor: C.amberLight },
  badgeText:  { fontSize: 10, fontWeight: "600" },

  // Action row
  actionRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  backBtn:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  backBtnText: { fontSize: 13, fontWeight: "600", color: C.textSecond },

  // Result card
  resultCard:       { marginTop: 12, borderRadius: 16, overflow: "hidden" },
  resultCardInner:  { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  resultIconWrap:   { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  resultPatient:    { fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1.2 },
  resultValue:      { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 3 },
  resultSub:        { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  resultProbWrap:   { alignItems: "flex-end" },
  resultProbValue:  { fontSize: 30, fontWeight: "800", color: "#fff" },
  resultProbLabel:  { fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1 },
});