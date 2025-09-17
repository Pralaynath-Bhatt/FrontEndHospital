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
} from 'react-native';
import { Audio } from 'expo-av';
import Animated, { FadeInDown, FadeInUp, FadeInLeft, FadeInRight } from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;
const numColumns = 2;
const cardMargin = 10;
const cardWidth = (screenWidth - cardMargin * (numColumns * 2)) / numColumns;

export default function DoctorHomeScreen({ navigation, onLogout }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);

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

  async function stopRecording() {
    setIsLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);

      // Mock upload
      const response = await new Promise(resolve => {
        setTimeout(() => resolve({
          symptoms: ['Chest pain', 'Shortness of breath'],
          prediction: 'Heart Disease Positive',
          medicines: ['Aspirin', 'Beta Blockers', 'Statins'],
          prescription: ['Take Aspirin 75mg daily', 'Avoid smoking']
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

  // Prepare data for cards
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Doctor Home</Text>

      {isLoading && <ActivityIndicator size="large" color="blue" style={{ marginBottom: 15 }} />}

      <View style={{ marginVertical: 20 }}>
        {!isRecording ? (
          <Button title="Start Recording" onPress={startRecording} disabled={isLoading} />
        ) : (
          <Button title="Stop Recording" onPress={stopRecording} disabled={isLoading} color="red" />
        )}
      </View>

      {diagnosis && (
        <FlatList
          data={dataCards}
          renderItem={renderCardItem}
          keyExtractor={item => item.key}
          numColumns={numColumns}
          scrollEnabled={false}
          contentContainerStyle={{ alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity onPress={() => navigation.navigate('DoctorRegister')}>
        <Text style={styles.registerText}>Need an account? Register here</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 20 }}>
        <Button title="Logout" onPress={onLogout} color="gray" />
      </View>
    </ScrollView>
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
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    elevation: 4, // shadow android
    shadowColor: '#000', // shadow ios
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
  registerText: {
    marginTop: 25,
    textAlign: 'center',
    color: 'blue',
    fontSize: 16,
  },
});