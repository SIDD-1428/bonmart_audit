import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import {
    useNotification,
} from "@/context/NotificationContext";

export default function NotificationBanner() {
  const {
    notification,
    hideNotification,
  } = useNotification();

  const translateY = useSharedValue(-180);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!notification) return;

    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    translateY.value = withSpring(0, {
      damping: 16,
      stiffness: 170,
    });

    opacity.value = withTiming(1);

    const timer = setTimeout(() => {
      opacity.value = withTiming(0);
      translateY.value = withTiming(-180);

      setTimeout(() => {
        hideNotification();
      }, 250);

    }, 4000);

    return () => clearTimeout(timer);

  }, [notification]);

  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: translateY.value,
      },
    ],
    opacity: opacity.value,
  }));

  if (!notification) return null;

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[styles.container, style]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {

          hideNotification();

          if (notification.orderId) {
            router.push({
              pathname: "/order-details",
              params: {
                id: notification.orderId,
              },
            });
          }

        }}
      >
        <BlurView
          intensity={90}
          tint="light"
          style={styles.card}
        >

          <View style={styles.icon}>
            <Ionicons
              name="notifications"
              color="#FFF"
              size={18}
            />
          </View>

          <View style={{ flex: 1 }}>

            <Text style={styles.title}>
              {notification.title}
            </Text>

            <Text
              style={styles.body}
              numberOfLines={2}
            >
              {notification.body}
            </Text>

            <Text style={styles.time}>
              Just now
            </Text>

          </View>

        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({

  container: {
    position: "absolute",
    top: 55,
    left: 15,
    right: 15,
    zIndex: 9999,
  },

  card: {

    flexDirection: "row",

    alignItems: "center",

    padding: 16,

    borderRadius: 22,

    overflow: "hidden",

    shadowColor: "#000",

    shadowOpacity: 0.15,

    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 12,
  },

  icon: {

    width: 46,

    height: 46,

    borderRadius: 23,

    backgroundColor: "#000",

    justifyContent: "center",

    alignItems: "center",

    marginRight: 14,
  },

  title: {

    fontSize: 15,

    fontWeight: "700",

    color: "#000",
  },

  body: {

    fontSize: 13,

    color: "#555",

    marginTop: 3,
  },

  time: {

    marginTop: 8,

    fontSize: 11,

    color: "#999",
  },

});