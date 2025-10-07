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

export default function AudioDiagnosisScreen({ onLogout }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [searchText, setSearchText] = useState("");

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
        Alert.alert(
          "Permission required",
          "Microphone permission is required to record audio."
        );
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!searchText.trim()) {
      Alert.alert("Error", "Please enter some text.");
      return;
    }
    try {
      setDiagnosis(null);
      setIsUploading(true);
      const response = await axios.post(
        `${BASE_URL}:8080/api/text/analyze`,
        { text: searchText },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 && response.data) {
        setDiagnosis(response.data);
      } else {
        Alert.alert("Error", "Failed to get diagnosis from server.");
      }
    } catch (error) {
      Alert.alert(
        "Search Error",
        error.response?.data?.message || error.message || "Something went wrong!"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (heartResult) setHeartResult(null);
  };

  const handleHeartSubmit = async () => {
    const requiredFields = [
      "patientName",
      "Age",
      "RestingBP",
      "Cholesterol",
      "MaxHR",
      "Oldpeak",
    ];
    for (let field of requiredFields) {
      if (!formData[field] || formData[field].trim() === "") {
        Alert.alert("Error", `${field.replace(/([A-Z])/g, " $1").trim()} is required.`);
        return;
      }
      if (field !== "patientName" && isNaN(parseFloat(formData[field]))) {
        Alert.alert("Error", `${field} must be a number.`);
        return;
      }
    }
    if (parseInt(formData.FastingBS) !== 0 && parseInt(formData.FastingBS) !== 1) {
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
        patientData: patientData,
      };

      const response = await axios.post(`${BASE_URL}:8080/api/heart/predict`, requestBody, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200 && response.data && response.data.length > 0) {
        setHeartResult(response.data[0]);
      } else {
        Alert.alert("Error", "Failed to get prediction from server.");
      }
    } catch (error) {
      Alert.alert(
        "Submission Error",
        error.response?.data || error.message || "Something went wrong!"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      setDiagnosis(null);
      setIsRecording(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
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

      const formData = new FormData();
      formData.append("audioFile", {
        uri,
        name: fileName,
        type: fileType,
      });

      const response = await axios.post(
        `${BASE_URL}:8080/api/audio/analyze`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200 && response.data) {
        setDiagnosis(response.data);
      } else {
        Alert.alert("Error", "Failed to get diagnosis from server.");
      }
    } catch (error) {
      Alert.alert(
        "Upload Error",
        error.response?.data || error.message || "Something went wrong!"
      );
    } finally {
      setIsUploading(false);
      setRecording(null);
    }
  };

  const renderBlock = ({ item }) => {
    let content = diagnosis ? diagnosis[item.key] : null;

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

        {/* Text Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Type a patient's description here..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              multiline={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              editable={!isUploading}
            />
            <TouchableOpacity
              style={[
                styles.searchButton,
                (isUploading || !searchText.trim()) && styles.disabledButton,
              ]}
              onPress={handleSearch}
              disabled={isUploading || !searchText.trim()}
            >
              <Ionicons
                name="search"
                size={24}
                color={isUploading || !searchText.trim() ? "#999" : "white"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Audio Recording Section */}
        <View style={styles.recordSection}>
          <TouchableOpacity
            style={[styles.recordButtonShadow]}
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
              <Ionicons
                name={isRecording ? "stop-circle" : "mic"}
                size={50}
                color="white"
              />
              <Text style={styles.recordButtonText}>
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          {isUploading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5A81F8" />
              <Text style={styles.loadingText}>Analyzing...</Text>
            </View>
          )}
        </View>

        {/* Audio/Text Diagnosis Results */}
        {diagnosis && (
          <View style={{ marginBottom: 20 }}>
            {DATA_BLOCKS.map((block) => renderBlock({ item: block }))}
          </View>
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
          style={[
            styles.submitButtonShadow,
            isSubmitting && styles.disabledButton,
          ]}
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
            <Ionicons
              name={isSubmitting ? "hourglass" : "send"}
              size={24}
              color="white"
            />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Analyzing..." : "Predict Heart Risk"}
            </Text>
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
                Risk Level:{" "}
                <Text style={styles.riskBold}>{heartResult.RiskLevel}</Text>
              </Text>
              <Text style={styles.resultProb}>
                Probability:{" "}
                <Text style={styles.probBold}>
                  {(heartResult.Probability * 100).toFixed(2)}%
                </Text>
              </Text>
            </View>
          </LinearGradient>
        )}

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
});