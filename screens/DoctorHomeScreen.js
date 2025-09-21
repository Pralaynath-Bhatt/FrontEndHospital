import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  SafeAreaView,
} from "react-native";
import { Audio } from "expo-av";
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import Modal from "react-native-modal";

const screenWidth = Dimensions.get("window").width;
const numColumns = 2;
const cardMargin = 12;
const cardWidth = (screenWidth - cardMargin * (numColumns * 2 + 2)) / numColumns;

const DATA_CARDS = [
  { key: "symptoms", title: "Symptoms", icon: "stethoscope" },
  { key: "prediction", title: "Prediction", icon: "heartbeat" },
  { key: "medicines", title: "Medicines", icon: "pills" },
];

const LoadingIndicator = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#5A81F8" />
    <Text style={styles.loadingText}>Analyzing recording...</Text>
  </View>
);

const DiagnosisCard = ({ item, data }) => (
  <Animated.View
    style={styles.card}
    entering={FadeInUp.delay(item.delay || 0).duration(700)}
  >
    <View style={styles.cardIconContainer}>
      <FontAwesome5 name={item.icon} size={28} color="#5A81F8" />
    </View>
    <Text style={styles.cardTitle}>{item.title}</Text>
    <Text style={styles.cardData}>{data}</Text>
  </Animated.View>
);

export default function DoctorHomeScreen({ navigation, onLogout }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        setModalVisible(true);
        return;
      }
      setIsRecording(true);
      setDiagnosis(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setIsRecording(false);
    setIsLoading(true);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log("Recording stopped and stored at", uri);

    // Simulate API call and analysis
    await new Promise((res) => setTimeout(res, 3000));
    setDiagnosis({
      symptoms: ["Chest pain", "Shortness of breath"],
      prediction: "Heart Disease Positive",
      medicines: ["Aspirin", "Statins"],
    });

    setIsLoading(false);
    setRecording(null);
  }

  const renderCardItem = ({ item }) => {
    let data;
    switch (item.key) {
      case "symptoms":
        data = diagnosis.symptoms.join(", ");
        break;
      case "prediction":
        data = diagnosis.prediction;
        break;
      case "medicines":
        data =
          diagnosis.medicines.length > 0
            ? diagnosis.medicines.join(", ")
            : "N/A";
        break;
      default:
        data = "";
    }
    return <DiagnosisCard item={item} data={data} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Doctor Dashboard</Text>
        <Text style={styles.subtitle}>
          Start a new diagnosis by recording a patient's description.
        </Text>

        <View style={styles.actionSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.recordButtonShadow]}
            onPress={isRecording ? stopRecording : startRecording}
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
        </View>

        {isLoading && <LoadingIndicator />}

        {diagnosis && (
          <Animated.View entering={FadeInUp.duration(1000)} style={styles.diagnosisResults}>
            <Text style={styles.resultsTitle}>Diagnosis Results</Text>
            <FlatList
              data={DATA_CARDS.map((item, index) => ({ ...item, delay: index * 250 }))}
              renderItem={renderCardItem}
              keyExtractor={(item) => item.key}
              numColumns={numColumns}
              scrollEnabled={false}
              contentContainerStyle={styles.flatListContainer}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            onPress={() => navigation.navigate("DoctorRegister")}
            style={styles.linkButton}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Need an account? Register here</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogout}
            style={styles.logoutButton}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutButtonText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>

        <Modal
          isVisible={isModalVisible}
          onBackdropPress={() => setModalVisible(false)}
          animationIn="fadeIn"
          animationOut="fadeOut"
          backdropTransitionOutTiming={0}
        >
          <View style={styles.modalContent}>
            <Ionicons name="mic-off" size={60} color="#FF6347" />
            <Text style={styles.modalText}>
              Permission to access microphone is required!
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Modal>
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
    flexGrow: 1,
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  actionSection: {
    alignItems: "center",
    marginBottom: 45,
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  loadingText: {
    marginTop: 12,
    color: "#5A81F8",
    fontSize: 16,
    fontWeight: "600",
  },
  diagnosisResults: {
    backgroundColor: "white",
    borderRadius: 22,
    paddingVertical: 25,
    paddingHorizontal: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  flatListContainer: {
    alignItems: "center",
  },
  card: {
    backgroundColor: "#ebf0ff",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 15,
    margin: cardMargin,
    width: cardWidth,
    elevation: 5,
    shadowColor: "#5A81F8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  cardIconContainer: {
    marginBottom: 12,
    backgroundColor: "#d6e0ff",
    padding: 12,
    borderRadius: 50,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2a3a8c",
    marginBottom: 8,
    textAlign: "center",
  },
  cardData: {
    fontSize: 15,
    color: "#4e5a87",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomButtons: {
    marginTop: 40,
    alignItems: "center",
  },
  linkButton: {
    marginBottom: 18,
  },
  linkText: {
    color: "#5A81F8",
    fontSize: 17,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#e05247",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 55,
    shadowColor: "#e05247",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  modalText: {
    fontSize: 19,
    fontWeight: "600",
    marginVertical: 18,
    textAlign: "center",
    color: "#333",
  },
  modalButton: {
    backgroundColor: "#5A81F8",
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 10,
  },
  modalButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
});