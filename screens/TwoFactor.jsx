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
  Modal, // Import Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import CustomButton from "../components/CustomButton";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; // Import icon library

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
  overlay: 'rgba(0, 0, 0, 0.5)', // Color for modal background
};

export default function TwoFactor({ navigation }) {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  
  // State for our new custom modal
  const [isModalVisible, setModalVisible] = useState(false);

  // State to hold masked contact info (ideally passed from the login screen)
  const [maskedEmail, setMaskedEmail] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  const inputs = useRef([]);

  // Effect to get user details for the modal
  useEffect(() => {
    // In a real app, you should get this data securely after login.
    // For this example, we'll create dummy masked data.
    const getContactInfo = async () => {
        // --- Dummy Data ---
        // This is for demonstration. In your actual app, get the real email/phone
        // from the login response and mask it. For example:
        // const { email, phone } = route.params; 
        // setMaskedEmail(maskEmail(email)); 
        const email = "s***f@gmail.com"; // Replace with real masked data
        const phone = "+639*******123";  // Replace with real masked data
        // --- End Dummy Data ---

        setMaskedEmail(email);
        setMaskedPhone(phone);
    };
    getContactInfo();
  }, []);


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

  const handleResendOtp = () => {
    setModalVisible(true);
  };

  const resendCode = async (method) => {
    setModalVisible(false); // Close the modal immediately
    setResendLoading(true);
    try {
      const storedId = await AsyncStorage.getItem("two_factor_user_id");
      if (!storedId) throw new Error("Missing user ID.");

      const endpoint = method === 'sms' 
        ? 'mobile/staff/send-2fa-sms' 
        : 'mobile/staff/resend-2fa-email';

      const response = await api.post(endpoint, {
        user_id: parseInt(storedId, 10),
      });

      Alert.alert("Success", response.data.message);
      setCountdown(30); // Reset countdown
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not request a new code.");
    } finally {
      setResendLoading(false);
    }
  };
  
  const isButtonDisabled = loading || otp.join("").length !== 6;

  return (
    <View style={{flex: 1}}>
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
              {resendLoading ? "Sending..." : (countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code")}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Developed by the{' '}
              <Text style={{ fontWeight: 'bold' }}>RMPOIMS</Text>
              {' '}Research & Production Team.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resend Verification Code</Text>
            <Text style={styles.modalSubtitle}>Choose how you'd like to receive the code.</Text>

            {/* Option 1: SMS */}
            <TouchableOpacity style={styles.modalOption} onPress={() => resendCode('sms')}>
              <MaterialCommunityIcons name="message-text-outline" size={26} color={COLORS.primary} />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionTitle}>Send via SMS</Text>
                <Text style={styles.modalOptionSubtitle}>{maskedPhone}</Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Email */}
            <TouchableOpacity style={styles.modalOption} onPress={() => resendCode('email')}>
              <MaterialCommunityIcons name="email-outline" size={26} color={COLORS.primary} />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionTitle}>Send via Email</Text>
                <Text style={styles.modalOptionSubtitle}>{maskedEmail}</Text>
              </View>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.lightGray,
    paddingVertical: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40, // Extra padding for home indicator on iOS
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 25,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    marginBottom: 15,
  },
  modalOptionTextContainer: {
    marginLeft: 15,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalOptionSubtitle: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  cancelButton: {
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.danger,
  },
});