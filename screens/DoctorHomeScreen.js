import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  SafeAreaView,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Animated, { FadeInLeft } from "react-native-reanimated";
import BASE_URL from "./Config";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";

const screenWidth = Dimensions.get("window").width;
const cardMargin = 12;
const cardWidth = screenWidth - cardMargin * 4;

const DATA_BLOCKS = [
  { key: "symptoms", title: "Symptoms", icon: "stethoscope", color: "#2980b9" },
  { key: "medicines", title: "Medicines", icon: "capsules", color: "#8e44ad" },
  { key: "summary", title: "Summary", icon: "file-alt", color: "#16a085" },
];

const CollapsibleCard = ({ title, icon, iconColor, children, isExpandedDefault = false }) => {
  const [expanded, setExpanded] = useState(isExpandedDefault);

  return (
    <View style={styles.collapsibleCardContainer}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded(!expanded)}
        style={styles.collapsibleHeader}
      >
        <LinearGradient
          colors={[iconColor + "cc", iconColor + "88"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.collapsibleIconBg}
        >
          <FontAwesome5 name={icon} size={22} color="white" />
        </LinearGradient>
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#444"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );
};

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
    </Animated.View>
  );
};

const renderAudioDiagnosis = (audioResult) => {
  const isPositive =
    audioResult.prediction.toLowerCase().includes("high") ||
    audioResult.prediction.toLowerCase().includes("positive");
  const gradientColors = isPositive ? ["#ff4e50", "#f9d423"] : ["#11998e", "#38ef7d"];

  return (
    <Animated.View
      style={[patientStyles.diagnosisContainer, { marginBottom: 30 }]}
      entering={FadeInLeft.duration(800)}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={patientStyles.dateBanner}
      >
        <Text style={patientStyles.dateBannerText}>{audioResult.date}</Text>
      </LinearGradient>

      <DiagnosisSection
        title="Extracted Patient Details (from Audio Transcript)"
        iconName="stethoscope"
        iconColor="#3498db"
        isExpandedDefault={true}
      >
        {audioResult.symptoms.length > 0 ? (
          audioResult.symptoms.map((symptom, index) => (
            <View key={index} style={patientStyles.listItemContainer}>
              <View style={patientStyles.bulletPoint} />
              <Text style={patientStyles.listItemText}>{symptom}</Text>
            </View>
          ))
        ) : (
          <Text style={patientStyles.listItemText}>No details extracted</Text>
        )}
      </DiagnosisSection>

      <DiagnosisSection
        title="Audio Transcript"
        iconName="microphone"
        iconColor="#9b59b6"
        isExpandedDefault={true}
      >
        <View style={patientStyles.listItemContainer}>
          <Text style={[patientStyles.listItemText, { fontStyle: "italic", paddingBottom: 10 }]}>
            {audioResult.transcript}
          </Text>
        </View>
      </DiagnosisSection>

      <DiagnosisSection
        title="Heart Disease Prediction"
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
          <View>
            <Text style={patientStyles.predictionText}>{audioResult.prediction}</Text>
            <Text
              style={[patientStyles.listItemText, { fontSize: 14, color: "#7f8c8d", textAlign: "center" }]}
            >
              Model: {audioResult.model_used}
            </Text>
          </View>
        </View>
      </DiagnosisSection>

      <DiagnosisSection
        title="Recommended Actions"
        iconName="capsules"
        iconColor="#9b59b6"
        isExpandedDefault={false}
      >
        {audioResult.medicines.length > 0 ? (
          audioResult.medicines.map((med, idx) => (
            <View key={idx} style={patientStyles.listItemContainer}>
              <View style={[patientStyles.bulletPoint, { backgroundColor: "#9b59b6" }]} />
              <Text style={patientStyles.listItemText}>{med}</Text>
            </View>
          ))
        ) : (
          <Text style={patientStyles.listItemText}>Consult a doctor for personalized recommendations.</Text>
        )}
      </DiagnosisSection>
    </Animated.View>
  );
};

