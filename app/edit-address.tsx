'use client';
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, } from "react-native-maps";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
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
};

const InputField = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  required = false,
}: any) => (
  <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.inputWrapper}>
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color={Colors.muted} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
      {required && !value && (
        <View style={styles.requiredBadge}>
          <Text style={styles.requiredText}>Required</Text>
        </View>
      )}
    </View>
  </Animated.View>
);

export default function EditAddressScreen() {
  const { id } = useLocalSearchParams();
  const [type, setType] = useState("Home");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const[pincode,setPincode]=useState("");

  const[region, setRegion]=useState({
    latitude:12.9716,
    longitude:77.5946,
    latitudeDelta:0.005,
    longitudeDelta:0.005,
  });

  const [marker, setMarker]=useState({
    latitude:12.9716,
    longitude:77.5946,
  })

  const addressTypes = ["Home", "Work", "Other"];

  useEffect(() => {
    loadAddress(
    );
  }, []);

  const loadAddress = async () => {
    try {
     const snap = await db
      .collection("addresses")
      .doc(id as string)
      .get();

        if (snap.exists()) {
        const data = snap.data();
        if (!data) return;
        setType(data.type || "Home");
        setAddress(data.address || "");
        setLandmark(data.landmark || "");
        setPhone(data.phone || "");
        setPincode(data.pincode||"");

        if(data.latitude&&data.longitude){
          setMarker({
            latitude:data.latitude,
            longitude:data.longitude,
          });

          setRegion({
            latitude:data.latitude,
            longitude:data.longitude,
            latitudeDelta:0.005,
            longitudeDelta:0.005,
          });
        }
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to load address");
    } finally {
      setIsLoading(false);
    }
  };

  const updateAddress = async () => {
    if (!address || !phone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Information", "Please fill address and phone number");
      return;
    }

    setIsSaving(true);
    try {
      await db
  .collection("addresses")
  .doc(id as string)
  .update({
    type,
    address,
    landmark,
    phone,
    latitude: marker.latitude,
    longitude: marker.longitude,
    pincode,
    updatedAt: new Date(),
  });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Address updated successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.log(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to update address");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons name="location-outline" size={48} color={Colors.muted} />
        </View>
        <Text style={styles.loadingText}>Loading address...</Text>
      </View>
    );
  }

  const getCurrentLocation = async () => {
      try{
      const { status } = await Location.requestForegroundPermissionsAsync();
  
      if (status !== "granted") {
        Alert.alert("Permission required");
        return;
      }
  
      const location = await Location.getCurrentPositionAsync({
        accuracy:Location.Accuracy.High,
      });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
  
      setRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
  
      setMarker({
        latitude: lat,
        longitude: lng,
      });
  
      await reverseGeocode(lat, lng);
      }catch(err){
        console.log(err);
        Alert.alert("Location Error","Unable to get your current location");
      }
    };

    
      const reverseGeocode = async (lat: number, lng: number) => {
        const result = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
    
        if (result.length > 0) {
          const place = result[0];
          const fullAddress=[place.name,place.street,place.district,place.city,place.region,place.postalCode].filter(Boolean).join(",");
          setAddress(fullAddress);
          setPincode(place.postalCode??"");
        }
      };


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Edit Address</Text>
            <Text style={styles.headerSubtitle}>Update your address details</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Address Type */}
        <Animated.View entering={FadeInUp.delay(100)}>
          <Text style={styles.sectionTitle}>Address Type</Text>
          <View style={styles.typeContainer}>
            {addressTypes.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View
  style={{
    height: 250,
    borderRadius: 20,
    overflow: "hidden",
  }}
>
  <MapView
    style={{
      flex: 1,
    }}
    region={region}
    onPress={(e) => {

      const coords =
        e.nativeEvent.coordinate;

        setRegion({
          latitude:coords.latitude,
          longitude:coords.longitude,
          latitudeDelta:0.005,
          longitudeDelta:0.005,
        });
      setMarker(coords);

      reverseGeocode(
        coords.latitude,
        coords.longitude
      );
    }}
  >
    <Marker
      coordinate={marker}
      draggable
      onDragEnd={(e) => {

        const coords =
          e.nativeEvent.coordinate;

        setRegion({
          latitude:coords.latitude,
          longitude:coords.longitude,
          latitudeDelta:0.005,
          longitudeDelta:0.005,
        });
        setMarker(coords);

        reverseGeocode(
          coords.latitude,
          coords.longitude
        );
      }}
    />
  </MapView>
</View>

<TouchableOpacity style={styles.currentLocationBtn}
  onPress={getCurrentLocation}>
    <Ionicons name="locate" size={18} color="#FFFFFF"/>
    <Text style={styles.currentLocationText}>
      Use Current Location
    </Text>
  </TouchableOpacity>

  <View style={styles.addressPreview}>
    <Text style={styles.addressPreviewTitle}>
      Selected Address
    </Text>
    <Text style={styles.addressPreviewText}>
      {address||"Tap on the map or use you current location"}
    </Text>
  </View>

        {/* Address Details */}
        <Animated.View entering={FadeInUp.delay(150)}>
          <Text style={styles.sectionTitle}>Address Details</Text>
          <InputField
            icon="location-outline"
            placeholder="Full Address *"
            value={address}
            onChangeText={setAddress}
            required
          />
          <InputField
            icon="flag-outline"
            placeholder="Landmark (Optional)"
            value={landmark}
            onChangeText={setLandmark}
          />
          <InputField
            icon="call-outline"
            placeholder="Phone Number *"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            required
          />
        </Animated.View>

        {/* Update Button */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.saveButtonWrapper}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={updateAddress}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Update Address</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 16,
  },
  typeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  typeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  typeTextActive: {
    color: "#FFFFFF",
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.separator,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  requiredBadge: {
    backgroundColor: Colors.danger + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.danger,
  },
  saveButtonWrapper: {
    marginTop: 32,
  },
  saveButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  currentLocationBtn: {
  backgroundColor: Colors.primary,
  marginTop: 12,
  borderRadius: 14,
  paddingVertical: 14,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
},

currentLocationText: {
  color: "#FFF",
  fontSize: 15,
  fontWeight: "600",
},
addressPreview: {
  marginTop: 12,
  backgroundColor: Colors.surface,
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: Colors.separator,
},

addressPreviewTitle: {
  fontSize: 14,
  fontWeight: "600",
  color: Colors.textPrimary,
  marginBottom: 6,
},

addressPreviewText: {
  fontSize: 13,
  color: Colors.textSecondary,
  lineHeight: 20,
},
});