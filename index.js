import messaging from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import App from "expo-router/entry";

// Background notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("Background Message:", remoteMessage);
});

registerRootComponent(App);