export default function AudioDiagnosisScreen({ onLogout }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [textDiagnosis, setTextDiagnosis] = useState(null);
  const [audioDiagnosis, setAudioDiagnosis] = useState(null);
  const [searchText, setSearchText] = useState("");

  const [patientSearchText, setPatientSearchText] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState(null);
  const [patientDiagnosisList, setPatientDiagnosisList] = useState([]);

  const [extractedFeatures, setExtractedFeatures] = useState(null);
  const [isEditingFeatures, setIsEditingFeatures] = useState(false);
  const [editableFeatures, setEditableFeatures] = useState({});
  const [finalPatientName, setFinalPatientName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // NEW: State for additional API response fields
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [deIdentifiedTranscript, setDeIdentifiedTranscript] = useState("");

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

  const updateEditableFeature = (key, value) => {
    setEditableFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const startRecording = async () => {
    try {
      setAudioDiagnosis(null);
      setExtractedFeatures(null);
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

      const fileParts = uri.split("/");
      const fileName = fileParts[fileParts.length - 1];
      const fileType = "audio/m4a";

      const formDataToSend = new FormData();
      formDataToSend.append("audioFile", {
        uri,
        name: fileName,
        type: fileType,
      });

      const response = await axios.post(`${BASE_URL}:8080/api/audio/predict`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200 && response.data) {
        // Set features_extracted
        setExtractedFeatures(response.data.features_extracted || {});
        setEditableFeatures(response.data.features_extracted || {});

        // NEW: Set additional fields from API response
        setTranscript(response.data.transcript || "");
        setSummary(response.data.summary || "");
        setDeIdentifiedTranscript(response.data.de_identified_transcript || "");

        const apiData = response.data;
        const currentDate = new Date().toISOString().split("T")[0];
        const symptoms = Object.entries(apiData.features_extracted || {})
          .map(([key, value]) => `${key}: ${value}`)
          .filter((item) => item !== "transcript: undefined");

        const predictionStr = `Processing complete. Features extracted.`;
        const medicines = [];

        const transformedAudio = {
          date: currentDate,
          symptoms: symptoms.length > 0 ? symptoms : ["No details extracted."],
          transcript: apiData.transcript || "Transcript not available.",
          prediction: predictionStr,
          model_used: "Audio Processing",
          medicines,
        };

        setAudioDiagnosis(transformedAudio);
      } else {
        Alert.alert("Error", "Failed to get diagnosis from server.");
      }
    } catch (error) {
      Alert.alert("Upload Error", error.response?.data?.error || error.message || "Something went wrong!");
    } finally {
      setIsUploading(false);
      setRecording(null);
    }
  };

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

      const response = await axios.post(`${BASE_URL}:8080/api/heart/predict`, requestBody, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 && response.data && response.data.length > 0) {
        setHeartResult(response.data[0]);
      } else {
        Alert.alert("Error", "Failed to get prediction from server.");
      }
    } catch (error) {
      Alert.alert("Submission Error", error.response?.data || error.message || "Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFeatures = () => {
    setIsEditingFeatures(true);
    setEditableFeatures({ ...extractedFeatures });
  };

  const handleSaveFeatures = () => {
    setExtractedFeatures({ ...editableFeatures });
    setIsEditingFeatures(false);
  };

  const handleCancelEdit = () => {
    setEditableFeatures({ ...extractedFeatures });
    setIsEditingFeatures(false);
  };

    const handleFinalAnalyze = async () => {
    if (!finalPatientName.trim()) {
      Alert.alert("Error", "Please enter the patient's name for analysis.");
      return;
    }
    if (!extractedFeatures) {
      Alert.alert("Error", "No features available for analysis. Please record audio first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const patientData = [editableFeatures];

      const requestBody = {
        patientName: finalPatientName.trim(),
        patientData,
      };

      const predictResponse = await axios.post(`${BASE_URL}:8080/api/heart/predict`, requestBody, {
        headers: { "Content-Type": "application/json" },
      });

      if (!predictResponse.data || predictResponse.data.length === 0) {
        Alert.alert("Error", "Failed to save and predict. Please try again.");
        setIsAnalyzing(false);
        return;
      }

      const fetchResponse = await axios.get(
        `${BASE_URL}:8080/api/patient/${encodeURIComponent(finalPatientName.trim())}/predictions`,
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      if (fetchResponse.status === 200 && Array.isArray(fetchResponse.data) && fetchResponse.data.length > 0) {
        const predictions = fetchResponse.data.filter(
          (pred) => pred && pred.date && pred.riskLevel
        );
        if (predictions.length > 0) {
          const latestPrediction = predictions.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          )[0];
          const inputData = latestPrediction.inputData || {};
          const symptoms = [
            `Age: ${inputData.Age || "N/A"}`,
            `Sex: ${inputData.Sex === "M" ? "Male" : inputData.Sex === "F" ? "Female" : "N/A"}`,
            `Chest Pain Type: ${inputData.ChestPainType || "N/A"}`,
            `Resting BP: ${inputData.RestingBP || "N/A"} mm Hg`,
            `Cholesterol: ${inputData.Cholesterol || "N/A"} mg/dl`,
            `Fasting BS: ${inputData.FastingBS === "1" ? "High (>120 mg/dl)" : "Normal"}`,
            `Resting ECG: ${inputData.RestingECG || "N/A"}`,
            `Max HR: ${inputData.MaxHR || "N/A"}`,
            `Exercise Angina: ${inputData.ExerciseAngina === "Y" ? "Yes" : "No"}`,
            `Oldpeak: ${inputData.Oldpeak || "N/A"} (ST depression)`,
            `ST Slope: ${inputData.ST_Slope || "N/A"}`,
          ].filter((s) => !s.includes("N/A"));

          const riskLevel = latestPrediction.riskLevel || "Unknown";
          const probability = ((latestPrediction.probability || 0) * 100).toFixed(1);
          const predictionStr = `Heart Disease ${riskLevel} (${probability}%)`;

          let medicines = [];
          switch (riskLevel.toLowerCase()) {
            case "high":
              medicines = ["Aspirin (daily)", "Statins (for cholesterol)", "Beta-blockers (for heart rate)"];
              break;
            case "medium":
              medicines = ["Aspirin (as needed)", "Lifestyle changes recommended"];
              break;
            case "low":
            case "negative":
              medicines = ["No immediate medication; maintain healthy lifestyle"];
              break;
            default:
              medicines = ["Consult a doctor for recommendations"];
          }

          const transformedResult = {
            date: new Date(latestPrediction.date).toISOString().split("T")[0],
            symptoms: symptoms.length > 0 ? symptoms : ["No detailed inputs recorded"],
            prediction: predictionStr,
            medicines,
          };

          setAnalysisResult(transformedResult);
        } else {
          Alert.alert("Error", "No predictions found after analysis.");
        }
      } else {
        Alert.alert("Error", "Failed to fetch analysis results.");
      }
    } catch (error) {
      Alert.alert("Analysis Error", error.response?.data?.message || error.message || "Something went wrong during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handlePatientSearch = async () => {
    const searchName = patientSearchText.trim();
    if (!searchName) {
      Alert.alert("Error", "Please enter a patient name.");
      return;
    }

    setFormData((prev) => ({ ...prev, patientName: searchName }));
    setPatientLoading(true);
    setPatientError(null);
    setPatientDiagnosisList([]);

    try {
      await new Promise((res) => setTimeout(res, 500)); // small delay for UX

      const response = await axios.get(
        `${BASE_URL}:8080/api/patient/${encodeURIComponent(searchName)}/predictions`,
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      if (response.status === 200 && Array.isArray(response.data)) {
        const transformedData = response.data
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
              `Sex: ${
                inputData.Sex === "M"
                  ? "Male"
                  : inputData.Sex === "F"
                  ? "Female"
                  : "N/A"
              }`,
              `Chest Pain Type: ${inputData.ChestPainType || "N/A"}`,
              `Resting BP: ${inputData.RestingBP || "N/A"} mm Hg`,
              `Cholesterol: ${inputData.Cholesterol || "N/A"} mg/dl`,
              `Fasting BS: ${
                inputData.FastingBS === "1" ? "High (>120 mg/dl)" : "Normal"
              }`,
              `Resting ECG: ${inputData.RestingECG || "N/A"}`,
              `Max HR: ${inputData.MaxHR || "N/A"}`,
              `Exercise Angina: ${
                inputData.ExerciseAngina === "Y" ? "Yes" : "No"
              }`,
              `Oldpeak: ${inputData.Oldpeak || "N/A"} (ST depression)`,
              `ST Slope: ${inputData.ST_Slope || "N/A"}`,
            ].filter((s) => !s.includes("N/A"));

            const riskLevel = prediction.riskLevel || "Unknown";
            const probability = ((prediction.probability || 0) * 100).toFixed(1);
            const predictionStr = `Heart Disease ${riskLevel} (${probability}%)`;

            let medicines = [];
            switch (riskLevel.toLowerCase()) {
              case "high":
                medicines = [
                  "Aspirin (daily)",
                  "Statins (for cholesterol)",
                  "Beta-blockers (for heart rate)",
                ];
                break;
              case "medium":
                medicines = ["Aspirin (as needed)", "Lifestyle changes recommended"];
                break;
              case "low":
              case "negative":
                medicines = ["No immediate medication; maintain healthy lifestyle"];
                break;
              default:
                medicines = ["Consult a doctor for recommendations"];
            }

            return {
              date,
              symptoms,
              prediction: predictionStr,
              medicines,
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

  const renderBlock = ({ item }) => {
    let content = textDiagnosis ? textDiagnosis[item.key] : null;
    if (Array.isArray(content)) {
      content = content.length > 0 ? content.join(", ") : "N/A";
    } else if (!content) {
      content = "N/A";
    }

    return (
      <CollapsibleCard
        key={item.key}
        title={item.title}
        icon={item.icon}
        iconColor={item.color}
        isExpandedDefault={item.key === "summary"}
      >
        <Text style={styles.collapsibleText}>{content}</Text>
      </CollapsibleCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Diagnosis Tools</Text>
        <Text style={styles.subtitle}>
          Record a patient's description, search text, or predict heart disease risk.
        </Text>

        {/* Audio Recording Section */}
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
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          {isUploading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5A81F8" />
              <Text style={styles.loadingText}>Analyzing Audio...</Text>
            </View>
          )}
        </View>

        {/* Extracted Features Display and Edit Section */}
        {extractedFeatures && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Extracted Features from Audio</Text>
            <Text style={styles.sectionSubtitle}>Review and edit the extracted patient details.</Text>

            {/* Display Transcript */}
            <Text style={styles.label}>Transcript</Text>
            <ScrollView style={styles.textDisplayContainer} showsVerticalScrollIndicator={true}>
              <Text style={styles.textDisplay}>
                {transcript || "No transcript available."}
              </Text>
            </ScrollView>

            {/* Display Summary */}
            <Text style={styles.label}>Summary</Text>
            <ScrollView style={styles.textDisplayContainer} showsVerticalScrollIndicator={true}>
              <Text style={styles.textDisplay}>
                {summary || "No summary available."}
              </Text>
            </ScrollView>

            {/* Display De-identified Transcript */}
            <Text style={styles.label}>De-identified Transcript</Text>
            <ScrollView style={styles.textDisplayContainer} showsVerticalScrollIndicator={true}>
              <Text style={styles.textDisplay}>
                {deIdentifiedTranscript || "No de-identified transcript available."}
              </Text>
            </ScrollView>

            {/* Features Extracted (with edit functionality) */}
            {isEditingFeatures ? (
              <View style={styles.editForm}>
                {/* Age */}
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter age"
                  keyboardType="numeric"
                  value={editableFeatures.Age?.toString() || ""}
                  onChangeText={(value) =>
                    updateEditableFeature("Age", value === "" ? "" : parseInt(value))
                  }
                />

                {/* Sex */}
                <Text style={styles.label}>Sex</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editableFeatures.Sex || "M"}
                    onValueChange={(value) => updateEditableFeature("Sex", value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Male (M)" value="M" />
                    <Picker.Item label="Female (F)" value="F" />
                  </Picker>
                </View>

                {/* ChestPainType */}
                <Text style={styles.label}>Chest Pain Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editableFeatures.ChestPainType || "ATA"}
                    onValueChange={(value) => updateEditableFeature("ChestPainType", value)}
                    style={styles.picker}
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
                  placeholder="Enter resting BP"
                  keyboardType="numeric"
                  value={editableFeatures.RestingBP?.toString() || ""}
                  onChangeText={(value) =>
                    updateEditableFeature("RestingBP", value === "" ? "" : parseInt(value))
                  }
                />

                {/* Cholesterol */}
                <Text style={styles.label}>Cholesterol (mg/dl)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter cholesterol"
                  keyboardType="numeric"
                  value={editableFeatures.Cholesterol?.toString() || ""}
                  onChangeText={(value) =>
                    updateEditableFeature("Cholesterol", value === "" ? "" : parseInt(value))
                  }
                />

                {/* FastingBS */}
                <Text style={styles.label}>Fasting Blood Sugar (120 mg/dl)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editableFeatures.FastingBS?.toString() || "0"}
                    onValueChange={(value) => updateEditableFeature("FastingBS", parseInt(value))}
                    style={styles.picker}
                  >
                    <Picker.Item label="No (0)" value="0" />
                    <Picker.Item label="Yes (1)" value="1" />
                  </Picker>
                </View>

                {/* RestingECG */}
                <Text style={styles.label}>Resting ECG</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editableFeatures.RestingECG || "Normal"}
                    onValueChange={(value) => updateEditableFeature("RestingECG", value)}
                    style={styles.picker}
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
                  placeholder="Enter max HR"
                  keyboardType="numeric"
                  value={editableFeatures.MaxHR?.toString() || ""}
                  onChangeText={(value) =>
                    updateEditableFeature("MaxHR", value === "" ? "" : parseInt(value))
                  }
                />

                {/* ExerciseAngina */}
                <Text style={styles.label}>Exercise Induced Angina</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editableFeatures.ExerciseAngina || "N"}
                    onValueChange={(value) => updateEditableFeature("ExerciseAngina", value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="No (N)" value="N" />
                    <Picker.Item label="Yes (Y)" value="Y" />
                  </Picker>
                </View>

                {/* Oldpeak */}
                <Text style={styles.label}>Oldpeak (ST depression)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter oldpeak"
                  keyboardType="decimal-pad"
                  value={editableFeatures.Oldpeak?.toString() || ""}
                  onChangeText={(value) => {
                    if (/^\d*\.?\d*$/.test(value)) {
                      updateEditableFeature("Oldpeak", value === "" ? "" : parseFloat(value));
                    }
                  }}
                  maxLength={6}
                />

                {/* ST_Slope */}
                <Text style={styles.label}>ST Slope</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editableFeatures.ST_Slope || "Up"}
                    onValueChange={(value) => updateEditableFeature("ST_Slope", value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Up" value="Up" />
                    <Picker.Item label="Flat" value="Flat" />
                    <Picker.Item label="Down" value="Down" />
                  </Picker>
                </View>

                {/* Edit Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: "#2ecc71" }]}
                    onPress={handleSaveFeatures}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: "#e74c3c" }]}
                    onPress={handleCancelEdit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.featuresDisplay}>
                <Text style={styles.featuresText}>Age: {extractedFeatures.Age ?? "N/A"}</Text>
                <Text style={styles.featuresText}>
                  Sex:{" "}
                  {extractedFeatures.Sex === "M"
                    ? "Male"
                    : extractedFeatures.Sex === "F"
                    ? "Female"
                    : "N/A"}
                </Text>
                <Text style={styles.featuresText}>
                  Chest Pain Type: {extractedFeatures.ChestPainType ?? "N/A"}
                </Text>
                <Text style={styles.featuresText}>
                  Resting BP: {extractedFeatures.RestingBP ?? "N/A"} mm Hg
                </Text>
                <Text style={styles.featuresText}>
                  Cholesterol: {extractedFeatures.Cholesterol ?? "N/A"} mg/dl
                </Text>
                <Text style={styles.featuresText}>
                  Fasting BS: {extractedFeatures.FastingBS === 1 ? "High (>120 mg/dl)" : "Normal"}
                </Text>
                <Text style={styles.featuresText}>
                  Resting ECG: {extractedFeatures.RestingECG ?? "N/A"}
                </Text>
                <Text style={styles.featuresText}>
                  Max HR: {extractedFeatures.MaxHR ?? "N/A"}
                </Text>
                <Text style={styles.featuresText}>
                  Exercise Angina: {extractedFeatures.ExerciseAngina === "Y" ? "Yes" : "No"}
                </Text>
                <Text style={styles.featuresText}>
                  Oldpeak: {extractedFeatures.Oldpeak ?? "N/A"} (ST depression)
                </Text>
                <Text style={styles.featuresText}>
                  ST Slope: {extractedFeatures.ST_Slope ?? "N/A"}
                </Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditFeatures}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editButtonText}>Edit Features</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Final Analysis Section */}
            <View style={styles.finalAnalysisSection}>
              <Text style={styles.label}>Patient Name for Final Analysis</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter patient name (e.g., John Doe)"
                value={finalPatientName}
                onChangeText={setFinalPatientName}
                editable={!isAnalyzing}
              />
              <TouchableOpacity
                style={[styles.submitButtonShadow, isAnalyzing && styles.disabledButton]}
                onPress={handleFinalAnalyze}
                activeOpacity={0.85}
                disabled={isAnalyzing || !finalPatientName.trim()}
              >
                <LinearGradient
                  colors={isAnalyzing ? ["#ccc", "#ccc"] : ["#5A81F8", "#3b62ce"]}
                  style={styles.submitButton}
                  start={{ x: 0.0, y: 0.0 }}
                  end={{ x: 1.0, y: 1.0 }}
                >
                  <Ionicons name={isAnalyzing ? "hourglass" : "analytics"} size={24} color="white" />
                  <Text style={styles.submitButtonText}>
                    {isAnalyzing ? "Analyzing..." : "Final Analyze & Save"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {isAnalyzing && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#5A81F8" />
                  <Text style={styles.loadingText}>Performing final analysis...</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Analysis Result Display */}
        {analysisResult && (
          <View style={{ marginBottom: 30 }}>{renderPatientDiagnosisItem({ item: analysisResult })}</View>
        )}

        {/* Audio Diagnosis Results */}
        {audioDiagnosis && !extractedFeatures && (
          <View style={{ marginBottom: 30 }}>{renderAudioDiagnosis(audioDiagnosis)}</View>
        )}

        {/* Heart Disease Prediction Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Heart Disease Prediction</Text>
          <Text style={styles.sectionSubtitle}>Enter patient details to predict risk.</Text>
        </View>

        <View style={styles.formSection}>
          {/* Patient Name Input */}
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

        {/* Heart Submit Button */}
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

        {/* Heart Prediction Result Card */}
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
                Risk Level: <Text style={styles.riskBold}>{heartResult.RiskLevel}</Text>
              </Text>
              <Text style={styles.resultProb}>
                Probability: <Text style={styles.probBold}>{(heartResult.Probability * 100).toFixed(2)}%</Text>
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* Patient History Search Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patient History Search</Text>
          <Text style={styles.sectionSubtitle}>
            Search for a patient's past predictions and recommendations.
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
            <Text style={styles.noDataSubtext}>Create a new prediction using the Heart Disease section above.</Text>
          </View>
        ) : null}

        {/* Logout button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e8f0fe",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#34495e",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 1,
    textShadowColor: "#a0c4ff",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 17,
    color: "#5d6d7e",
    textAlign: "center",
    marginBottom: 30,
    fontWeight: "600",
    fontStyle: "italic",
  },
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 14,
    elevation: 6,
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 0,
    fontSize: 17,
    color: "#34495e",
    fontWeight: "600",
  },
  searchButton: {
    backgroundColor: "#2980b9",
    borderRadius: 10,
    padding: 14,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 52,
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: "#a8b9d6",
    shadowOpacity: 0,
    elevation: 0,
  },
  recordSection: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 20,
  },
  recordButtonShadow: {
    borderRadius: 999,
    shadowColor: "#2980b9",
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  recordButton: {
    width: 170,
    height: 170,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  recordButtonText: {
    marginTop: 14,
    color: "white",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.6,
    textShadowColor: "#2c3e50",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  loadingContainer: {
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#2980b9",
    fontSize: 17,
    fontWeight: "700",
  },
  collapsibleCardContainer: {
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6e0ff",
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 22,
    backgroundColor: "#ebf3ff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#c3d1ff",
  },
  collapsibleIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#2980b9",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 8,
  },
  collapsibleTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2c3e50",
    letterSpacing: 0.3,
  },
  collapsibleContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  collapsibleText: {
    fontSize: 16,
    color: "#34495e",
    lineHeight: 24,
    fontWeight: "600",
  },
  sectionHeader: {
    marginTop: 35,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#34495e",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 17,
    color: "#5d6d7e",
    textAlign: "center",
    fontWeight: "600",
    fontStyle: "italic",
  },
  sectionContainer: {
    marginBottom: 30,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6e0ff",
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    padding: 20,
  },
  formSection: {
    marginBottom: 30,
  },
  label: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 17,
    color: "#34495e",
    fontWeight: "600",
    elevation: 5,
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 5,
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: 12,
  },
  picker: {
    height: 55,
  },
  submitButtonShadow: {
    alignSelf: "center",
    borderRadius: 30,
    shadowColor: "#2980b9",
    shadowOpacity: 0.6,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
    marginBottom: 30,
    flexDirection: "row",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 30,
    justifyContent: "center",
    minWidth: 240,
  },
  submitButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
    marginLeft: 10,
    letterSpacing: 0.6,
  },
  resultCardGradient: {
    borderRadius: 25,
    marginHorizontal: 12,
    marginBottom: 30,
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  resultCard: {
    backgroundColor: "#fff0f0",
    borderRadius: 25,
    padding: 30,
    alignSelf: "center",
    width: cardWidth,
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    alignItems: "center",
  },
  cardIconContainer: {
    marginBottom: 16,
    backgroundColor: "#f9d7d5",
    padding: 18,
    borderRadius: 60,
    alignSelf: "center",
    shadowColor: "#e74c3c",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#c0392b",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 1,
  },
  resultRisk: {
    fontSize: 20,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 12,
  },
  resultProb: {
    fontSize: 20,
    color: "#7f8c8d",
    textAlign: "center",
  },
  riskBold: {
    fontWeight: "bold",
    color: "#e74c3c",
  },
  probBold: {
    fontWeight: "bold",
    color: "#2980b9",
  },
  logoutContainer: {
    marginTop: 20,
    alignItems: "center",
    marginBottom: 30,
  },
  logoutButton: {
    backgroundColor: "#c0392b",
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 60,
    shadowColor: "#c0392b",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  retryButton: {
    backgroundColor: "#2980b9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 120,
  },
  retryButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  noDataContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    marginBottom: 20,
  },
  noDataText: {
    fontSize: 20,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
    lineHeight: 26,
  },
  noDataSubtext: {
    fontSize: 15,
    color: "#bbb",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 22,
    fontWeight: "400",
  },
  editForm: {
    marginTop: 20,
  },
  featuresDisplay: {
    marginTop: 20,
  },
  featuresText: {
    fontSize: 16,
    color: "#34495e",
    marginBottom: 8,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#2980b9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "center",
    marginTop: 20,
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  finalAnalysisSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#d6e0ff",
  },
  textDisplayContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 12,
    maxHeight: 150,
    elevation: 5,
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  textDisplay: {
    fontSize: 16,
    color: "#34495e",
    lineHeight: 24,
    fontWeight: "500",
  },
});

const patientStyles = StyleSheet.create({
  listContainer: {
    paddingBottom: 40,
  },
  diagnosisContainer: {
    marginBottom: 30,
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  dateBanner: {
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 18,
    alignSelf: "center",
    shadowColor: "#222",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dateBannerText: {
    fontWeight: "700",
    fontSize: 18,
    color: "white",
    letterSpacing: 0.5,
    textAlign: "center",
    fontFamily: "System",
  },
  sectionContainer: {
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: "#fefefe",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d6e0ff",
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#ebf3ff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#c3d1ff",
  },
  iconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#2c3e50",
    letterSpacing: 0.4,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  listItemContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3498db",
    marginTop: 8,
    marginRight: 12,
    shadowColor: "#3498db",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  listItemText: {
    fontSize: 15,
    color: "#34495e",
    flexShrink: 1,
    lineHeight: 22,
    fontWeight: "500",
  },
  predictionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  predictionText: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.4,
  },
});

           