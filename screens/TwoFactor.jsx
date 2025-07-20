import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
  Keyboard,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import CustomButton from "../components/CustomButton";

// Professional Color Palette
const COLORS = {
  primary: '#007bff',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  mediumGray: '#ddd',
  darkGray: '#555',
  footerText: '#888',
  textPrimary: '#002f4b',
  danger: '#dc3545',
  success: '#28a745',
};

export default function TwoFactor({ navigation }) {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  
  const inputs = useRef([]);

  // Countdown timer effect
  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleTextChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }
    
    if (newOtp.every(digit => digit !== '')) {
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = ({ nativeEvent: { key } }, index) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const storedId = await AsyncStorage.getItem("two_factor_user_id");
      if (!storedId) throw new Error("Missing user ID. Please log in again.");

      const response = await api.post("mobile/staff/verify-2fa", {
        user_id: parseInt(storedId, 10),
        code: code,
      });

      await AsyncStorage.setItem("authToken", response.data.token);
      await AsyncStorage.removeItem("two_factor_user_id");

      navigation.replace("MainScreen");
    } catch (error) {
      Alert.alert(
        "Verification Failed",
        error.response?.data?.message || "The code is invalid or has expired."
      );
      setOtp(new Array(6).fill(""));
      inputs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      Alert.alert(
        "Resend Code", 
        "Please return to the login screen and re-enter your credentials to receive a new OTP."
      );
       navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Could not request a new code at this time.");
    } finally {
      setResendLoading(false);
    }
  };
  
  const isButtonDisabled = loading || otp.join("").length !== 6;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Image source={require("../assets/images/Logo.png")} style={styles.logo} />
        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to your email.</Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={styles.otpBox}
              keyboardType="number-pad"
              maxLength={1}
              onChangeText={(text) => handleTextChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              value={digit}
            />
          ))}
        </View>

        <CustomButton
          title={loading ? "Verifying..." : "Verify OTP"}
          onPress={handleVerifyOtp}
          backgroundColor={isButtonDisabled ? '#A5C9FF' : COLORS.primary}
          style={{ marginTop: 20, width: '100%', borderRadius: 8, padding: 12 }}
          disabled={isButtonDisabled}
        />

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendOtp}
          disabled={countdown > 0 || resendLoading}
        >
          <Text style={[styles.resendButtonText, { color: countdown > 0 ? COLORS.darkGray : COLORS.primary }]}>
            {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
          </Text>
        </TouchableOpacity>
        
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
    flexGrow: 1, // Changed to flexGrow to ensure scroll works if content overflows
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.lightGray,
    paddingVertical: 20, // Added padding for better spacing on different screen sizes
  },
  form: {
    padding: 25,
    borderRadius: 12,
    width: "90%",
    alignItems: "center",
    backgroundColor: COLORS.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: {
    width: 120,
    height: 130,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.darkGray,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  otpBox: {
    width: 48,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  resendButton: {
    marginTop: 25,
  },
  resendButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  // 👇 FOOTER STYLES ADDED HERE 👇
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.mediumGray,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.footerText,
    textAlign: 'center',
  },
});