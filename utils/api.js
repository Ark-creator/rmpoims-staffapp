import axios from "axios";
import address from "./ipaddress.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: address,
  timeout: 10000, // Kept the timeout from your original code
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// This interceptor adds the auth token to every request AFTER login
api.interceptors.request.use(
  async (config) => {
    // Get the token from storage
    const token = await AsyncStorage.getItem("authToken");

    // If the token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

export default api;