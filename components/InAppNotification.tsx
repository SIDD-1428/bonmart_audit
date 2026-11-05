import { useNotification } from "@/context/NotificationContext";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

export default function InAppNotification() {
  const { notification, hideNotification } = useNotification();

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (notification) {
      translateY.value = withSpring(0);
      opacity.value = withTiming(1);

      const timer = setTimeout(() => {
        translateY.value = withSpring(-120);
        opacity.value = withTiming(0);

        setTimeout(hideNotification, 300);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!notification) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          hideNotification();

          if (notification.orderId) {
            router.push({
              pathname: "/order-details",
              params: { id: notification.orderId },
            });
          }
        }}
      >
        <Text style={styles.title}>{notification.title}</Text>

        <Text style={styles.body}>
          {notification.body}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,

    backgroundColor: "#111",

    borderRadius: 18,

    padding: 16,

    elevation: 12,

    shadowColor: "#000",

    shadowOpacity: 0.25,

    shadowRadius: 12,
  },

  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  body: {
    color: "#ddd",
    marginTop: 4,
    fontSize: 14,
  },
});