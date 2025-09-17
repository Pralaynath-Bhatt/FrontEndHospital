import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  FlatList,
  Dimensions,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Audio } from 'expo-av';
import Animated, { FadeInLeft, FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
import axios from 'axios'; // Make sure axios is installed

const screenWidth = Dimensions.get('window').width;
const numColumns = 2;
const cardMargin = 10;
const cardWidth = (screenWidth - cardMargin * (numColumns * 2)) / numColumns;

const dismissKeyboard = () => Keyboard.dismiss();

export default function DoctorHomeScreen({ onLogout }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientDiagnosisList, setPatientDiagnosisList] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Mock start recording function (same as before)
  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Permission to access microphone is required!');
        return;
      }
      setIsLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsLoading(false);
    }
  }

  // Mock stop recording function (same as before)
  async function stopRecording() {
    setIsLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);

      // Mock upload returning dummy diagnosis
      const response = await new Promise((resolve) => {
        setTimeout(() => resolve({
          symptoms: ['Chest pain', 'Shortness of breath'],
          prediction: 'Heart Disease Positive',
          medicines: ['Aspirin', 'Beta Blockers', 'Statins'],
          prescription: ['Take Aspirin 75mg daily', 'Avoid smoking'],
        }), 2000);
      });

      setDiagnosis(response);
    } catch (error) {
      console.error(error);
      alert('Error uploading audio');
    }
    setIsLoading(false);
    setRecording(null);
  }

  // Fetch patient diagnosis list by patient ID (replace with real API call)
  async function searchPatientDiagnoses() {
    if (!patientIdInput.trim()) {
      alert('Please enter a Patient ID or name');
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    setPatientDiagnosisList(null);

    try {
      // Replace the below with real API call, for example:
      // const response = await axios.get(`https://your-backend/api/diagnosis/patientByIdOrName?query=${patientIdInput.trim()}`);

      // MOCK response:
      await new Promise((res) => setTimeout(res, 1500)); // simulate network delay
      // Simulate no patient found:
      if (patientIdInput.trim().toLowerCase() === 'unknown') {
        throw new Error('Patient not found');
      }

      const mockData = [
        {
          date: '2024-06-15',
          symptoms: ['Mild chest pain', 'Fatigue'],
          prediction: 'Heart Disease Negative',
          medicines: ['Vitamin D', 'Exercise'],
        },
        {
          date: '2024-03-10',
          symptoms: ['Shortness of breath', 'High blood pressure'],
          prediction: 'Heart Disease Positive',
          medicines: ['Aspirin', 'Beta Blockers'],
        },
      ];

      setPatientDiagnosisList(mockData);
    } catch (err) {
      setSearchError(err.message || 'Failed to load patient diagnosis');
    }
    setSearchLoading(false);
  }

  const dataCards = diagnosis
    ? [
        {
          key: 'symptoms',
          title: 'Symptoms',
          data: diagnosis.symptoms,
          entering: FadeInLeft.delay(100),
        },
        {
          key: 'prediction',
          title: 'Prediction',
          data: [diagnosis.prediction],
          entering: FadeInDown.delay(200),
        },
        {
          key: 'medicines',
          title: 'Medicines',
          data: diagnosis.medicines,
          entering: FadeInUp.delay(300),
        },
        {
          key: 'prescription',
          title: 'Prescription',
          data: diagnosis.prescription || ['No prescriptions'],
          entering: FadeInRight.delay(400),
        },
      ]
    : [];

  const renderCardItem = ({ item }) => (
    <Animated.View
      entering={item.entering}
      style={[styles.card, { width: cardWidth, margin: cardMargin }]}
    >
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.data.map((line, idx) => (
        <Text key={idx} style={styles.cardText}>
          • {line}
        </Text>
      ))}
    </Animated.View>
  );

  // Render cards for searched patient's diagnosis
  const renderPatientDiagnosisCard = ({ item, index }) => (
    <View key={index} style={styles.diagnosisContainer}>
      <Text style={styles.date}>Date: {item.date}</Text>
      <View style={styles.patientCardsGrid}>
        <View style={[styles.patientCard, { width: cardWidth }]}>
          <Text style={styles.patientCardTitle}>Symptoms</Text>
          {item.symptoms && item.symptoms.length > 0 ? (
            item.symptoms.map((s, i) => (
              <Text key={i} style={styles.patientCardText}>
                • {s}
              </Text>
            ))
          ) : (
            <Text style={styles.patientCardText}>None</Text>
          )}
        </View>
        <View style={[styles.patientCard, { width: cardWidth }]}>
          <Text style={styles.patientCardTitle}>Prediction</Text>
          <Text style={[styles.patientCardText, { fontWeight: 'bold' }]}>
            {item.prediction}
          </Text>
        </View>
        <View style={[styles.patientCard, { width: cardWidth }]}>
          <Text style={styles.patientCardTitle}>Medicines</Text>
          {item.medicines && item.medicines.length > 0 ? (
            item.medicines.map((m, i) => (
              <Text key={i} style={styles.patientCardText}>
                • {m}
              </Text>
            ))
          ) : (
            <Text style={styles.patientCardText}>None</Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Doctor Home</Text>

        {/* Patient Search Box */}
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Enter Patient ID or Name"
            value={patientIdInput}
            onChangeText={setPatientIdInput}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={searchPatientDiagnoses}
          />
          <Button
            title={searchLoading ? 'Searching...' : 'Search'}
            onPress={searchPatientDiagnoses}
            disabled={searchLoading}
          />
        </View>

        {/* Search Result / Error */}
        {searchError ? (
          <Text style={styles.errorText}>{searchError}</Text>
        ) : null}

        {patientDiagnosisList && patientDiagnosisList.length > 0 && (
          <>
            <Text style={styles.searchResultTitle}>Patient Diagnosis Reports</Text>
            {patientDiagnosisList.map((item, idx) => renderPatientDiagnosisCard({ item, index: idx }))}
          </>
        )}

        {/* Audio Recording Section */}
        <View style={{ marginVertical: 20 }}>
          {!isRecording ? (
            <Button title="Start Recording" onPress={startRecording} disabled={isLoading} />
          ) : (
            <Button title="Stop Recording" onPress={stopRecording} disabled={isLoading} color="red" />
          )}
        </View>

        {/* Latest Diagnosis from current audio recording */}
        {diagnosis && (
          <FlatList
            data={dataCards}
            renderItem={renderCardItem}
            keyExtractor={(item) => item.key}
            numColumns={numColumns}
            scrollEnabled={false}
            contentContainerStyle={{ alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={{ marginTop: 20 }}>
          <Button title="Logout" onPress={onLogout} color="gray" />
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#777',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flex: 1,
    marginRight: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  searchResultTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  diagnosisContainer: {
    marginBottom: 30,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 15,
  },
  date: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
    color: '#1e40af',
  },
  patientCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  patientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    minHeight: 120,
  },
  patientCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#123a8d',
  },
  patientCardText: {
    fontSize: 15,
    marginBottom: 4,
    color: '#334880',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: 140,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 15,
    marginBottom: 5,
  },
});