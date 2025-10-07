import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInUp, FadeInLeft } from 'react-native-reanimated';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import BASE_URL from './Config'; // Adjust path if needed

const screenWidth = Dimensions.get('window').width;

const DiagnosisSection = ({
  title,
  iconName,
  iconColor,
  children,
  isExpandedDefault = false,
}) => {
  const [expanded, setExpanded] = useState(isExpandedDefault);

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={styles.sectionHeader}
      >
        <LinearGradient
          colors={[iconColor + 'cc', iconColor + '66']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.iconBackground}
        >
          <FontAwesome5 name={iconName} size={20} color="white" />
        </LinearGradient>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#444"
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

const renderDiagnosisItem = ({ item }) => {
  const isPositive =
    item.prediction.toLowerCase().includes('high') ||
    item.prediction.toLowerCase().includes('positive');

  // Gradient colors based on prediction
  const gradientColors = isPositive
    ? ['#ff4e50', '#f9d423']
    : ['#11998e', '#38ef7d'];

  return (
    <Animated.View
      style={styles.diagnosisContainer}
      entering={FadeInLeft.duration(800)}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.dateBanner}
      >
        <Text style={styles.dateBannerText}>{item.date}</Text>
      </LinearGradient>

      <DiagnosisSection
        title="Symptoms & Input Details"
        iconName="stethoscope"
        iconColor="#3498db"
        isExpandedDefault={false}
      >
        {item.symptoms.length > 0 ? (
          item.symptoms.map((symptom, index) => (
            <View key={index} style={styles.listItemContainer}>
              <View style={styles.bulletPoint} />
              <Text style={styles.listItemText}>{symptom}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.listItemText}>No detailed inputs recorded</Text>
        )}
      </DiagnosisSection>

      <DiagnosisSection
        title="Prediction"
        iconName="heartbeat"
        iconColor={isPositive ? '#e74c3c' : '#2ecc71'}
        isExpandedDefault={true}
      >
        <View style={styles.predictionWrapper}>
          <FontAwesome5
            name="heart"
            size={30}
            color={isPositive ? '#e74c3c' : '#2ecc71'}
            style={{ marginRight: 10 }}
          />
          <Text
            style={[
              styles.predictionText,
              { color: isPositive ? '#e74c3c' : '#2ecc71' },
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
            <View key={idx} style={styles.listItemContainer}>
              <View style={[styles.bulletPoint, { backgroundColor: '#9b59b6' }]} />
              <Text style={styles.listItemText}>{med}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.listItemText}>No recommendations available</Text>
        )}
      </DiagnosisSection>
    </Animated.View>
  );
};

