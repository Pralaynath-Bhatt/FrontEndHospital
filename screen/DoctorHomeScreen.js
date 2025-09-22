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
  ScrollView,
} from "react-native";
import BASE_URL from "../screens/Config"; // Ensure this path is correct
import { Audio } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";

const screenWidth = Dimensions.get("window").width;
const cardMargin = 12;
const cardWidth = screenWidth - cardMargin * 4;

const DATA_BLOCKS = [
  { key: "symptoms", title: "Symptoms", icon: "stethoscope" },
  { key: "medicines", title: "Medicines", icon: "pills" },
  { key: "summary", title: "Summary", icon: "file-alt" },
];

export default function DoctorHomeScreen({ onLogout }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);

  const navigation = useNavigation();

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
        `${BASE_URL}/api/audio/analyze`,
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
      <View style={styles.card}>
        <View style={styles.cardIconContainer}>
          <FontAwesome5 name={item.icon} size={28} color="#5A81F8" />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardContent}>{content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Audio Diagnosis</Text>
        <Text style={styles.subtitle}>
          Record a patient's description and get diagnosis results.
        </Text>

        <View style={styles.recordSection}>
          <TouchableOpacity
            style={styles.recordButtonShadow}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.85}
            disabled={isUploading}
          >
            <LinearGradient
              colors={
                isRecording ? ["#e05247", "#d8433f"] : ["#5A81F8", "#3b62ce"]
              }
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
              <Text style={styles.loadingText}>Analyzing audio...</Text>
            </View>
          )}
        </View>

        {diagnosis && (
          <FlatList
            data={DATA_BLOCKS}
            renderItem={renderBlock}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false}
          />
        )}

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          onPress={() => onLogout(navigation)}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  recordSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  recordButtonShadow: {
    borderRadius: 999,
    shadowColor: "#5A81F8",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  recordButton: {
    width: 160,
    height: 160,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  recordButtonText: {
    marginTop: 12,
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#5A81F8",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#ebf0ff",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 25,
    marginBottom: 20,
    width: cardWidth,
    alignSelf: "center",
    elevation: 5,
    shadowColor: "#5A81F8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  cardIconContainer: {
    marginBottom: 12,
    backgroundColor: "#d6e0ff",
    padding: 14,
    borderRadius: 50,
    alignSelf: "center",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2a3a8c",
    marginBottom: 8,
    textAlign: "center",
  },
  cardContent: {
    fontSize: 16,
    color: "#4e5a87",
    textAlign: "center",
    lineHeight: 22,
  },
  logoutButton: {
    backgroundColor: "#e05247",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: "center",
    marginTop: 30,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
