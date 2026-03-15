// tabs/ManualTab.jsx
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { C, G } from "../Constraint";
import {
  SectionCard, SectionHeading, FloatingInput, FloatingPicker,
  PrimaryButton, Divider, TwoCol, ErrorCard, parseApiError,
} from "./SharedComponents";
import BASE_URL from "../Config";
import apiClient from "../Apiclient";

const { width } = Dimensions.get("window");
const isWeb = width > 900;

export default function ManualTab() {
  const [formData, setFormData] = useState({
    patientName: "", Age: "", Sex: "M", ChestPainType: "ATA",
    RestingBP: "", Cholesterol: "", FastingBS: "0", RestingECG: "Normal",
    MaxHR: "", ExerciseAngina: "N", Oldpeak: "", ST_Slope: "Up",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heartResult, setHeartResult]   = useState(null);
  const [heartError, setHeartError]     = useState(null);

  const dismissError = useCallback(() => setHeartError(null), []);

  // Stable field handlers
  const set = useCallback((key) => (v) => setFormData(p => ({ ...p, [key]: v })), []);

  const handleSubmit = useCallback(async () => {
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
      setIsSubmitting(true); setHeartResult(null); setHeartError(null);
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

  return (
    <ScrollView
      contentContainerStyle={{ padding: isWeb ? 28 : 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: C.bg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[{ flex: 1 }, isWeb && { width: 780, alignSelf: "center" }]}>

        <SectionCard>
          <SectionHeading icon="clipboard-text" title="Manual Prediction" subtitle="Enter patient vitals for risk assessment" color={C.blue} />
          <Divider />

          <TwoCol>
            <View style={{ flex: 1 }}>
              <FloatingInput label="Patient Name" icon="account" value={formData.patientName}
                onChangeText={set("patientName")} placeholder="Full name" editable={!isSubmitting} />
            </View>
            <View style={{ flex: 1 }}>
              <FloatingInput label="Age" icon="calendar" value={formData.Age}
                onChangeText={set("Age")} placeholder="Years" keyboardType="numeric" editable={!isSubmitting} />
            </View>
          </TwoCol>

          <TwoCol>
            <View style={{ flex: 1 }}>
              <FloatingPicker label="Sex" icon="gender-male-female" selectedValue={formData.Sex}
                onValueChange={set("Sex")} enabled={!isSubmitting}>
                <Picker.Item label="Male (M)" value="M" />
                <Picker.Item label="Female (F)" value="F" />
              </FloatingPicker>
            </View>
            <View style={{ flex: 1 }}>
              <FloatingPicker label="Chest Pain Type" icon="heart-broken" selectedValue={formData.ChestPainType}
                onValueChange={set("ChestPainType")} enabled={!isSubmitting}>
                <Picker.Item label="ATA – Asymptomatic" value="ATA" />
                <Picker.Item label="NAP – Non-Anginal" value="NAP" />
                <Picker.Item label="ASY – Atypical" value="ASY" />
                <Picker.Item label="TA – Typical Angina" value="TA" />
              </FloatingPicker>
            </View>
          </TwoCol>

          <TwoCol>
            <View style={{ flex: 1 }}>
              <FloatingInput label="Resting BP (mm Hg)" icon="pulse" value={formData.RestingBP}
                onChangeText={set("RestingBP")} placeholder="e.g. 120" keyboardType="numeric" editable={!isSubmitting} />
            </View>
            <View style={{ flex: 1 }}>
              <FloatingInput label="Cholesterol (mg/dl)" icon="water" value={formData.Cholesterol}
                onChangeText={set("Cholesterol")} placeholder="e.g. 200" keyboardType="numeric" editable={!isSubmitting} />
            </View>
          </TwoCol>

          <TwoCol>
            <View style={{ flex: 1 }}>
              <FloatingInput label="Max Heart Rate" icon="heart-flash" value={formData.MaxHR}
                onChangeText={set("MaxHR")} placeholder="e.g. 150" keyboardType="numeric" editable={!isSubmitting} />
            </View>
            <View style={{ flex: 1 }}>
              <FloatingInput label="Oldpeak (ST Depr.)" icon="chart-line" value={formData.Oldpeak}
                onChangeText={set("Oldpeak")} placeholder="e.g. 1.5" keyboardType="decimal-pad" editable={!isSubmitting} />
            </View>
          </TwoCol>

          <TwoCol>
            <View style={{ flex: 1 }}>
              <FloatingPicker label="Fasting Blood Sugar" icon="blood-bag" selectedValue={formData.FastingBS}
                onValueChange={set("FastingBS")} enabled={!isSubmitting}>
                <Picker.Item label="Normal (≤120)" value="0" />
                <Picker.Item label="High (>120)" value="1" />
              </FloatingPicker>
            </View>
            <View style={{ flex: 1 }}>
              <FloatingPicker label="Resting ECG" icon="waveform" selectedValue={formData.RestingECG}
                onValueChange={set("RestingECG")} enabled={!isSubmitting}>
                <Picker.Item label="Normal" value="Normal" />
                <Picker.Item label="ST" value="ST" />
                <Picker.Item label="LVH" value="LVH" />
              </FloatingPicker>
            </View>
          </TwoCol>

          <TwoCol>
            <View style={{ flex: 1 }}>
              <FloatingPicker label="Exercise Angina" icon="run-fast" selectedValue={formData.ExerciseAngina}
                onValueChange={set("ExerciseAngina")} enabled={!isSubmitting}>
                <Picker.Item label="No" value="N" />
                <Picker.Item label="Yes" value="Y" />
              </FloatingPicker>
            </View>
            <View style={{ flex: 1 }}>
              <FloatingPicker label="ST Slope" icon="trending-up" selectedValue={formData.ST_Slope}
                onValueChange={set("ST_Slope")} enabled={!isSubmitting}>
                <Picker.Item label="Up" value="Up" />
                <Picker.Item label="Flat" value="Flat" />
                <Picker.Item label="Down" value="Down" />
              </FloatingPicker>
            </View>
          </TwoCol>

          <PrimaryButton label="Predict Heart Risk" icon="heart-search"
            onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting} gradient={G.blue} />
        </SectionCard>

        {heartError ? <ErrorCard error={heartError} onDismiss={dismissError} /> : null}

        {heartResult ? (
          <View style={s.resultCard}>
            <LinearGradient
              colors={heartResult.riskLevel?.toLowerCase() === "high" ? G.red : G.green}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.resultCardInner}
            >
              <View style={s.resultIconWrap}>
                <MaterialCommunityIcons name="heart-pulse" size={30} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.resultLabel}>Risk Level</Text>
                <Text style={s.resultValue}>{heartResult.riskLevel}</Text>
              </View>
              <View style={s.resultProbWrap}>
                <Text style={s.resultProbValue}>{(heartResult.probability * 100).toFixed(1)}%</Text>
                <Text style={s.resultProbLabel}>Probability</Text>
              </View>
            </LinearGradient>
          </View>
        ) : null}

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  resultCard: { marginTop: 14, borderRadius: 16, overflow: "hidden" },
  resultCardInner: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  resultIconWrap: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  resultLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1.2 },
  resultValue: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 3 },
  resultProbWrap: { alignItems: "flex-end" },
  resultProbValue: { fontSize: 30, fontWeight: "800", color: "#fff" },
  resultProbLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1 },
});