import axios from "axios";
import address from "./ipaddress.js"; // Correctly import the address
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: address,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    // 👇 This is the key we need to fix
    const token = await AsyncStorage.getItem("authToken"); 

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;