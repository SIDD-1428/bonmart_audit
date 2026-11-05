import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@react-native-firebase/auth";
import {
  hasNotificationPermission,
  initializeNotifications,
  requestNotificationPermission,
} from "@/services/notification";

const PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default function NotificationPermissionManager() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openSettingsInstead, setOpenSettingsInstead] = useState(false);
  const [message, setMessage] = useState("");
  const cleanupRef = useRef<(() => void) | null>(null);
  const checkingRef = useRef(false);

  const syncNotificationState = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const user = auth().currentUser;

      if (!user) {
        cleanupRef.current?.();
        cleanupRef.current = null;
        setVisible(false);
        return;
      }

      const granted = await hasNotificationPermission();

      if (granted) {
        setVisible(false);
        setOpenSettingsInstead(false);
        setMessage("");
        await AsyncStorage.removeItem(`bonmart_notification_prompt_${user.uid}`);

        if (!cleanupRef.current) {
          cleanupRef.current = (await initializeNotifications()) ?? null;
        }
        return;
      }

      cleanupRef.current?.();
      cleanupRef.current = null;

      const key = `bonmart_notification_prompt_${user.uid}`;
      const dismissedAt = await AsyncStorage.getItem(key);
      const shouldPrompt =
        !dismissedAt ||
        Date.now() - Number(dismissedAt) >= PROMPT_COOLDOWN_MS;

      if (shouldPrompt) {
        setVisible(true);
      }
    } catch (error) {
      console.log("Notification permission check failed:", error);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void syncNotificationState();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void syncNotificationState();
        }
      }
    );

    const authUnsubscribe = auth().onAuthStateChanged(() => {
      void syncNotificationState();
    });

    return () => {
      appStateSubscription.remove();
      authUnsubscribe();
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [syncNotificationState]);

  const dismissForNow = async () => {
    const user = auth().currentUser;
    if (user) {
      await AsyncStorage.setItem(
        `bonmart_notification_prompt_${user.uid}`,
        String(Date.now())
      );
    }
    setVisible(false);
  };

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      if (openSettingsInstead) {
        const user = auth().currentUser;
        if (user) {
          await AsyncStorage.setItem(
            `bonmart_notification_prompt_${user.uid}`,
            String(Date.now())
          );
        }
        await Linking.openSettings();
        setVisible(false);
        return;
      }

      const result = await requestNotificationPermission();

      if (result === "granted") {
        const user = auth().currentUser;
        if (user) {
          await AsyncStorage.removeItem(
            `bonmart_notification_prompt_${user.uid}`
          );
        }
        setVisible(false);
        setOpenSettingsInstead(false);
        cleanupRef.current?.();
        cleanupRef.current = (await initializeNotifications()) ?? null;
      } else if (result === "blocked") {
        setOpenSettingsInstead(true);
        setMessage(
          "Notifications are blocked by your device. Open Settings and allow notifications for BonMart."
        );
      } else {
        setMessage(
          "Notifications are still turned off. You can try again or enable them in your device settings."
        );
      }
    } catch (error) {
      console.log("Unable to enable notifications:", error);
      setMessage("We couldn't update notification access. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => void dismissForNow()}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>🔔</Text>
          </View>

          <Text style={styles.title}>Stay updated with BonMart</Text>
          <Text style={styles.description}>
            Get updates about order confirmation, packing, delivery and important
            changes to your orders.
          </Text>

          {!!message && <Text style={styles.message}>{message}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={handleEnable}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                {openSettingsInstead ? "Open Settings" : "Enable Notifications"}
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void dismissForNow()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111111",
    textAlign: "center",
  },
  description: {
    color: "#666666",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 18,
  },
  message: {
    color: "#A33A22",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 14,
  },
  primaryButton: {
    width: "100%",
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  secondaryText: {
    color: "#666666",
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
