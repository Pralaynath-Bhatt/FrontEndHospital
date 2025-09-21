import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen({ navigation }) {
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#3a7bd5', '#38ef7d']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <Ionicons name="medical" size={60} color="#333" style={{ marginBottom: 20 }} />
          <Text style={styles.title}>Welcome to MediChat AI</Text>
          <Text style={styles.subtitle}>
            Your personal AI-powered health assistant. Please select your role to continue.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.doctorButton}
              onPress={() => navigation.navigate('DoctorLogin')}>
              <FontAwesome5 name="user-md" size={24} color="white" />
              <Text style={styles.buttonText}>I'm a Doctor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.patientButton}
              onPress={() => navigation.navigate('PatientLogin')}>
              <FontAwesome5 name="user-injured" size={24} color="white" />
              <Text style={styles.buttonText}>I'm a Patient</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
  },
  doctorButton: {
    backgroundColor: '#3a7bd5',
    borderRadius: 15,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#3a7bd5',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  patientButton: {
    backgroundColor: '#38ef7d',
    borderRadius: 15,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    shadowColor: '#38ef7d',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
