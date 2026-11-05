import { useCart } from "@/context/CartContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  textPrimary: "#000000",
  textSecondary: "#666666",
  muted: "#999999",
  separator: "#E8E8E8",
  primary: "#000000",
  primaryLight: "#00000010",
  accent: "#333333",
  success: "#34C759",
  danger: "#FF3B30",
  warning: "#FF9500",
};

export default function FloatingCart() {
  const { cart } = useCart();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (cart.length > 0) {
      // Pop-up animation when cart appears
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 300,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide animation when cart is empty
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 30,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [cart.length]);

  if (cart.length === 0) return null;

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Pop animation on press
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        damping: 15,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push("/cart");
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[
          styles.wrapper,
          {
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.container}
          onPress={handlePress}
        >
          <View style={styles.left}>
            <View style={styles.iconContainer}>
              <Ionicons name="bag-outline" size={18} color="#000" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{itemCount}</Text>
              </View>
            </View>
            <Text style={styles.total}>₹{total.toLocaleString()}</Text>
          </View>

          <View style={styles.right}>
            <Text style={styles.viewCart}>View Cart</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color="#000"
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 30,
  },

  wrapper: {
    alignItems: "center",
    paddingHorizontal: 16,
  },

  container: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    borderWidth: 0.5,
    borderColor: Colors.separator,

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,

    width: "70%",
    maxWidth: 400,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconContainer: {
    position: "relative",
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },

  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },

  total: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  viewCart: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
});