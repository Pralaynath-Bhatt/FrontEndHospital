import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@doctor_auth_token';
const DOCTOR_DATA_KEY = '@doctor_data';

export const AuthStorage = {
  // Save token and doctor data
  saveAuth: async (token, doctorData) => {
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(DOCTOR_DATA_KEY, JSON.stringify(doctorData));
      return true;
    } catch (error) {
      console.error('Error saving auth:', error);
      return false;
    }
  },

  // Get token
  getToken: async () => {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  // Get doctor data
  getDoctorData: async () => {
    try {
      const data = await AsyncStorage.getItem(DOCTOR_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting doctor data:', error);
      return null;
    }
  },

  // Clear auth (logout)
  clearAuth: async () => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(DOCTOR_DATA_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing auth:', error);
      return false;
    }
  },

  // Check if user is logged in
  isLoggedIn: async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      return !!token;
    } catch (error) {
      return false;
    }
  },
};