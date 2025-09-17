import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Audio } from 'expo-av';
import Animated, { FadeInDown, FadeInUp, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Modal from 'react-native-modal';

const screenWidth = Dimensions.get('window').width;
const numColumns = 2;
const cardMargin = 10;
const cardWidth = (screenWidth - cardMargin * (numColumns * 2)) / numColumns;

const DATA_CARDS = [
  { key: 'symptoms', title: 'Symptoms', icon: 'stethoscope' },
  { key: 'prediction', title: 'Prediction', icon: 'heartbeat' },
  { key: 'medicines', title: 'Medicines', icon: 'pills' },
];

const LoadingIndicator = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4a90e2" />
    <Text style={styles.loadingText}>Analyzing recording...</Text>
  </View>
);

const DiagnosisCard = ({ item, data }) => (
  <Animated.View style={styles.card} entering={FadeInUp.delay(item.delay || 0).duration(800)}>
    <View style={styles.cardIcon}>
      <FontAwesome5 name={item.icon} size={24} color="#3a7bd5" />
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
      if (permission.status !== 'granted') {
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
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    setIsLoading(true);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);

    // Simulate API call and analysis
    await new Promise(res => setTimeout(res, 3000));
    setDiagnosis({
      symptoms: ['Chest pain', 'Shortness of breath'],
      prediction: 'Heart Disease Positive',
      medicines: ['Aspirin', 'Statins'],
    });

    setIsLoading(false);
    setRecording(null);
  }

  const renderCardItem = ({ item }) => {
    let data;
    switch (item.key) {
      case 'symptoms':
        data = diagnosis.symptoms.join(', ');
        break;
      case 'prediction':
        data = diagnosis.prediction;
        break;
      case 'medicines':
        data = diagnosis.medicines.length > 0 ? diagnosis.medicines.join(', ') : 'N/A';
        break;
      default:
        data = '';
    }
    return <DiagnosisCard item={item} data={data} />;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SafeAreaView>
        <Text style={styles.title}>Doctor Dashboard</Text>
        <Text style={styles.subtitle}>Start a new diagnosis by recording a patient's description.</Text>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={isRecording ? stopRecording : startRecording}>
            <LinearGradient
              colors={isRecording ? ['#e05247', '#e05247'] : ['#4a90e2', '#3477e2']}
              style={styles.gradientFill}>
              <Ionicons
                name={isRecording ? 'stop-circle-outline' : 'mic-outline'}
                size={40}
                color="white"
              />
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isLoading && <LoadingIndicator />}

        {diagnosis && (
          <Animated.View entering={FadeInUp.duration(1000)} style={styles.diagnosisResults}>
            <Text style={styles.resultsTitle}>Diagnosis Results</Text>
            <FlatList
              data={DATA_CARDS.map((item, index) => ({ ...item, delay: index * 200 }))}
              renderItem={renderCardItem}
              keyExtractor={item => item.key}
              numColumns={numColumns}
              scrollEnabled={false}
              contentContainerStyle={{ alignItems: 'center' }}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}
      </SafeAreaView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity onPress={() => navigation.navigate('DoctorRegister')} style={styles.linkButton}>
          <Text style={styles.linkText}>Need an account? Register here</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
      <Modal isVisible={isModalVisible} onBackdropPress={() => setModalVisible(false)}>
        <View style={styles.modalContent}>
          <Ionicons name="mic-off-outline" size={50} color="#FF6347" />
          <Text style={styles.modalText}>Permission to access microphone is required!</Text>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  actionSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordButton: {
    borderRadius: 999,
    width: 150,
    height: 150,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  gradientFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingText: {
    marginTop: 10,
    color: '#4a90e2',
    fontSize: 16,
  },
  diagnosisResults: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#eef3f7',
    borderRadius: 15,
    padding: 15,
    margin: cardMargin,
    width: cardWidth,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    textAlign: 'center',
    marginBottom: 5,
  },
  cardData: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  bottomButtons: {
    marginTop: 30,
    alignItems: 'center',
  },
  linkButton: {
    marginBottom: 15,
  },
  linkText: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ff6347',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 40,
    shadowColor: '#ff6347',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