export default function PatientHomeScreen({ route, navigation, onLogout }) {
  const { patientName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [diagnosisList, setDiagnosisList] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!patientName) {
        setError('Patient information not available. Please log in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setDiagnosisList([]);

      try {
        await new Promise((res) => setTimeout(res, 1500));

        const response = await axios.get(
          `${BASE_URL}:8080/api/patient/${encodeURIComponent(
            patientName.trim()
          )}/predictions`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (
          response.status === 200 &&
          response.data &&
          Array.isArray(response.data)
        ) {
          const transformedData = response.data
            .filter((pred) => pred && pred.date && pred.riskLevel)
            .map((prediction) => {
              let date;
              if (typeof prediction.date === 'string') {
                date = new Date(prediction.date).toISOString().split('T')[0];
              } else {
                date = new Date().toISOString().split('T')[0];
              }

              const inputData = prediction.inputData || {};
              const symptoms = [
                `Age: ${inputData.Age || 'N/A'}`,
                `Sex: ${
                  inputData.Sex === 'M'
                    ? 'Male'
                    : inputData.Sex === 'F'
                    ? 'Female'
                    : 'N/A'
                }`,
                `Chest Pain Type: ${inputData.ChestPainType || 'N/A'}`,
                `Resting BP: ${inputData.RestingBP || 'N/A'} mm Hg`,
                `Cholesterol: ${inputData.Cholesterol || 'N/A'} mg/dl`,
                `Fasting BS: ${
                  inputData.FastingBS === '1'
                    ? 'High (>120 mg/dl)'
                    : 'Normal'
                }`,
                `Resting ECG: ${inputData.RestingECG || 'N/A'}`,
                `Max HR: ${inputData.MaxHR || 'N/A'}`,
                `Exercise Angina: ${
                  inputData.ExerciseAngina === 'Y' ? 'Yes' : 'No'
                }`,
                `Oldpeak: ${inputData.Oldpeak || 'N/A'} (ST depression)`,
                `ST Slope: ${inputData.ST_Slope || 'N/A'}`,
              ].filter((s) => !s.includes('N/A'));

              const symptomsList =
                symptoms.length > 0 ? symptoms : ['No detailed inputs recorded'];

              const riskLevel = prediction.riskLevel || 'Unknown';
              const probability = ((prediction.probability || 0) * 100).toFixed(1);
              const predictionStr = `Heart Disease ${riskLevel} (${probability}%)`;

              let medicines = [];
              switch (riskLevel.toLowerCase()) {
                case 'high':
                  medicines = [
                    'Aspirin (daily)',
                    'Statins (for cholesterol)',
                    'Beta-blockers (for heart rate)',
                  ];
                  break;
                case 'medium':
                  medicines = ['Aspirin (as needed)', 'Lifestyle changes recommended'];
                  break;
                case 'low':
                case 'negative':
                  medicines = ['No immediate medication; maintain healthy lifestyle'];
                  break;
                default:
                  medicines = ['Consult a doctor for recommendations'];
              }

              return {
                date,
                symptoms: symptomsList,
                prediction: predictionStr,
                medicines,
              };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

          setDiagnosisList(transformedData);
        } else {
          setDiagnosisList([]);
        }
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
        let errorMsg = 'Failed to fetch your health history.';
        if (error.response) {
          if (error.response.status === 404) {
            errorMsg = 'No predictions found for your account yet.';
          } else if (error.response.data) {
            errorMsg =
              typeof error.response.data === 'string'
                ? error.response.data
                : error.response.data.message || errorMsg;
          }
        } else if (error.code === 'ECONNABORTED') {
          errorMsg = 'Request timed out. Please check your connection.';
        } else {
          errorMsg = error.message || errorMsg;
        }
        setError(errorMsg);
        setDiagnosisList([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [patientName]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Re-run fetchData by resetting state triggers useEffect
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigation.replace('PatientLoginScreen');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your Health History</Text>
        <Text style={styles.subtitle}>
          View your past heart disease predictions and recommendations.
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#11998e" />
            <Text style={styles.loadingText}>Loading your predictions...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-triangle" size={48} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry Fetch</Text>
            </TouchableOpacity>
          </View>
        ) : diagnosisList && diagnosisList.length > 0 ? (
          <FlatList
            data={diagnosisList}
            renderItem={renderDiagnosisItem}
            keyExtractor={(item, index) => `${item.date}-${index}`}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <FontAwesome5 name="heart" size={64} color="#95a5a6" />
            <Text style={styles.noDataText}>No predictions available yet.</Text>
            <Text style={styles.noDataSubtext}>
              Complete a heart disease assessment in the Diagnosis Tools to get
              started.
            </Text>
            <TouchableOpacity
              style={styles.assessButton}
              onPress={() => navigation.navigate('AudioDiagnosisScreen')}
              activeOpacity={0.8}
            >
              <Text style={styles.assessButtonText}>Start Assessment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Layout & Global
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  listContainer: {
    paddingBottom: 40,
  },

  // Header
  title: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
    color: '#222',
    letterSpacing: 1,
    fontFamily: 'System',
    textShadowColor: '#a0d8ef',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  retryButton: {
    backgroundColor: '#2980b9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    shadowColor: '#2980b9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 120,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 20,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
    lineHeight: 26,
  },
  noDataSubtext: {
    fontSize: 15,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 22,
    fontWeight: '400',
  },
  assessButton: {
    backgroundColor: '#11998e',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: '#11998e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 7,
    minWidth: 160,
  },
  assessButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },

  diagnosisContainer: {
    marginBottom: 30,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 20,
    shadowColor: '#00796b',
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
    alignSelf: 'center',
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dateBannerText: {
    fontWeight: '700',
    fontSize: 18,
    color: 'white',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: 'System',
  },

  // Section styles
  sectionContainer: {
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#fefefe',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    shadowColor: '#444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f9fafd',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dde6f0',
  },
  iconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#273142',
    letterSpacing: 0.4,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
    marginTop: 8,
    marginRight: 12,
    shadowColor: '#3498db',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  listItemText: {
    fontSize: 15,
    color: '#3a3a3a',
    flexShrink: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  predictionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  bottomButtons: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 50,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 9,
    minWidth: 140,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});