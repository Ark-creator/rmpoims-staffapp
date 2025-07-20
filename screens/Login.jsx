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

      if (response.data.two_factor_user_id) {
        await AsyncStorage.setItem(
          "two_factor_user_id",
          response.data.two_factor_user_id.toString()
        );
        navigation.navigate("TwoFactor");
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          Alert.alert("Login Failed", data.message || "Invalid email or password.");
        } else if (status === 422) {
          const firstError = Object.values(data.errors)[0][0];
          Alert.alert("Invalid Input", firstError || "Please check the information you provided.");
        } else {
          Alert.alert("Error", "An unexpected server error occurred. Please try again later.");
        }
      } else if (error.request) {
        Alert.alert("Network Error", "Cannot connect to the server. Please check your internet connection.");
      } else {
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
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

        {/* 👇 FOOTER SECTION ADDED HERE 👇 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Developed by the{' '}
            <Text style={{ fontWeight: 'bold' }}>RMPOIMS</Text>
            {' '}Research & Production Team.
          </Text>
        </View>
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
  // 👇 FOOTER STYLES ADDED HERE 👇
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});