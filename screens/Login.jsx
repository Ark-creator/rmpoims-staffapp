import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Image,
  ScrollView, // 👈 1. Pinalitan ang KeyboardAvoidingView ng ScrollView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import CustomButton from "../components/CustomButton";

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // ... walang pagbabago sa function na ito
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("mobile/staff/login", { email, password });

      console.log("📌 Login Response:", response.data);

      if (response.data.two_factor_user_id) {
        await AsyncStorage.setItem("two_factor_user_id", response.data.two_factor_user_id.toString());
        navigation.navigate("TwoFactor");
      } else if (response.data.token) {
        await AsyncStorage.setItem("authToken", response.data.token);

        if (response.data.user && response.data.user.id) {
          await AsyncStorage.setItem("userId", response.data.user.id.toString());
          console.log("✅ Stored User ID:", response.data.user.id);
        }

        navigation.replace("MainScreen");
      }
    } catch (error) {
      console.error("❌ Login Error:", error.response?.data || error.message);
      Alert.alert("Login Failed", error.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // 2. Gumamit ng ScrollView bilang pangunahing container
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.form}>
        <Image source={require("../assets/images/Logo.png")} style={styles.logo} />
        
        <Text style={styles.title}>
          Staff Login
        </Text>
        <Text style={styles.subtitle}>
          “Staff Access – Monitor Routes, Fulfill Orders, Stay Synced.”
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Staff Email"
          placeholderTextColor="gray"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="gray"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <CustomButton
          title={loading ? "Logging in..." : "Login"}
          onPress={handleLogin}
          backgroundColor="#007bff"
          style={{ marginTop: 10, borderRadius: 5, padding: 10 }}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // 3. Inayos ang container style para sa ScrollView
  container: {
    flexGrow: 1, 
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  form: {
    padding: 5,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 210,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 5,
    color: "#002f4b",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#fff",
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
});