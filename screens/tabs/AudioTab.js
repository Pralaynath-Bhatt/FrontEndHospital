// tabs/AudioTab.jsx
// Flow: Record → Transcript + Summary + Extracted Data → Doctor edits → Send to manual model
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions, Alert,
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
            <Text style={[s.stepLabel, active && { color: C.blue, fontWeight: "700" }, done && { color: C.green }]}>
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
      {extracted ? "Extracted" : "Defaulted — verify"}
    </Text>
  </View>
);

// ─── Inline field with confidence ────────────────────────────────────────────
const InlineField = ({ label, icon, value, onChangeText, confidence, keyboardType, children, isPicker }) => (
  <View style={s.fieldWrap}>
    <View style={s.fieldHeaderRow}>
      <Text style={s.floatLabel}>{label}</Text>
      {confidence !== undefined && <FieldBadge extracted={confidence} />}
    </View>
    <View style={[s.floatBox, confidence === false && s.floatBoxWarning]}>
      {icon && (
        <MaterialCommunityIcons
          name={icon} size={18}
          color={confidence === false ? C.amber : C.textMuted}
          style={{ marginRight: 10 }}
        />
      )}
      {isPicker ? children : (
        <TextInputInline
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
        />
      )}
      {isPicker && children}
    </View>
  </View>
);

