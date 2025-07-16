import axios from "axios";
import address from "./ipaddress.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: address,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
