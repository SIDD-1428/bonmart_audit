import CategoryCard from "@/components/CategoryCard";
import FloatingCart from "@/components/FloatingCart";
import { calculateDistance } from "@/utils/calculateDistance";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase/config";
import { getCategories, subscribeToProducts } from "../../services/products";


const { width } = Dimensions.get("window");

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
  warning: "#FF9500",
  danger: "#FF3B30",
};

export default function CustomerHome() {
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [address, setAddress] = useState<any>(null);
  const [greeting, setGreeting] = useState("");
  const [categories,setCategories]=useState<any[]>([]);
  const [deliveryAllowed,setDeliveryAllowed]=useState<boolean|null>(null);
  const [checkingDelivery,setCheckingDelivery]=useState(true);
  

  const user = auth().currentUser;
  console.log("Current UID:", user?.uid);
  console.log("Current phone:", user?.phoneNumber);

  useEffect(() => {
    const hour = new Date().getHours();
    const name = auth().currentUser?.displayName?.split(" ")[0] || "there";
    if (hour < 12) setGreeting(`Good morning, ${name}`);
    else if (hour < 17) setGreeting(`Good afternoon, ${name}`);
    else setGreeting(`Good evening, ${name}`);
  }, []);

  // Subscribe to the shared live catalogue. This reuses the CartProvider's
  // Firestore listener instead of opening a second collection listener.
  useFocusEffect(
    useCallback(() => subscribeToProducts(
      setProducts,
      (error) => console.log("Products listener error:", error.message)
    ), [])
  );

  // Rebuild visible sections locally when products or categories change.
  useEffect(() => {
    const formattedSections = categories
      .filter((cat: any) => cat.isVisible !== false)
      .map((cat: any) => ({
        title: cat.name,
        subtitle: cat.subtitle ?? "",
        image: cat.image ?? "",
        data: products.filter((product: any) => product.category === cat.name),
      }))
      .filter((section) => section.data.length > 0);

    setSections(formattedSections);
  }, [categories, products]);


//address listenr
  useEffect(() => {
  const user = auth().currentUser;
  if (!user) return;

  const unsubscribe = db
    .collection("addresses")
    .where("userId", "==", user.uid)
    .where("isDefault", "==", true)
    .onSnapshot(
      (snapshot) => {
        if (!snapshot.empty) {
          setAddress(snapshot.docs[0].data());
        } else {
          setAddress(null);
        }
      },
      (error) => {
        console.log("X Address listener", error.message);
      }
    );

  return unsubscribe;
}, []);

// Categories are relatively static; fetch once and reuse the shared cache.
  useEffect(() => {
    let active = true;

    getCategories()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch((error) => console.log("Categories load error:", error.message));

    return () => {
      active = false;
    };
  }, []);

//delivery snapshot
  useEffect(()=>{
    if(!address?.pincode) {
      setCheckingDelivery(false);
      setDeliveryAllowed(false);
      return;
      
    }
    const unsubscribe = db
    .collection("settings")
    .doc("delivery")
    .onSnapshot(
      (snapshot)=> {
        if(!snapshot.exists) return;

        const data=snapshot.data() as any;
        if (!data) return;
        const insideRadius=calculateDistance(
          data.shopLatitude,
          data.shopLongitude,
          address.latitude,
          address.longitude
        )<= data.radiusKm;

        const insidePincode=data.serviceablePincodes?.includes(
          String(address.pincode)
        )??false;
        
        const allowed=insideRadius && insidePincode;

        const distance=calculateDistance(
          data.shopLatitude,
          data.shopLongitude,
          address.latitude,
          address.longitude
        ); 

        console.log("Distance: ",distance);
        console.log("Radius: ",data.radiusKm);
        console.log("Inside Radius: ",distance<= data.radiusKm);
        console.log("Inside Pincode: ",insidePincode);
        setDeliveryAllowed(allowed);
        setCheckingDelivery(false);
      },(error)=>{
        console.log("X Settings listener: ", error.message);
      }
    );
    return unsubscribe;
  },[address]);

  const handleAddressPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/address");
  };

  const handleSearchPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/search");
  };

  const handleSectionPress = (sectionTitle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/section/[name]",
      params: { name: sectionTitle },
    });
  };

  if(checkingDelivery){
    return(
      <View style={styles.centerContainer}>
        <Text style={styles.statusTitle}>
          Checking delivery availability to your area...
          <Text style={styles.statusSubtitle}>
            Hang on...
          </Text>
        </Text>
      </View>
    );
  }

  //delivery unavailable
  if(!deliveryAllowed){
    return(
      <View style={styles.centerContainer}>
        <Ionicons name="location-outline" size={70} color={Colors.danger}/>
        <Text style={styles.statusTitle}>
          Delivery Unavailable
        </Text>

        <Text style={styles.statusSubtitle}>
          We currently dont delivery to your selected address.
          Please choose another delivery address.
        </Text>

        <TouchableOpacity style={styles.changeAddressButton}
        onPress={()=> router.push("/address")}>
          <Text style={styles.changeAddressText}>
            Change Address
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

 return (
  <View style={styles.container}>
    {/* Header */}
    <LinearGradient
      colors={[Colors.primary, Colors.accent]}
      style={[
        styles.headerGradient,
        {
          paddingTop: insets.top + 16,
        },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.welcomeText}>Welcome to BonMart</Text>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push("/profile")}
        >
          <Ionicons
            name="person-outline"
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Delivery Address */}
      <TouchableOpacity
        style={styles.addressContainer}
        onPress={handleAddressPress}
        activeOpacity={0.8}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color="#FFFFFF"
        />

        <Text
          style={styles.addressText}
          numberOfLines={1}
        >
          {address
            ? `${address.type}: ${address.address}`
            : "Add delivery address"}
        </Text>

        <Ionicons
          name="chevron-down"
          size={16}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </LinearGradient>

    {/* Search Bar */}
    <TouchableOpacity
      style={styles.searchBox}
      onPress={handleSearchPress}
      activeOpacity={0.9}
    >
      <Ionicons
        name="search-outline"
        size={20}
        color={Colors.muted}
      />

      <Text style={styles.searchText}>
        Search for products
      </Text>
    </TouchableOpacity>

    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingBottom: 100 + insets.bottom,
        },
      ]}
    >
      <View style={styles.categoryGrid}>
        {sections.map((section: any) => (
          <CategoryCard
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            image={section.image}
            onPress={() =>
              handleSectionPress(section.title)
            }
          />
        ))}
      </View>
    </ScrollView>

    <FloatingCart />
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.8,
    marginBottom: 2,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    alignSelf: "flex-start",
  },
  addressText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "500",
    maxWidth: width - 120,
  },

  // Search Box
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: -15,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
    color: Colors.muted,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  categoryGrid:{
    flexDirection:"row",
    flexWrap:"wrap",
    justifyContent:"space-between",
    paddingHorizontal:18,
    paddingTop:8,
    paddingBottom:24,
  },

  centerContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 30,
  backgroundColor: Colors.background,
},

statusTitle: {
  fontSize: 24,
  fontWeight: "700",
  color: Colors.textPrimary,
  marginTop: 20,
  textAlign: "center",
},

statusSubtitle: {
  marginTop: 10,
  fontSize: 15,
  color: Colors.textSecondary,
  textAlign: "center",
  lineHeight: 22,
},

changeAddressButton: {
  marginTop: 30,
  backgroundColor: Colors.primary,
  paddingHorizontal: 28,
  paddingVertical: 14,
  borderRadius: 14,
},

changeAddressText: {
  color: "#FFF",
  fontSize: 16,
  fontWeight: "600",
},
});