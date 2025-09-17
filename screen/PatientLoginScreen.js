import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from 'react-native-modal';

export default function PatientLoginScreen({ navigation, onLogin }) {
  const [patientId, setPatientId] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

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
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (patientId.trim() === '') {
      setModalMessage('Please enter your Patient ID.');
      setModalVisible(true);
      return;
    }
    // TODO: validate patient via backend
    onLogin();
  };

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  return (
    <LinearGradient colors={['#11998e', '#38ef7d']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}>
            <Text style={styles.title}>Patient Login</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter Patient ID"
                placeholderTextColor="#999"
                value={patientId}
                onChangeText={setPatientId}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}>
              <Text style={styles.loginButtonText}>LOGIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('PatientRegister')}
              style={{ marginTop: 20 }}>
              <Text style={styles.link}>
                Don’t have an account? <Text style={styles.boldLink}>Register</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('DoctorLogin')}
              style={{ marginTop: 15 }}>
              <Text style={styles.link}>
                Are you a Doctor? <Text style={styles.boldLink}>Login Here</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
        <Modal isVisible={isModalVisible} onBackdropPress={toggleModal}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle-outline" size={50} color="#FF6347" />
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity onPress={toggleModal} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#11998e',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#11998e',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  boldLink: {
    fontWeight: 'bold',
    color: '#38ef7d',
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
    backgroundColor: '#11998e',
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

