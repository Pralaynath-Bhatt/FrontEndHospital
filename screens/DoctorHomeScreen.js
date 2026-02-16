import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
  Image,
  SafeAreaView,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Picker } from "@react-native-picker/picker";
import Animated, { FadeInLeft } from "react-native-reanimated";
import axios from "axios";
import { Audio } from "expo-av";
import BASE_URL from "./Config";
import apiClient from "./Apiclient";

const { width } = Dimensions.get("window");
const isWeb = width > 900;
const screenWidth = Dimensions.get("window").width;
const cardMargin = 12;
const cardWidth = screenWidth - cardMargin * 4;

const DiagnosisSection = ({ title, iconName, iconColor, children, isExpandedDefault = false }) => {
  const [expanded, setExpanded] = useState(isExpandedDefault);

  return (
    <View style={patientStyles.sectionContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={patientStyles.sectionHeader}
      >
        <LinearGradient
          colors={[iconColor + "cc", iconColor + "66"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={patientStyles.iconBackground}
        >
          <FontAwesome5 name={iconName} size={20} color="white" />
        </LinearGradient>
        <Text style={patientStyles.sectionTitle}>{title}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#444"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>
      {expanded && <View style={patientStyles.sectionContent}>{children}</View>}
    </View>
  );
};

const renderPatientDiagnosisItem = ({ item }) => {
  const isPositive =
    item.prediction.toLowerCase().includes("high") ||
    item.prediction.toLowerCase().includes("positive");

  const gradientColors = isPositive ? ["#ff4e50", "#f9d423"] : ["#11998e", "#38ef7d"];

  return (
    <Animated.View style={patientStyles.diagnosisContainer} entering={FadeInLeft.duration(800)}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={patientStyles.dateBanner}
      >
        <Text style={patientStyles.dateBannerText}>{item.date}</Text>
      </LinearGradient>

      <DiagnosisSection
        title="Symptoms & Input Details"
        iconName="stethoscope"
        iconColor="#3498db"
        isExpandedDefault={false}
      >
        {item.symptoms.length > 0 ? (
          item.symptoms.map((symptom, index) => (
            <View key={index} style={patientStyles.listItemContainer}>
              <View style={patientStyles.bulletPoint} />
              <Text style={patientStyles.listItemText}>{symptom}</Text>
            </View>
          ))
        ) : (
          <Text style={patientStyles.listItemText}>No detailed inputs recorded</Text>
        )}
      </DiagnosisSection>

      <DiagnosisSection
        title="Prediction"
        iconName="heartbeat"
        iconColor={isPositive ? "#e74c3c" : "#2ecc71"}
        isExpandedDefault={true}
      >
        <View style={patientStyles.predictionWrapper}>
          <FontAwesome5
            name="heart"
            size={30}
            color={isPositive ? "#e74c3c" : "#2ecc71"}
            style={{ marginRight: 10 }}
          />
          <Text
            style={[
              patientStyles.predictionText,
              { color: isPositive ? "#e74c3c" : "#2ecc71" },
            ]}
          >
            {item.prediction}
          </Text>
        </View>
      </DiagnosisSection>

      <DiagnosisSection
        title="Recommended Medicines"
        iconName="capsules"
        iconColor="#9b59b6"
        isExpandedDefault={false}
      >
        {item.medicines.length > 0 ? (
          item.medicines.map((med, idx) => (
            <View key={idx} style={patientStyles.listItemContainer}>
              <View style={[patientStyles.bulletPoint, { backgroundColor: "#9b59b6" }]} />
              <Text style={patientStyles.listItemText}>{med}</Text>
            </View>
          ))
        ) : (
          <Text style={patientStyles.listItemText}>No recommendations available</Text>
        )}
      </DiagnosisSection>

      {item.transcript && (
        <DiagnosisSection
          title="Audio Transcript"
          iconName="microphone"
          iconColor="#9b59b6"
          isExpandedDefault={false}
        >
          <View style={patientStyles.listItemContainer}>
            <Text style={[patientStyles.listItemText, { fontStyle: "italic", paddingBottom: 10 }]}>
              {item.transcript}
            </Text>
          </View>
        </DiagnosisSection>
      )}

      {item.summary && (
        <DiagnosisSection
          title="Summary"
          iconName="file-alt"
          iconColor="#16a085"
          isExpandedDefault={false}
        >
          <View style={patientStyles.listItemContainer}>
            <Text style={[patientStyles.listItemText, { fontStyle: "italic", paddingBottom: 10 }]}>
              {item.summary}
            </Text>
          </View>
        </DiagnosisSection>
      )}

      {item.deIdentifiedTranscript && (
        <DiagnosisSection
          title="De-identified Transcript"
          iconName="shield-alt"
          iconColor="#f39c12"
          isExpandedDefault={false}
        >
          <View style={patientStyles.listItemContainer}>
            <Text style={[patientStyles.listItemText, { fontStyle: "italic", paddingBottom: 10 }]}>
              {item.deIdentifiedTranscript}
            </Text>
          </View>
        </DiagnosisSection>
      )}
    </Animated.View>
  );
};

export default function DoctorHomeScreen({ onLogout }) {
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [audioPatientName, setAudioPatientName] = useState("");
  const [audioDiagnosisResult, setAudioDiagnosisResult] = useState(null);

  // Text Prediction States
  const [formData, setFormData] = useState({
    patientName: "",
    Age: "",
    Sex: "M",
    ChestPainType: "ATA",
    RestingBP: "",
    Cholesterol: "",
    FastingBS: "0",
    RestingECG: "Normal",
    MaxHR: "",
    ExerciseAngina: "N",
    Oldpeak: "",
    ST_Slope: "Up",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heartResult, setHeartResult] = useState(null);

  // Patient History States
  const [patientSearchText, setPatientSearchText] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState(null);
  const [patientDiagnosisList, setPatientDiagnosisList] = useState([]);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Microphone permission is required to record audio.");
      }
    })();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (heartResult) setHeartResult(null);
  };

  /* ================= AUDIO RECORDING & PREDICTION ================= */

  const startRecording = async () => {
    try {
      setAudioDiagnosisResult(null);
      setIsRecording(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      setRecording(recording);
    } catch (error) {
      Alert.alert("Error", "Failed to start recording: " + error.message);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    if (!audioPatientName.trim()) {
      Alert.alert("Error", "Please enter patient name before recording.");
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      setRecording(null);
      return;
    }

    try {
      setIsRecording(false);
      setIsUploading(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        Alert.alert("Error", "Recording URI not found.");
        setIsUploading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("patientName", audioPatientName.trim());

      // Check if running on web
      if (uri.startsWith('blob:') || uri.startsWith('data:')) {
        // Web platform - fetch the blob and convert to File
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileName = `recording_${Date.now()}.m4a`;
        const file = new File([blob], fileName, { type: "audio/m4a" });
        formDataToSend.append("audioFile", file, fileName);
      } else {
        // Mobile platform - use the existing approach
        const fileParts = uri.split("/");
        const fileName = fileParts[fileParts.length - 1];
        const fileType = "audio/m4a";
        formDataToSend.append("audioFile", {
          uri,
          name: fileName,
          type: fileType,
        });
      }

      const response = await apiClient.post(`${BASE_URL}:8080/api/heart/predict/audio`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200 && response.data) {
        // Handle the new response format: {success, status, message, data: {riskLevel, probability}, timestamp}
        const apiResponse = response.data;
        const result = apiResponse.data || apiResponse;
        
        // Transform the response to match the display format
        const transformedResult = {
          date: new Date().toISOString().split("T")[0],
          symptoms: result.inputData ? [
            `Age: ${result.inputData.Age || "N/A"}`,
            `Sex: ${result.inputData.Sex === "M" ? "Male" : result.inputData.Sex === "F" ? "Female" : "N/A"}`,
            `Chest Pain Type: ${result.inputData.ChestPainType || "N/A"}`,
            `Resting BP: ${result.inputData.RestingBP || "N/A"} mm Hg`,
            `Cholesterol: ${result.inputData.Cholesterol || "N/A"} mg/dl`,
            `Fasting BS: ${result.inputData.FastingBS === "1" ? "High (>120 mg/dl)" : "Normal"}`,
            `Resting ECG: ${result.inputData.RestingECG || "N/A"}`,
            `Max HR: ${result.inputData.MaxHR || "N/A"}`,
            `Exercise Angina: ${result.inputData.ExerciseAngina === "Y" ? "Yes" : "No"}`,
            `Oldpeak: ${result.inputData.Oldpeak || "N/A"} (ST depression)`,
            `ST Slope: ${result.inputData.ST_Slope || "N/A"}`,
          ].filter((s) => !s.includes("N/A")) : ["Audio analysis completed"],
          prediction: `Heart Disease ${result.riskLevel || "Unknown"} (${((result.probability || 0) * 100).toFixed(1)}%)`,
          medicines: getMedicineRecommendations(result.riskLevel),
          transcript: result.transcript || "",
          summary: result.summary || "",
          deIdentifiedTranscript: result.deIdentifiedTranscript || "",
        };

        setAudioDiagnosisResult(transformedResult);
      } else {
        Alert.alert("Error", "Failed to get prediction from server.");
      }
    } catch (error) {
      Alert.alert("Upload Error", error.response?.data?.error || error.message || "Something went wrong!");
    } finally {
      setIsUploading(false);
      setRecording(null);
    }
  };

  const getMedicineRecommendations = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case "high":
        return ["Aspirin (daily)", "Statins (for cholesterol)", "Beta-blockers (for heart rate)"];
      case "medium":
        return ["Aspirin (as needed)", "Lifestyle changes recommended"];
      case "low":
      case "negative":
        return ["No immediate medication; maintain healthy lifestyle"];
      default:
        return ["Consult a doctor for recommendations"];
    }
  };

  /* ================= TEXT PREDICTION ================= */

  const handleHeartSubmit = async () => {
    const requiredFields = ["patientName", "Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"];
    for (let field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === "") {
        Alert.alert("Error", `${field.replace(/([A-Z])/g, " $1").trim()} is required.`);
        return;
      }
      if (field !== "patientName" && isNaN(parseFloat(formData[field]))) {
        Alert.alert("Error", `${field} must be a number.`);
        return;
      }
    }
    if (![0, 1].includes(parseInt(formData.FastingBS))) {
      Alert.alert("Error", "FastingBS must be 0 or 1.");
      return;
    }

    try {
      setIsSubmitting(true);
      setHeartResult(null);

      const patientData = [
        {
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
        },
      ];

      const requestBody = {
        patientName: formData.patientName.trim(),
        patientData,
      };

      const response = await apiClient.post(`${BASE_URL}:8080/api/heart/predict/text`, requestBody, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 && response.data) {
        // Handle the new response format: {success, status, message, data: {riskLevel, probability}, timestamp}
        const apiResponse = response.data;
        const result = apiResponse.data || apiResponse;
        
        // Set the result with the correct structure
        setHeartResult({
          riskLevel: result.riskLevel || "Unknown",
          probability: result.probability || 0
        });
      } else {
        Alert.alert("Error", "Failed to get prediction from server.");
      }
    } catch (error) {
      Alert.alert("Submission Error", error.response?.data || error.message || "Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= PATIENT HISTORY SEARCH ================= */

  const handlePatientSearch = async () => {
    const searchName = patientSearchText.trim();
    if (!searchName) {
      Alert.alert("Error", "Please enter a patient name.");
      return;
    }

    setPatientLoading(true);
    setPatientError(null);
    setPatientDiagnosisList([]);

    try {
      const response = await axios.get(
        `${BASE_URL}:8080/api/patient/${encodeURIComponent(searchName)}/predictions`,
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      if (response.status === 200 && response.data) {
        // Handle the new response format: {success, status, message, data: [...], timestamp}
        const apiResponse = response.data;
        const predictions = apiResponse.data || apiResponse;
        
        // Ensure predictions is an array
        const predictionsArray = Array.isArray(predictions) ? predictions : [];
        
        const transformedData = predictionsArray
          .filter((pred) => pred && pred.date && pred.riskLevel)
          .map((prediction) => {
            let date;
            if (typeof prediction.date === "string") {
              date = new Date(prediction.date).toISOString().split("T")[0];
            } else {
              date = new Date().toISOString().split("T")[0];
            }

            const inputData = prediction.inputData || {};
            const symptoms = [
              `Age: ${inputData.Age || "N/A"}`,
              `Sex: ${inputData.Sex === "M" ? "Male" : inputData.Sex === "F" ? "Female" : "N/A"}`,
              `Chest Pain Type: ${inputData.ChestPainType || "N/A"}`,
              `Resting BP: ${inputData.RestingBP || "N/A"} mm Hg`,
              `Cholesterol: ${inputData.Cholesterol || "N/A"} mg/dl`,
              `Fasting BS: ${inputData.FastingBS === 1 ? "High (>120 mg/dl)" : "Normal"}`,
              `Resting ECG: ${inputData.RestingECG || "N/A"}`,
              `Max HR: ${inputData.MaxHR || "N/A"}`,
              `Exercise Angina: ${inputData.ExerciseAngina === "Y" ? "Yes" : "No"}`,
              `Oldpeak: ${inputData.Oldpeak || "N/A"} (ST depression)`,
              `ST Slope: ${inputData.ST_Slope || "N/A"}`,
            ].filter((s) => !s.includes("N/A"));

            const riskLevel = prediction.riskLevel || "Unknown";
            const probability = ((prediction.probability || 0) * 100).toFixed(1);
            const predictionStr = `Heart Disease ${riskLevel} (${probability}%)`;

            return {
              date,
              symptoms,
              prediction: predictionStr,
              medicines: getMedicineRecommendations(riskLevel),
              transcript: inputData.transcript || "",
              summary: prediction.summary || "",
              deIdentifiedTranscript: prediction.deIdentifiedTranscript || "",
            };
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        setPatientDiagnosisList(transformedData);
      } else {
        setPatientDiagnosisList([]);
      }
    } catch (error) {
      let errorMsg = "Failed to fetch patient history.";
      if (error.response) {
        if (error.response.status === 404) {
          errorMsg = `No predictions found for patient "${searchName}".`;
        } else if (error.response.data) {
          errorMsg =
            typeof error.response.data === "string"
              ? error.response.data
              : error.response.data.message || errorMsg;
        }
      } else if (error.code === "ECONNABORTED") {
        errorMsg = "Request timed out. Please check your connection.";
      } else {
        errorMsg = error.message || errorMsg;
      }
      setPatientError(errorMsg);
      setPatientDiagnosisList([]);
    } finally {
      setPatientLoading(false);
    }
  };

  const handlePatientRetry = () => {
    setPatientError(null);
    handlePatientSearch();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={["#0F172A", "#1E3A8A", "#2563EB"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={[styles.container, isWeb && { width: "70%", alignSelf: "center" }]}>
            <Text style={styles.title}>Heart Disease Prediction System</Text>

            {/* ================= AUDIO RECORDING SECTION ================= */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Audio-Based Prediction</Text>
              <Text style={styles.sectionSubtitle}>Record patient consultation for automatic analysis</Text>
            </View>

            <Text style={styles.label}>Patient Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter patient name (e.g., John Doe)"
              value={audioPatientName}
              onChangeText={setAudioPatientName}
              editable={!isRecording && !isUploading}
            />

            <View style={styles.recordSection}>
              <TouchableOpacity
                style={styles.recordButtonShadow}
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.85}
                disabled={isUploading}
              >
                <LinearGradient
                  colors={isRecording ? ["#e05247", "#d8433f"] : ["#5A81F8", "#3b62ce"]}
                  style={styles.recordButton}
                  start={{ x: 0.0, y: 0.0 }}
                  end={{ x: 1.0, y: 1.0 }}
                >
                  <Ionicons name={isRecording ? "stop-circle" : "mic"} size={50} color="white" />
                  <Text style={styles.recordButtonText}>
                    {isRecording ? "Stop Recording & Analyze" : "Start Recording"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {isUploading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#5A81F8" />
                  <Text style={styles.loadingText}>Analyzing Audio & Predicting...</Text>
                </View>
              )}
            </View>

            {/* Audio Prediction Result */}
            {audioDiagnosisResult && (
              <View style={{ marginBottom: 30 }}>
                {renderPatientDiagnosisItem({ item: audioDiagnosisResult })}
              </View>
            )}

            {/* ================= TEXT-BASED PREDICTION SECTION ================= */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Manual Heart Disease Prediction</Text>
              <Text style={styles.sectionSubtitle}>Enter patient details manually for prediction</Text>
            </View>

            <View style={styles.formSection}>
              {/* Patient Name */}
              <Text style={styles.label}>Patient Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter patient name (e.g., John Doe)"
                value={formData.patientName}
                onChangeText={(value) => handleInputChange("patientName", value)}
                editable={!isSubmitting}
              />

              {/* Age */}
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter age (e.g., 65)"
                keyboardType="numeric"
                value={formData.Age}
                onChangeText={(value) => handleInputChange("Age", value)}
                editable={!isSubmitting}
              />

              {/* Sex */}
              <Text style={styles.label}>Sex</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.Sex}
                  onValueChange={(value) => handleInputChange("Sex", value)}
                  style={styles.picker}
                  enabled={!isSubmitting}
                >
                  <Picker.Item label="Male (M)" value="M" />
                  <Picker.Item label="Female (F)" value="F" />
                </Picker>
              </View>

              {/* ChestPainType */}
              <Text style={styles.label}>Chest Pain Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.ChestPainType}
                  onValueChange={(value) => handleInputChange("ChestPainType", value)}
                  style={styles.picker}
                  enabled={!isSubmitting}
                >
                  <Picker.Item label="ATA (Asymptomatic)" value="ATA" />
                  <Picker.Item label="NAP (Non-Anginal Pain)" value="NAP" />
                  <Picker.Item label="ASY (Atypical Angina)" value="ASY" />
                  <Picker.Item label="TA (Typical Angina)" value="TA" />
                </Picker>
              </View>

              {/* RestingBP */}
              <Text style={styles.label}>Resting Blood Pressure (mm Hg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter resting BP (e.g., 180)"
                keyboardType="numeric"
                value={formData.RestingBP}
                onChangeText={(value) => handleInputChange("RestingBP", value)}
                editable={!isSubmitting}
              />

              {/* Cholesterol */}
              <Text style={styles.label}>Cholesterol (mg/dl)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter cholesterol (e.g., 350)"
                keyboardType="numeric"
                value={formData.Cholesterol}
                onChangeText={(value) => handleInputChange("Cholesterol", value)}
                editable={!isSubmitting}
              />

              {/* FastingBS */}
              <Text style={styles.label}>Fasting Blood Sugar (120 mg/dl)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.FastingBS}
                  onValueChange={(value) => handleInputChange("FastingBS", value)}
                  style={styles.picker}
                  enabled={!isSubmitting}
                >
                  <Picker.Item label="No (0)" value="0" />
                  <Picker.Item label="Yes (1)" value="1" />
                </Picker>
              </View>

              {/* RestingECG */}
              <Text style={styles.label}>Resting ECG</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.RestingECG}
                  onValueChange={(value) => handleInputChange("RestingECG", value)}
                  style={styles.picker}
                  enabled={!isSubmitting}
                >
                  <Picker.Item label="Normal" value="Normal" />
                  <Picker.Item label="ST" value="ST" />
                  <Picker.Item label="LVH" value="LVH" />
                </Picker>
              </View>

              {/* MaxHR */}
              <Text style={styles.label}>Maximum Heart Rate Achieved</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter max HR (e.g., 95)"
                keyboardType="numeric"
                value={formData.MaxHR}
                onChangeText={(value) => handleInputChange("MaxHR", value)}
                editable={!isSubmitting}
              />

              {/* ExerciseAngina */}
              <Text style={styles.label}>Exercise Induced Angina</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.ExerciseAngina}
                  onValueChange={(value) => handleInputChange("ExerciseAngina", value)}
                  style={styles.picker}
                  enabled={!isSubmitting}
                >
                  <Picker.Item label="No (N)" value="N" />
                  <Picker.Item label="Yes (Y)" value="Y" />
                </Picker>
              </View>

              {/* Oldpeak */}
              <Text style={styles.label}>Oldpeak (ST depression)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter oldpeak (e.g., 4.2)"
                keyboardType="decimal-pad"
                value={formData.Oldpeak}
                onChangeText={(value) => handleInputChange("Oldpeak", value)}
                editable={!isSubmitting}
              />

              {/* ST_Slope */}
              <Text style={styles.label}>ST Slope</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.ST_Slope}
                  onValueChange={(value) => handleInputChange("ST_Slope", value)}
                  style={styles.picker}
                  enabled={!isSubmitting}
                >
                  <Picker.Item label="Up" value="Up" />
                  <Picker.Item label="Flat" value="Flat" />
                  <Picker.Item label="Down" value="Down" />
                </Picker>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButtonShadow, isSubmitting && styles.disabledButton]}
              onPress={handleHeartSubmit}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={isSubmitting ? ["#ccc", "#ccc"] : ["#5A81F8", "#3b62ce"]}
                style={styles.submitButton}
                start={{ x: 0.0, y: 0.0 }}
                end={{ x: 1.0, y: 1.0 }}
              >
                <Ionicons name={isSubmitting ? "hourglass" : "send"} size={24} color="white" />
                <Text style={styles.submitButtonText}>{isSubmitting ? "Analyzing..." : "Predict Heart Risk"}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Prediction Result Card */}
            {heartResult && (
              <LinearGradient
                colors={["#e74c3c", "#f39c12"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultCardGradient}
              >
                <View style={styles.resultCard}>
                  <View style={[styles.cardIconContainer, { backgroundColor: "#f1c40f" }]}>
                    <FontAwesome5 name="heart" size={28} color="#e74c3c" />
                  </View>
                  <Text style={styles.cardTitle}>Heart Disease Prediction</Text>
                  <Text style={styles.resultRisk}>
                    Risk Level: <Text style={styles.riskBold}>{heartResult.riskLevel}</Text>
                  </Text>
                  <Text style={styles.resultProb}>
                    Probability: <Text style={styles.probBold}>{(heartResult.probability * 100).toFixed(2)}%</Text>
                  </Text>
                </View>
              </LinearGradient>
            )}

            {/* ================= PATIENT HISTORY SEARCH ================= */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Patient History Search</Text>
              <Text style={styles.sectionSubtitle}>
                Search for a patient's past predictions and recommendations
              </Text>
            </View>

            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter patient name (e.g., John Doe)..."
                  placeholderTextColor="#999"
                  value={patientSearchText}
                  onChangeText={setPatientSearchText}
                  multiline={false}
                  returnKeyType="search"
                  onSubmitEditing={handlePatientSearch}
                  editable={!patientLoading}
                />
                <TouchableOpacity
                  style={[
                    styles.searchButton,
                    (patientLoading || !patientSearchText.trim()) && styles.disabledButton,
                  ]}
                  onPress={handlePatientSearch}
                  disabled={patientLoading || !patientSearchText.trim()}
                >
                  <Ionicons
                    name={patientLoading ? "hourglass" : "search"}
                    size={24}
                    color={patientLoading || !patientSearchText.trim() ? "#999" : "white"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {patientLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5A81F8" />
                <Text style={styles.loadingText}>Searching patient history...</Text>
              </View>
            ) : patientError ? (
              <View style={styles.errorContainer}>
                <FontAwesome5 name="exclamation-triangle" size={48} color="#e74c3c" />
                <Text style={styles.errorText}>{patientError}</Text>
                <TouchableOpacity onPress={handlePatientRetry} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry Search</Text>
                </TouchableOpacity>
              </View>
            ) : patientDiagnosisList && patientDiagnosisList.length > 0 ? (
              <FlatList
                data={patientDiagnosisList}
                renderItem={renderPatientDiagnosisItem}
                keyExtractor={(item, index) => `${item.date}-${index}`}
                contentContainerStyle={patientStyles.listContainer}
                scrollEnabled={false}
                style={{ marginBottom: 20 }}
              />
            ) : patientSearchText.trim() && !patientLoading ? (
              <View style={styles.noDataContainer}>
                <FontAwesome5 name="heart" size={64} color="#95a5a6" />
                <Text style={styles.noDataText}>No predictions found for this patient.</Text>
                <Text style={styles.noDataSubtext}>Create a new prediction using the sections above.</Text>
              </View>
            ) : null}

            {/* Logout Button */}
            <View style={styles.logoutContainer}>
              <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>LOGOUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#cbd5e1",
    fontStyle: "italic",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  picker: {
    height: 50,
  },
  recordSection: {
    marginVertical: 20,
    alignItems: "center",
  },
  recordButtonShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderRadius: 15,
  },
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 15,
  },
  recordButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 12,
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
  formSection: {
    marginTop: 10,
  },
  submitButtonShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderRadius: 15,
    marginTop: 20,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 15,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  resultCardGradient: {
    borderRadius: 15,
    marginTop: 20,
    padding: 2,
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 13,
    padding: 20,
    alignItems: "center",
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
  },
  resultRisk: {
    fontSize: 16,
    color: "#34495e",
    marginBottom: 8,
  },
  riskBold: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#e74c3c",
  },
  resultProb: {
    fontSize: 16,
    color: "#34495e",
  },
  probBold: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#f39c12",
  },
  searchSection: {
    marginTop: 15,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: "#5A81F8",
    borderRadius: 10,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    marginVertical: 20,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 15,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#5A81F8",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 15,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  noDataContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    marginVertical: 20,
  },
  noDataText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  noDataSubtext: {
    color: "#cbd5e1",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  logoutContainer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

const patientStyles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  diagnosisContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBanner: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  dateBannerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionContainer: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f9fa",
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    flex: 1,
  },
  sectionContent: {
    padding: 15,
    backgroundColor: "#fff",
  },
  listItemContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3498db",
    marginTop: 6,
    marginRight: 10,
  },
  listItemText: {
    fontSize: 14,
    color: "#34495e",
    flex: 1,
    lineHeight: 20,
  },
  predictionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  predictionText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});