import { showNotification } from "@/context/NotificationContext";
import { db } from "@/firebase/config";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import messaging from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";

export type NotificationPermissionResult = "granted" | "denied" | "blocked";

const POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";

function isAuthorized(status: number) {
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function hasNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
      return await PermissionsAndroid.check(POST_NOTIFICATIONS);
    }

    const status = await messaging().hasPermission();
    return isAuthorized(status);
  } catch (error) {
    console.log("Unable to check notification permission:", error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
  try {
    if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(POST_NOTIFICATIONS, {
        title: "Allow BonMart notifications",
        message:
          "BonMart uses notifications to keep you updated about order confirmation, packing and delivery.",
        buttonPositive: "Allow",
        buttonNegative: "Not now",
      });

      if (result === PermissionsAndroid.RESULTS.GRANTED) return "granted";
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return "blocked";
      return "denied";
    }

    const status = await messaging().requestPermission();
    if (isAuthorized(status)) return "granted";

    // iOS does not provide another system prompt after permission is denied.
    if (Platform.OS === "ios" && status === messaging.AuthorizationStatus.DENIED) {
      return "blocked";
    }

    return "denied";
  } catch (error) {
    console.log("Notification permission request failed:", error);
    return "denied";
  }
}

let initializedUid: string | null = null;
let activeUnsubscribers: Array<() => void> = [];

function stopNotificationListeners() {
  activeUnsubscribers.forEach((unsubscribe) => unsubscribe());
  activeUnsubscribers = [];
  initializedUid = null;
}

async function saveFcmToken(uid: string, token: string) {
  await db.collection("users").doc(uid).set(
    {
      fcmToken: token,
      notificationEnabled: true,
      tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function initializeNotifications(): Promise<(() => void) | null> {
  const user = auth().currentUser;
  if (!user) return null;

  if (initializedUid === user.uid) {
    return stopNotificationListeners;
  }

  stopNotificationListeners();
  initializedUid = user.uid;

  try {
    const token = await messaging().getToken();
    await saveFcmToken(user.uid, token);
    console.log("BonMart FCM token registered.");

    activeUnsubscribers.push(
      messaging().onTokenRefresh(async (newToken) => {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        try {
          await saveFcmToken(currentUser.uid, newToken);
          console.log("BonMart FCM token refreshed.");
        } catch (error) {
          console.log("Unable to save refreshed FCM token:", error);
        }
      })
    );

    activeUnsubscribers.push(
      messaging().onMessage(async (remoteMessage) => {
        showNotification({
          title: remoteMessage.notification?.title ?? "BonMart update",
          body: remoteMessage.notification?.body ?? "",
          orderId: String(remoteMessage.data?.orderId ?? ""),
        });
      })
    );

    activeUnsubscribers.push(
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log("Opened from notification:", remoteMessage);
      })
    );

    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      console.log("App opened from a notification:", initialNotification);
    }

    return stopNotificationListeners;
  } catch (error) {
    console.log("Notification initialization failed:", error);
    stopNotificationListeners();
    return null;
  }
}