// Plain TextInput wrapper (avoids importing TextInput at top level confusion)
import { TextInput } from "react-native";
const TextInputInline = ({ value, onChangeText, keyboardType }) => (
  <TextInput
    style={{ flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 12, outlineStyle: "none" }}
    value={value}
    onChangeText={onChangeText}
    keyboardType={keyboardType || "default"}
    placeholderTextColor={C.textMuted}
  />
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

  const dismissAudioError = useCallback(() => setAudioError(null), []);
  const dismissPredError  = useCallback(() => setPredError(null), []);
  const set = useCallback((key) => (v) => setFormData(p => ({ ...p, [key]: v })), []);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") Alert.alert("Permission required", "Microphone permission is required.");
    })();
  }, []);

  // ── Recording ───────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setAudioError(null); setIsRecording(true);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
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
      setIsRecording(false); setIsUploading(true); setAudioError(null);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) { setAudioError({ type: "general", message: "Recording URI not found." }); setIsUploading(false); return; }

      const fd = new FormData();
      fd.append("patient_name", patientName.trim());
      if (uri.startsWith("blob:") || uri.startsWith("data:")) {
        const blob = await (await fetch(uri)).blob();
        const fn = `recording_${Date.now()}.m4a`;
        fd.append("audio", new File([blob], fn, { type: "audio/m4a" }), fn);
      } else {
        const parts = uri.split("/");
        fd.append("audio", { uri, name: parts[parts.length - 1], type: "audio/m4a" });
      }

      const response = await apiClient.post(`${BASE_URL}:5001/app`, fd, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 60000,
      });
      const data = response.data;

      if (data.success) {
        const ex = data.extractedData || {};
        setFormData({
          Age:            ex.Age?.toString()         || "",
          Sex:            ex.Sex                    || "M",
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
        setTranscript(data.transcript || "");
        setSummary(data.summary || "");
        setConfidence(data.confidence || {});
        setStats(data.stats || null);
        setStep(1);
      } else {
        setAudioError({ type: "general", message: data.error || "Transcription failed." });
      }
    } catch (error) {
      setAudioError(parseApiError(error));
    } finally {
      setIsUploading(false); setRecording(null);
    }
  }, [recording, patientName]);

  const handleRecord = useCallback(() => {
    if (isRecording) stopRecording(); else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ── Prediction ──────────────────────────────────────────────────────────────
  const handlePredict = useCallback(async () => {
    const required = ["Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"];
    for (let f of required) {
      if (!formData[f]?.toString().trim() || isNaN(parseFloat(formData[f]))) {
        setPredError({ type: "general", message: `${f.replace(/([A-Z])/g, " $1").trim()} is required and must be a number.` });
        return;
      }
    }
    try {
      setIsPredicting(true); setPredResult(null); setPredError(null);
      const body = {
        patientName: patientName.trim(),
        patientData: [{
          Age:           parseInt(formData.Age),
          Sex:           formData.Sex,
          ChestPainType: formData.ChestPainType,
          RestingBP:     parseInt(formData.RestingBP),
          Cholesterol:   parseInt(formData.Cholesterol),
          FastingBS:     parseInt(formData.FastingBS),
          RestingECG:    formData.RestingECG,
          MaxHR:         parseInt(formData.MaxHR),
          ExerciseAngina:formData.ExerciseAngina,
          Oldpeak:       parseFloat(formData.Oldpeak),
          ST_Slope:      formData.ST_Slope,
        }],
        audioTranscript: transcript,
        audioSummary:    summary,
      };
      const response = await apiClient.post(`${BASE_URL}:8080/api/heart/predict/text`, body, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.status === 200 && response.data) {
        const result = response.data.data || response.data;
        setPredResult({ riskLevel: result.riskLevel || "Unknown", probability: result.probability || 0 });
        setStep(2);
      }
    } catch (error) {
      setPredError(parseApiError(error));
    } finally {
      setIsPredicting(false);
    }
  }, [formData, patientName, transcript, summary]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setStep(0); setIsRecording(false); setRecording(null); setPatientName("");
    setTranscript(""); setSummary(""); setConfidence({}); setStats(null);
    setFormData({ Age: "", Sex: "M", ChestPainType: "NAP", RestingBP: "", Cholesterol: "",
      FastingBS: "0", RestingECG: "Normal", MaxHR: "", ExerciseAngina: "N", Oldpeak: "", ST_Slope: "Up" });
    setPredResult(null); setPredError(null); setAudioError(null);
  }, []);

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={{ padding: isWeb ? 28 : 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: C.bg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[{ flex: 1 }, isWeb && { width: 780, alignSelf: "center" }]}>

        <StepBar current={step} />

        {/* ══ STEP 0 — RECORD ══ */}
        {step === 0 && (
          <SectionCard style={{ marginTop: 12 }}>
            <SectionHeading icon="microphone" title="Audio-Based Prediction"
              subtitle="Record the consultation — we'll transcribe and extract clinical data for you to review"
              color={C.purple} />
            <Divider />
            <FloatingInput label="Patient Name" icon="account" value={patientName}
              onChangeText={setPatientName} placeholder="e.g. John Doe" editable={!isRecording && !isUploading} />
            <TouchableOpacity onPress={handleRecord} disabled={isUploading} activeOpacity={0.85} style={s.recordBtnWrap}>
              <LinearGradient colors={isRecording ? G.red : G.purple} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.recordBtn}>
                {isUploading
                  ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: 12 }} />
                  : <MaterialCommunityIcons name={isRecording ? "stop-circle" : "microphone"} size={24} color="#fff" style={{ marginRight: 12 }} />}
                <Text style={s.recordBtnText}>
                  {isUploading ? "Transcribing & extracting..." : isRecording ? "Stop Recording" : "Start Recording"}
                </Text>
                {isRecording && <View style={s.recordingDot} />}
              </LinearGradient>
            </TouchableOpacity>
            {isUploading && (
              <View style={s.hint}>
                <MaterialCommunityIcons name="information-outline" size={14} color={C.textMuted} />
                <Text style={s.hintText}>Transcribing audio and extracting clinical data — this may take a moment.</Text>
              </View>
            )}
            {audioError ? <ErrorCard error={audioError} onDismiss={dismissAudioError} /> : null}
          </SectionCard>
        )}

        {/* ══ STEP 1 — REVIEW & EDIT ══ */}
        {step === 1 && (
          <>
            {/* Transcript */}
            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading icon="text-to-speech" title="Transcript" color={C.blue} />
              <Divider />
              <View style={s.transcriptBox}>
                <Text style={s.transcriptText}>{transcript || "No transcript available."}</Text>
              </View>
            </SectionCard>

            {/* Summary */}
            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading icon="file-document-outline" title="Clinical Summary"
                subtitle="Auto-generated from transcript" color={C.cyan} />
              <Divider />
              <Text style={s.summaryText}>{summary}</Text>
              {stats && (
                <View style={s.statsRow}>
                  <View style={[s.statChip, { backgroundColor: C.greenLight }]}>
                    <MaterialCommunityIcons name="check-circle" size={13} color={C.green} />
                    <Text style={[s.statChipText, { color: C.green }]}>{stats.extracted_fields} fields extracted</Text>
                  </View>
                  <View style={[s.statChip, { backgroundColor: C.amberLight }]}>
                    <MaterialCommunityIcons name="alert-circle" size={13} color={C.amber} />
                    <Text style={[s.statChipText, { color: C.amber }]}>{stats.defaulted_fields} need review</Text>
                  </View>
                </View>
              )}
            </SectionCard>

            {/* Edit form */}
            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading icon="pencil-box-multiple" title="Review & Edit"
                subtitle="Amber fields were not detected in audio — verify before predicting" color={C.amber} />
              <Divider />

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Age</Text>
                      <FieldBadge extracted={confidence.Age} />
                    </View>
                    <View style={[s.floatBox, confidence.Age === false && s.floatBoxWarning]}>
                      <MaterialCommunityIcons name="calendar" size={18} color={confidence.Age === false ? C.amber : C.textMuted} style={{ marginRight: 10 }} />
                      <TextInputInline value={formData.Age} onChangeText={set("Age")} keyboardType="numeric" />
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Sex</Text>
                      <FieldBadge extracted={confidence.Sex} />
                    </View>
                    <View style={[s.floatBox, confidence.Sex === false && s.floatBoxWarning]}>
                      <Picker selectedValue={formData.Sex} onValueChange={set("Sex")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                        <Picker.Item label="Male (M)" value="M" />
                        <Picker.Item label="Female (F)" value="F" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </TwoCol>

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Chest Pain Type</Text>
                      <FieldBadge extracted={confidence.ChestPainType} />
                    </View>
                    <View style={[s.floatBox, confidence.ChestPainType === false && s.floatBoxWarning]}>
                      <Picker selectedValue={formData.ChestPainType} onValueChange={set("ChestPainType")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                        <Picker.Item label="ATA – Asymptomatic" value="ATA" />
                        <Picker.Item label="NAP – Non-Anginal" value="NAP" />
                        <Picker.Item label="ASY – Atypical" value="ASY" />
                        <Picker.Item label="TA – Typical Angina" value="TA" />
                      </Picker>
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Exercise Angina</Text>
                      <FieldBadge extracted={confidence.ExerciseAngina} />
                    </View>
                    <View style={[s.floatBox, confidence.ExerciseAngina === false && s.floatBoxWarning]}>
                      <Picker selectedValue={formData.ExerciseAngina} onValueChange={set("ExerciseAngina")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                        <Picker.Item label="No" value="N" />
                        <Picker.Item label="Yes" value="Y" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </TwoCol>

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Resting BP (mm Hg)</Text>
                      <FieldBadge extracted={confidence.RestingBP} />
                    </View>
                    <View style={[s.floatBox, confidence.RestingBP === false && s.floatBoxWarning]}>
                      <MaterialCommunityIcons name="pulse" size={18} color={confidence.RestingBP === false ? C.amber : C.textMuted} style={{ marginRight: 10 }} />
                      <TextInputInline value={formData.RestingBP} onChangeText={set("RestingBP")} keyboardType="numeric" />
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Cholesterol (mg/dl)</Text>
                      <FieldBadge extracted={confidence.Cholesterol} />
                    </View>
                    <View style={[s.floatBox, confidence.Cholesterol === false && s.floatBoxWarning]}>
                      <MaterialCommunityIcons name="water" size={18} color={confidence.Cholesterol === false ? C.amber : C.textMuted} style={{ marginRight: 10 }} />
                      <TextInputInline value={formData.Cholesterol} onChangeText={set("Cholesterol")} keyboardType="numeric" />
                    </View>
                  </View>
                </View>
              </TwoCol>

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Max Heart Rate</Text>
                      <FieldBadge extracted={confidence.MaxHR} />
                    </View>
                    <View style={[s.floatBox, confidence.MaxHR === false && s.floatBoxWarning]}>
                      <MaterialCommunityIcons name="heart-flash" size={18} color={confidence.MaxHR === false ? C.amber : C.textMuted} style={{ marginRight: 10 }} />
                      <TextInputInline value={formData.MaxHR} onChangeText={set("MaxHR")} keyboardType="numeric" />
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Oldpeak (ST Depr.)</Text>
                      <FieldBadge extracted={confidence.Oldpeak} />
                    </View>
                    <View style={[s.floatBox, confidence.Oldpeak === false && s.floatBoxWarning]}>
                      <MaterialCommunityIcons name="chart-line" size={18} color={confidence.Oldpeak === false ? C.amber : C.textMuted} style={{ marginRight: 10 }} />
                      <TextInputInline value={formData.Oldpeak} onChangeText={set("Oldpeak")} keyboardType="decimal-pad" />
                    </View>
                  </View>
                </View>
              </TwoCol>

              <TwoCol>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Fasting Blood Sugar</Text>
                      <FieldBadge extracted={confidence.FastingBS} />
                    </View>
                    <View style={[s.floatBox, confidence.FastingBS === false && s.floatBoxWarning]}>
                      <Picker selectedValue={formData.FastingBS} onValueChange={set("FastingBS")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                        <Picker.Item label="Normal (≤120)" value="0" />
                        <Picker.Item label="High (>120)" value="1" />
                      </Picker>
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.fieldWrap}>
                    <View style={s.fieldHeaderRow}>
                      <Text style={s.floatLabel}>Resting ECG</Text>
                      <FieldBadge extracted={confidence.RestingECG} />
                    </View>
                    <View style={[s.floatBox, confidence.RestingECG === false && s.floatBoxWarning]}>
                      <Picker selectedValue={formData.RestingECG} onValueChange={set("RestingECG")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                        <Picker.Item label="Normal" value="Normal" />
                        <Picker.Item label="ST" value="ST" />
                        <Picker.Item label="LVH" value="LVH" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </TwoCol>

              <View style={s.fieldWrap}>
                <View style={s.fieldHeaderRow}>
                  <Text style={s.floatLabel}>ST Slope</Text>
                  <FieldBadge extracted={confidence.ST_Slope} />
                </View>
                <View style={[s.floatBox, confidence.ST_Slope === false && s.floatBoxWarning]}>
                  <Picker selectedValue={formData.ST_Slope} onValueChange={set("ST_Slope")} style={s.pickerInner} dropdownIconColor={C.textSecond}>
                    <Picker.Item label="Up" value="Up" />
                    <Picker.Item label="Flat" value="Flat" />
                    <Picker.Item label="Down" value="Down" />
                  </Picker>
                </View>
              </View>

              {predError ? <ErrorCard error={predError} onDismiss={dismissPredError} /> : null}

              <View style={s.actionRow}>
                <TouchableOpacity onPress={handleReset} style={s.backBtn}>
                  <MaterialCommunityIcons name="arrow-left" size={16} color={C.textSecond} />
                  <Text style={s.backBtnText}>Re-record</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Confirm & Predict" icon="heart-search"
                    onPress={handlePredict} loading={isPredicting} disabled={isPredicting} gradient={G.blue} />
                </View>
              </View>
            </SectionCard>
          </>
        )}

        {/* ══ STEP 2 — RESULT ══ */}
        {step === 2 && predResult && (
          <>
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
                  <Text style={s.resultProbValue}>{(predResult.probability * 100).toFixed(1)}%</Text>
                  <Text style={s.resultProbLabel}>Probability</Text>
                </View>
              </LinearGradient>
            </View>

            <SectionCard style={{ marginTop: 12 }}>
              <SectionHeading icon="text-to-speech" title="Transcript Reference" color={C.textMuted} />
              <Divider />
              <View style={s.transcriptBox}>
                <Text style={s.transcriptText}>{transcript}</Text>
              </View>
            </SectionCard>

            <TouchableOpacity onPress={handleReset} style={[s.backBtn, { alignSelf: "center", marginTop: 20 }]}>
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
  stepBar: { flexDirection: "row", alignItems: "center", marginBottom: 4, paddingHorizontal: 8 },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 12, fontWeight: "700", color: C.textMuted },
  stepLabel: { fontSize: 11, color: C.textMuted, fontWeight: "500" },
  stepLine: { flex: 1, height: 2, backgroundColor: C.border, marginHorizontal: 6, marginBottom: 16 },

  recordBtnWrap: { borderRadius: 14, overflow: "hidden", marginTop: 6, shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 },
  recordBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15 },
  recordBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff", marginLeft: 10, opacity: 0.9 },
  hint: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginTop: 10, paddingHorizontal: 4 },
  hintText: { color: C.textMuted, fontSize: 12, flex: 1, lineHeight: 18 },

  transcriptBox: { backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  transcriptText: { color: C.textSecond, fontSize: 13, lineHeight: 22, fontStyle: "italic" },
  summaryText: { color: C.textSecond, fontSize: 13, lineHeight: 22, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  statChipText: { fontSize: 12, fontWeight: "700" },

  fieldWrap: { marginBottom: 14 },
  fieldHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  floatLabel: { fontSize: 10, fontWeight: "700", color: C.textSecond, letterSpacing: 1.2, textTransform: "uppercase" },
  floatBox: { flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceBlu, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, minHeight: 50 },
  floatBoxWarning: { borderColor: C.amber, backgroundColor: "#FEF3C755" },
  pickerInner: { flex: 1, color: C.textPrimary, height: 50, backgroundColor: "transparent" },

  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeGreen: { backgroundColor: C.greenLight },
  badgeAmber: { backgroundColor: C.amberLight },
  badgeText: { fontSize: 10, fontWeight: "600" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  backBtnText: { fontSize: 13, fontWeight: "600", color: C.textSecond },

  resultCard: { marginTop: 12, borderRadius: 16, overflow: "hidden" },
  resultCardInner: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  resultIconWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  resultPatient: { fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1.2 },
  resultValue: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 3 },
  resultSub: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  resultProbWrap: { alignItems: "flex-end" },
  resultProbValue: { fontSize: 30, fontWeight: "800", color: "#fff" },
  resultProbLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1 },
});