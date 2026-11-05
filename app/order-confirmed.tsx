import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCart } from "../context/CartContext";

// ── Clean Black/White/Grey Color Scheme ──
const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  textPrimary: "#000000",
  textSecondary: "#666666",
  muted: "#999999",
  separator: "#E8E8E8",
  primary: "#000000",
  accent: "#333333",
  success: "#34C759",
};

export default function OrderConfirmed() {
  const { clearCart } = useCart();

  const handleContinueShopping = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearCart();
    router.replace("/(tabs)/home");
  };

  const handleViewOrders = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/orders");
  };

 const { paymentMethod, address, addressType, landmark } =
  useLocalSearchParams<{
    paymentMethod?: string;
    address?: string;
    addressType?: string;
    landmark?: string;
  }>();


  return (
    <View style={styles.container}>
      {/* Success Animation */}
      <View style={styles.successContainer}>
        <View style={styles.checkmarkCircle}>
          <Ionicons name="checkmark" size={64} color="#FFFFFF" />
        </View>
      </View>

      {/* Success Text */}
      <Text style={styles.title}>Order Placed!</Text>
      <Text style={styles.submsg}>please wait as the store will shortly accept the order</Text>

      {/* Order Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Estimated Delivery</Text>
            <Text style={styles.infoValue}>1-2 working days</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
  <Text style={styles.infoLabel}>
    {addressType || "Delivery Address"}
  </Text>

  <Text
    style={styles.infoValue}
    numberOfLines={2}
  >
    {address || "Address unavailable"}
  </Text>

  {!!landmark && (
    <Text
      style={{
        fontSize: 11,
        color: Colors.muted,
        marginTop: 3,
      }}
      numberOfLines={1}
    >
      Near {landmark}
    </Text>
  )}
</View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="card-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}> {paymentMethod ?? "Cash on Delivery"} </Text>
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinueShopping}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            style={styles.continueGradient}
          >
            <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Continue Shopping</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ordersBtn}
          onPress={handleViewOrders}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#FFFFFF", "#F5F5F5"]}
            style={styles.ordersGradient}
          >
            <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
            <Text style={styles.ordersButtonText}>View My Orders</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },

  // Success Animation
  successContainer: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 24,
  },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  // Text
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 6,
  },
  submsg: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.separator,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: 4,
  },

  // Buttons
  buttonContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    gap: 12,
  },
  continueBtn: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  ordersBtn: {
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  ordersGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  ordersButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});