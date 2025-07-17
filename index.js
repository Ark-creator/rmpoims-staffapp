import { registerRootComponent } from "expo";
import { AppRegistry, LogBox } from "react-native";
import App from "./App"; // ✅ Make sure App.js is in the root folder

// ✅ Ignore non-critical warnings (optional)
LogBox.ignoreLogs([
  "Warning: ...", // Add any warnings you want to ignore
]);

// ✅ Global error handling for production (optional)
if (!__DEV__) {
  console.error = (error) => {
    // Log errors silently in production
  };
}

// ✅ Register the main component
registerRootComponent(App);
AppRegistry.registerComponent("main", () => App);
