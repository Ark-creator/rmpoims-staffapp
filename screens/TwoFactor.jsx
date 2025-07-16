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
        throw new Error("Missing user ID.");
      }

      const response = await api.post("mobile/staff/verify-2fa", {
        user_id: userId,
        code: otp,
      });

      const { token, user } = response.data;

      await AsyncStorage.setItem("authToken", token);
      await AsyncStorage.setItem("userId", user.id.toString());

      await startLocationTracking();

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
          "Verify your account to access staff dashboard"
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
    backgroundColor: "#F5F5F5",
  },
  form: {
    padding: 5,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    marginTop: "20%",
  },
  logo: {
    width: 200,
    height: 210,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
    color: "#005382",
    textAlign: "center",
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
