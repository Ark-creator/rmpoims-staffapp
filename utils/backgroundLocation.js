import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api"; // Your axios instance

const LOCATION_TASK_NAME = "background-location-task";

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("❌ Background location error:", error);
    return;
  }

  if (data) {
    const { locations } = data;
    const latestLocation = locations[0];

    if (latestLocation) {
      try {
        await api.post("mobile/staff/location-update", {
          latitude: latestLocation.coords.latitude,
          longitude: latestLocation.coords.longitude,
        });

        console.log("✅ Location sent:", latestLocation.coords);
      } catch (err) {
        console.error("❌ Failed to send location:", err.message);
      }
    }
  }
});

// Function to start tracking
export const startLocationTracking = async () => {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

  if (fgStatus !== "granted" || bgStatus !== "granted") {
    console.warn("⚠️ Location permission not granted.");
    return;
  }

  const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

  if (!isTracking) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 300000, // every 5 mins
      distanceInterval: 50,  // or every 50 meters
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Location Tracking Active",
        notificationBody: "Tracking your location in the background.",
      },
    });

    console.log("📍 Background location tracking started.");
  }
};
