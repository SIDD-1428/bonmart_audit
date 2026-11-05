import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebase/config";

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
  warning: "#FF9500",
  danger: "#FF3B30",
};

export default function OrderDetails() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
  if (!id) return;

  const unsubscribe = db
  .collection("orders")
  .doc(id as string)
  .onSnapshot(
    (snap) => {
      if (snap.exists()) {
        setOrder({
          id: snap.id,
          ...snap.data(),
        });
      }

      setLoading(false);
    },
    (error)=>{
            console.log("X Products listener",error.message);
            setLoading(false);
      }
  );

  return unsubscribe;
}, [id]);

  const cancelOrder = async () => {
    if (cancelling) return;
    
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            try{
              if(order.status==="Cancelled"){
                Alert.alert("Already Cancelled");
                return;
              }

              const orderRef=db.collection("orders").doc(id as string);

              await orderRef.update({
                status:"Cancelled",
              });

              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );

              Alert.alert("Success","Your order has been successfully cancelled.");
            }catch (error: any) {
              console.log("Error code:",error.code);
              console.log("Error message:",error.message);
              console.log("Full Error: ",error);

              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );

            } finally {
              setCancelling(false);
            }
                      },
                    },
                  ]
                );
              };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return Colors.success;
      case "cancelled":
        return Colors.danger;
      case "pending":
        return Colors.warning;
      case "accepted":
        return "#5856D6";
      default:
        return Colors.warning;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "checkmark-circle";
      case "cancelled":
        return "close-circle";
      case "pending":
        return "time";
      case "accepted":
        return "checkmark-circle";
      default:
        return "ellipse";
    }
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt?.toDate) return "Just now";
    const date = createdAt.toDate();
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons name="receipt-outline" size={48} color={Colors.muted} />
        </View>
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.muted} />
        </View>
        <Text style={styles.loadingText}>Order not found</Text>
      </View>
    );
  }

  const isCancellable = order.status === "Pending" && !order.stockRestored;
  const statusColor = getStatusColor(order.status);

  return (
    <View style={styles.container}>
      {/* ── Sticky Header ── */}
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusColor + "10" }]}>
        <View style={[styles.statusIcon, { backgroundColor: statusColor + "20" }]}>
          <Ionicons name={getStatusIcon(order.status) as any} size={24} color={statusColor} />
        </View>
        <View>
          <Text style={styles.statusLabel}>Order Status</Text>
          <Text style={[styles.statusValue, { color: statusColor }]}>
            {order.status}
          </Text>
        </View>
      </View>

      {/*pin*/}
      {order.status === "Out For Delivery" && (
        <View style={styles.pinCard}>
          <View style={styles.pinHeader}>
            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.success}/>
            <Text style={styles.pinTitle}>
              Delivery PIN
            </Text>
          </View>

          <Text style={styles.pinValue}>
            {order.delivery?.pin}
          </Text>

          <Text style={styles.pinDescription}>
            Share this PIN only after you receive your order.
          </Text>
        </View>
      )}

        {/* Order Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Order Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Invoice</Text>
            <Text style={styles.infoValue}>
              {order.invoice?.number??`PSINV-${order.id.slice(0,8).toUpperCase()}`}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Placed On</Text>
            <Text style={styles.infoValue}>{formatDate(order.invoice?.issuedAt??order.createdAt)}</Text>
          </View>
        </View>

        {/* Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bag-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Order Items</Text>
            <Text style={styles.itemCount}>{order.items?.length || 0} items</Text>
          </View>

          {order.items?.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.unitPrice ?? item.price} × {item.quantity}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{item.totalPrice??item.price * item.quantity}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subtotal</Text>
            <Text style={styles.infoValue}>
              ₹{order.pricing?.subtotal ?? order.total}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Delivery Fee</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    (order.pricing?.deliveryCharge ?? 0) === 0
                      ? Colors.success
                      : Colors.textPrimary,
                },
              ]}
            >
              {(order.pricing?.deliveryCharge ?? 0) === 0
                ? "FREE"
                : `₹${order.pricing?.deliveryCharge}`}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>
              ₹{order.pricing?.grandTotal ?? order.total}
            </Text>
          </View>
        </View>

        {/* Delivery Address Card */}
        {order.address && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Delivery Address</Text>
            </View>
            <View style={styles.addressTypeBadge}>
              <Text style={styles.addressTypeText}>{order.address.type || "Home"}</Text>
            </View>
            <Text style={styles.addressText}>{order.address.address}</Text>
            {order.address.landmark && (
              <Text style={styles.addressLandmark}>📍 Near {order.address.landmark}</Text>
            )}
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={14} color={Colors.muted} />
              <Text style={styles.phoneText}>{order.address.phone}</Text>
            </View>
          </View>
        )}

        {/* Payment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Payment</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Method</Text>
            <Text style={styles.infoValue}>
              {order.payment?.method ?? "Cash on Delivery"}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>
              {order.payment?.status ?? "Pending"}
            </Text>
          </View>
        </View>

        {/* Cancel Button */}
        {isCancellable && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
            onPress={cancelOrder}
            disabled={cancelling}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.danger, "#E53935"]}
              style={styles.cancelGradient}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.cancelText}>Cancel Order</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Help Section */}
        <View style={styles.helpCard}>
          <View style={styles.helpHeader}>
            <Ionicons name="help-circle-outline" size={20} color={Colors.muted} />
            <Text style={styles.helpTitle}>Need Help?</Text>
          </View>
          <TouchableOpacity onPress={() => router.replace("/profile")}>                                                                                                                                           
          <Text style={styles.helpText}>
            Contact our store owner for any queries related to your order
          </Text>
          
             <Text style={styles.contactText}>
            Click here to reach out to the support team
          </Text>
          </TouchableOpacity>
         
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Sticky Header ──
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },

  // ── ScrollView ──
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    paddingTop: 10,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.muted,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

   // Status Banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    gap: 16,
  },
  statusIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "700",
  },

  // Cards
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.separator,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.muted,
  },

  // Info Rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textPrimary,
  },

  // Items
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    color: Colors.muted,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
  },

  // Address
  addressTypeBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  addressTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },
  addressText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  addressLandmark: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 6,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Cancel Button
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelBtnDisabled: {
    opacity: 0.6,
  },
  cancelGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Help Section
  helpCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  helpText: {
    fontSize: 10.9,
    color: Colors.muted,
    textAlign: "center",
  },
  contactText: {
    fontSize: 12,
    textAlign: "center",
    color: "#242525",

  },
  pinCard:{
    backgroundColor:"#ECFDF3",
    marginHorizontal:16,
    marginBottom:16,
    padding:20,
    borderRadius:20,
    borderWidth:1,
    borderColor: "#C8F2D5",
    alignItems:"center",
  },

  pinHeader:{
    flexDirection:"row",
    alignItems:"center",
    marginBottom:12,
    gap:8,
  },

  pinTitle:{
    fontSize:17,
    fontWeight:"700",
    color: Colors.success,
  },

  pinValue:{
    fontSize:42,
    fontWeight:"800",
    letterSpacing:10,
    color:Colors.textPrimary,
  },

  pinDescription:{
    marginTop:12,
    fontSize:13,
    color:Colors.textSecondary,
    textAlign:"center",
    lineHeight:20,
  },
});