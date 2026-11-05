import { showNotification } from "@/context/NotificationContext";
import { db } from "@/firebase/config";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import messaging from "@react-native-firebase/messaging";

export async function requestNotificationPermission() {
  try {
    const authStatus = await messaging().requestPermission();

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("Notification permission denied");
      return false;
    }

    console.log("Notification permission granted");
    return true;
  } catch (error) {
    console.log("Notification permission error:", error);
    return false;
  }
}

export async function initializeNotifications() {
  try {
    const authStatus = await messaging().hasPermission();

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("Notification permission not granted yet");
      return;
    }

    const token = await messaging().getToken();

    console.log("FCM Token:", token);

    const user = auth().currentUser;

    if (!user) return;

    await db.collection("users").doc(user.uid).update({
      fcmToken: token,
      notificationEnabled: true,
      tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
    });

    messaging().onTokenRefresh(async (newToken) => {
      console.log("FCM Token Refreshed:", newToken);

      const currentUser = auth().currentUser;

      if (!currentUser) return;

      await db.collection("users").doc(currentUser.uid).update({
        fcmToken: newToken,
        tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
      });
    });

    messaging().onMessage(async (remoteMessage) => {
      console.log("Foreground Notification:", remoteMessage);

      showNotification({
        title: remoteMessage.notification?.title ?? "Notification",
        body: remoteMessage.notification?.body ?? "",
        orderId: String(remoteMessage.data?.orderId ?? ""),
      });
    });

    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log("Opened from notification:", remoteMessage);
    });

    const initialNotification =
      await messaging().getInitialNotification();

    if (initialNotification) {
      console.log(
        "Opened app from quit state:",
        initialNotification
      );
    }

  } catch (error) {
    console.log("Notification Init Error:", error);
  }
}