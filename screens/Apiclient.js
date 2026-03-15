import axios from 'axios';
import { AuthStorage } from './Authstorage';
import BASE_URL from './Config';

// Create axios instance
const apiClient = axios.create({
  baseURL: `${BASE_URL}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AuthStorage.getToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      if (token) {
        console.log(`Token: ${token.substring(0, 20)}...`);
      }
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('Token expired or invalid - clearing auth');
      await AuthStorage.clearAuth();
      
      // You can navigate to login here if you have navigation reference
      // For now, just return the error
      return Promise.reject(error);
    }

    console.error('API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;