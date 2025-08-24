import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import CustomButton from "../components/CustomButton";

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Checks for an existing lockout when the component loads.
  useEffect(() => {
    const checkLockout = async () => {
      try {
        const lockoutEndTime = await AsyncStorage.getItem("lockoutEndTime");
        if (lockoutEndTime) {
          const remainingSeconds = Math.round(
            (parseInt(lockoutEndTime, 10) - Date.now()) / 1000
          );
          if (remainingSeconds > 0) {
            setLockoutTime(remainingSeconds);
          } else {
            await AsyncStorage.removeItem("lockoutEndTime");
          }
        }
      } catch (e) {
        console.error("Failed to read lockout time from storage", e);
      }
    };
    checkLockout();
  }, []);

  // Manages the countdown timer itself.
  useEffect(() => {
    let timer;
    if (lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            AsyncStorage.removeItem("lockoutEndTime");
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime]);

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

        if (status === 429) {
          const lockoutSeconds = data.lockout_time || 60;
          const endTime = Date.now() + lockoutSeconds * 1000;
          await AsyncStorage.setItem("lockoutEndTime", endTime.toString());
          setLockoutTime(lockoutSeconds);
          Alert.alert(
            "Too Many Attempts",
            `Please try again in ${lockoutSeconds} seconds.`
          );
        } else if (status === 401) {
          Alert.alert(
            "Login Failed",
            data.message || "Invalid email or password."
          );
        } else if (status === 422) {
          const firstError = Object.values(data.errors)[0][0];
          Alert.alert(
            "Invalid Input",
            firstError || "Please check the information you provided."
          );
        } else {
          Alert.alert(
            "Error",
            "An unexpected server error occurred. Please try again later."
          );
        }
      } else if (error.request) {
        Alert.alert(
          "Network Error",
          "Cannot connect to the server. Please check your internet connection."
        );
      } else {
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLockedOut = lockoutTime > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
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
            style={[styles.input, isLockedOut && styles.disabledInput]}
            placeholder="Staff Email"
            placeholderTextColor="gray"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLockedOut}
          />

          <TextInput
            style={[styles.input, isLockedOut && styles.disabledInput]}
            placeholder="Password"
            placeholderTextColor="gray"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLockedOut}
          />

          {/* ========================================================= */}
          {/* >> BAGONG CODE: Hiwalay na Text para sa Lockout Timer << */}
          {/* ========================================================= */}
          {isLockedOut && (
            <Text style={styles.lockoutText}>
              Please try again in {lockoutTime} second(s).
            </Text>
          )}

          {/* ========================================================= */}
          {/* >> IN-UPDATE: Pinasimpleng Button <<                      */}
          {/* ========================================================= */}
          <CustomButton
            title={loading ? "Logging in..." : "Login"}
            onPress={handleLogin}
            backgroundColor={isLockedOut ? "#A9A9A9" : "#007bff"}
            style={{ marginTop: 10, borderRadius: 5, padding: 10 }}
            disabled={loading || isLockedOut}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Developed by the <Text style={{ fontWeight: "bold" }}>RMPOIMS</Text>{" "}
              Research & Production Team.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: "white",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    borderColor: "#ddd",
    color: "#000",
  },
  disabledInput: {
    backgroundColor: "#EAEAEA",
    color: "#999",
  },
  // =========================================================
  // >> BAGONG STYLE para sa Lockout Text <<
  // =========================================================
  lockoutText: {
    color: 'red',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    width: "100%",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
});