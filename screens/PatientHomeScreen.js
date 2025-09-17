import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, { FadeInUp, FadeInLeft, FadeInRight } from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;
const numColumns = 2;
const cardMargin = 10;
const cardWidth = (screenWidth - cardMargin * (numColumns * 2)) / numColumns;

export default function PatientHomeScreen({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [diagnosisList, setDiagnosisList] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        await new Promise((res) => setTimeout(res, 1500));
        const data = [
          {
            date: '2024-06-01',
            symptoms: ['Chest pain', 'Shortness of breath'],
            prediction: 'Heart Disease Positive',
            medicines: ['Aspirin', 'Statins'],
          },
          {
            date: '2024-04-15',
            symptoms: ['Fatigue'],
            prediction: 'Heart Disease Negative',
            medicines: [],
          },
        ];
        setDiagnosisList(data);
      } catch (error) {
        alert('Failed to load diagnosis data');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Render a single card inside a diagnosis report
  const renderCard = ({ title, data, animation }) => {
    return (
      <Animated.View
        entering={animation}
        style={[styles.card, { width: cardWidth, margin: cardMargin }]}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        {data && data.length > 0 ? (
          data.map((line, idx) => (
            <Text key={idx} style={styles.cardText}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.cardText}>None</Text>
        )}
      </Animated.View>
    );
  };

  // Render each diagnosis item as a group of cards (date header + grid of cards)
  const renderDiagnosisItem = ({ item, index }) => {
    return (
      <View style={styles.diagnosisContainer}>
        <Text style={styles.date}>Date: {item.date}</Text>
        <View style={styles.cardsGrid}>
          {renderCard({
            title: 'Symptoms',
            data: item.symptoms,
            animation: FadeInLeft.delay(100 * index),
          })}
          {renderCard({
            title: 'Prediction',
            data: [item.prediction],
            animation: FadeInUp.delay(150 * index),
          })}
          {renderCard({
            title: 'Medicines',
            data: item.medicines,
            animation: FadeInRight.delay(200 * index),
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Patient Home</Text>

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : diagnosisList && diagnosisList.length > 0 ? (
        <FlatList
          data={diagnosisList}
          renderItem={renderDiagnosisItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 40 }}
          scrollEnabled={false} // disable FlatList scrolling inside ScrollView
        />
      ) : (
        <Text>No diagnosis data available.</Text>
      )}

      <View style={{ marginTop: 20 }}>
        <Button title="Logout" onPress={onLogout} color="gray" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  diagnosisContainer: {
    marginBottom: 30,
    backgroundColor: '#e9f0f7',
    borderRadius: 12,
    padding: 15,
  },
  date: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
    color: '#33475b',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3, // shadow for Android
    shadowColor: '#000', // shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    minHeight: 120,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2a3a5b',
  },
  cardText: {
    fontSize: 15,
    marginBottom: 4,
    color: '#545f7a',
  },
});