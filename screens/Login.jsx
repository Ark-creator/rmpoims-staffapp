import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import CustomButton from "../components/CustomButton";

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("mobile/staff/login", { email, password });

      // ✅ Simplified Logic: This endpoint always triggers 2FA.
      if (response.data.two_factor_user_id) {
        await AsyncStorage.setItem(
          "two_factor_user_id",
          response.data.two_factor_user_id.toString()
        );
        navigation.navigate("TwoFactor");
      } else {
        // This case should ideally not happen if the API is consistent.
        throw new Error("Received an unexpected response from the server.");
      }
    } catch (error) {
      console.error("❌ Login Error:", error.response?.data || error.message);
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.form}>
        <Image
          source={require("../assets/images/Logo.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>Staff Login</Text>
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
          autoCapitalize="none"
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
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  form: {
    padding: 20,
    borderRadius: 10,
    width: "85%",
    alignItems: "center",
    backgroundColor: 'white',
    elevation: 3,
  },
  logo: {
    width: 150,
    height: 160,
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
    backgroundColor: "#f0f0f0",
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
});