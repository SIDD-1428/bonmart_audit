import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useEffect,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
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
  danger: "#FF3B30",
  warning: "#FF9500",
};

interface Address {
  id: string;
  type: string;
  address: string;
  landmark: string;
  phone: string;
  isDefault: boolean;
}

export default function AddressScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  //address listener
  useEffect(()=>{
    const unsubscribe = db
  .collection("addresses")
  .where("userId", "==", auth().currentUser?.uid)
  .onSnapshot(
    (snapshot) => {
      const data: Address[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Address, "id">),
      }));

      setAddresses(data);
    },
    (error) => {
      console.log("Address listener:", error);
    }
  );

  return unsubscribe;
  },[]);
  
  const setDefaultAddress = async (addressId: string) => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  try {
    const snapshot = await db
      .collection("addresses")
      .where("userId", "==", auth().currentUser?.uid)
      .get();

    const batch = db.batch();

    snapshot.docs.forEach((address) => {
      batch.update(address.ref, {
        isDefault: false,
      });
    });

    batch.update(
      db.collection("addresses").doc(addressId),
      {
        isDefault: true,
      }
    );

    await batch.commit();

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  } catch (error) {
    console.log(error);
    Alert.alert("Error", "Failed to set default address");
  }
};
  const deleteAddress = async (addressId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
             await db
  .collection("addresses")
  .doc(addressId)
  .delete();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.log(error);
              Alert.alert("Error", "Failed to delete address");
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(()=>{
      setRefreshing(false);
    },500);
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="location-outline" size={64} color={Colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>No Addresses Yet</Text>
      <Text style={styles.emptySubtitle}>Add your first delivery address</Text>
      <TouchableOpacity
        style={styles.emptyAddBtn}
        onPress={() => router.push({
          pathname:"/add-address",
        params:{
          onboarding:"false",
        },
      })
    }
      >
        <LinearGradient
          colors={[Colors.primary, Colors.accent]}
          style={styles.emptyAddGradient}
        >
          <Ionicons name="add-outline" size={18} color="#FFFFFF" />
          <Text style={styles.emptyAddText}>Add Address</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );


  const {onboarding}=useLocalSearchParams<{
    onboarding?:string;
  }>();
  const isOnboarding=onboarding==="true";

  return (
    <View style={styles.container}>
      {/* Header */}
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
          <Text style={styles.title}>Delivery Addresses</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push({pathname:"/add-address",
              params:{
                onboarding:"false",
              },
            })}
          >
            <Ionicons name="add-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.addressTypeContainer}>
                <Ionicons
                  name={item.type === "Home" ? "home-outline" : "business-outline"}
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.addressType}>{item.type}</Text>
              </View>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </View>

            <View style={styles.addressDetail}>
              <Ionicons name="location-outline" size={14} color={Colors.muted} />
              <Text style={styles.address}>{item.address}</Text>
            </View>

            {item.landmark ? (
              <View style={styles.addressDetail}>
                <Ionicons name="flag-outline" size={14} color={Colors.muted} />
                <Text style={styles.landmark}>Near {item.landmark}</Text>
              </View>
            ) : null}

            <View style={styles.addressDetail}>
              <Ionicons name="call-outline" size={14} color={Colors.muted} />
              <Text style={styles.phone}>{item.phone}</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.setDefaultBtn]}
                disabled={item.isDefault}
                onPress={() => setDefaultAddress(item.id)}
              >
                <Text style={[styles.actionBtnText, item.isDefault && styles.actionBtnTextDisabled]}>
                  {item.isDefault ? "Default" : "Set Default"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() =>
                  router.push({
                    pathname: "/edit-address",
                    params: { id: item.id },
                  })
                }
              >
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => deleteAddress(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addressTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressType: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.success + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.success,
  },
  addressDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  address: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  landmark: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  phone: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  setDefaultBtn: {
    backgroundColor: Colors.surface,
  },
  editBtn: {
    backgroundColor: Colors.surface,
  },
  deleteBtn: {
    backgroundColor: Colors.danger + "10",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  actionBtnTextDisabled: {
    color: Colors.success,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.danger,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 24,
  },
  emptyAddBtn: {
    borderRadius: 30,
    overflow: "hidden",
  },
  emptyAddGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});