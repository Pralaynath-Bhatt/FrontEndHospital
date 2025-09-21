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
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInUp, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;
const numColumns = 2;
const cardMargin = 10;
const cardWidth = (screenWidth - cardMargin * (numColumns * 2)) / numColumns;

const DiagnosisCard = ({ item, data }) => {
  const isPositive = data === 'Heart Disease Positive';
  return (
    <Animated.View style={styles.card} entering={FadeInUp.delay(item.delay || 0).duration(800)}>
      <View style={styles.cardIcon}>
        {isPositive ? (
          <FontAwesome5 name="exclamation-triangle" size={24} color="#e74c3c" />
        ) : (
          <FontAwesome5 name="check-circle" size={24} color="#2ecc71" />
        )}
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardData}>{data}</Text>
    </Animated.View>
  );
};

const renderDiagnosisItem = ({ item }) => {
  const DATA_CARDS = [
    { key: 'symptoms', title: 'Symptoms', icon: 'stethoscope' },
    { key: 'prediction', title: 'Prediction', icon: 'heartbeat' },
    { key: 'medicines', title: 'Medicines', icon: 'pills' },
  ];

  const diagnosisData = [
    { key: 'symptoms', data: item.symptoms.join(', ') },
    { key: 'prediction', data: item.prediction },
    { key: 'medicines', data: item.medicines.length > 0 ? item.medicines.join(', ') : 'N/A' },
  ];

  return (
    <Animated.View style={styles.diagnosisContainer} entering={FadeInLeft.duration(800)}>
      <Text style={styles.date}>{item.date}</Text>
      <FlatList
        data={DATA_CARDS.map((card, index) => ({ ...card, data: diagnosisData[index].data, delay: index * 200 }))}
        renderItem={({ item }) => <DiagnosisCard item={item} data={item.data} />}
        keyExtractor={card => card.key}
        numColumns={numColumns}
        scrollEnabled={false}
        contentContainerStyle={styles.cardsGrid}
      />
    </Animated.View>
  );
};

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
        console.error("Failed to fetch data", error);
        setDiagnosisList([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SafeAreaView>
        <Text style={styles.title}>Your Health History</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#11998e" style={{ marginTop: 50 }} />
        ) : diagnosisList && diagnosisList.length > 0 ? (
          <FlatList
            data={diagnosisList}
            renderItem={renderDiagnosisItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.noDataText}>No diagnosis data available.</Text>
        )}
      </SafeAreaView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  diagnosisContainer: {
    marginBottom: 30,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  date: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 15,
    color: '#11998e',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
  noDataText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 50,
  },
  bottomButtons: {
    marginTop: 30,
    alignItems: 'center',
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
});
