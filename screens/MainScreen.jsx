import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import CustomButton from "../components/CustomButton";

export default function MainScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get("mobile/staff/user");
        setUser(response.data);
      } catch (error) {
        console.error("Failed to fetch staff user:", error);
        Alert.alert("Error", "Could not fetch staff info.");
      }
    };

    fetchStaff();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("mobile/staff/logout");
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userId");
      navigation.replace("Login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Logout Failed", "Try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        Welcome{user ? `, ${user.staff_username}` : ""}!
      </Text>
      <Text style={styles.subtext}>You are logged in as staff.</Text>

      <CustomButton
        title="Logout"
        onPress={handleLogout}
        backgroundColor="#dc3545"
        style={{ marginTop: 20, borderRadius: 5, padding: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    padding: 20,
  },
  welcome: {
    fontSize: 28,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: "#777",
  },
});
