import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import CustomButton from "../components/CustomButton";
import { startLocationTracking } from "../utils/backgroundLocation";

export default function TwoFactor({ navigation }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const storedId = await AsyncStorage.getItem("two_factor_user_id");
      const userId = storedId ? parseInt(storedId, 10) : null;

      if (!userId) {
        throw new Error("Missing user ID. Please log in again.");
      }

      const response = await api.post("mobile/staff/verify-2fa", {
        user_id: userId,
        code: otp,
      });

      const { token, user } = response.data;

      await AsyncStorage.setItem("authToken", token);
      await AsyncStorage.setItem("userId", user.id.toString());
      await AsyncStorage.removeItem("two_factor_user_id"); // Clean up temporary ID

      // Optional: Start location tracking only after successful login
      // await startLocationTracking();

      navigation.replace("MainScreen");
    } catch (error) {
      console.error("2FA Error:", error.response?.data || error.message);
      Alert.alert(
        "Verification Failed",
        error.response?.data?.message || "Invalid OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Image source={require("../assets/images/Logo.png")} style={styles.logo} />
        <Text style={styles.title}>
          Verify Your Account
        </Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to your email.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="6-digit OTP"
          placeholderTextColor="gray"
          onChangeText={setOtp}
          value={otp}
          keyboardType="numeric"
          maxLength={6}
        />

        <CustomButton
          title={loading ? "Verifying..." : "Verify OTP"}
          onPress={handleVerifyOtp}
          backgroundColor="#007bff"
          style={{
            marginTop: 10,
            borderRadius: 5,
            padding: 10,
            alignItems: "center",
          }}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 24,
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