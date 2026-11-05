import { useAuthContext } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";

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
};

export default function Login() {
  const {setConfirmation}=useAuthContext();
  const [phone, setPhone]=useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  
  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withTiming(0, { duration: 600 });
  }, []);

  const openPrivacyPolicy = async () => {
  const url = "https://bonmart-customer-privacy-policy.pages.dev/";

  try {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Unable to open the Privacy Policy.");
    }
  } catch (error) {
    console.log("Error opening Privacy Policy:", error);
    Alert.alert("Error", "Unable to open the Privacy Policy.");
  }
};
  

  const sendOTP=async()=>{
    if (phone.length !== 10) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }
    setIsLoading(true);

    try{
      const confirmation=await auth().signInWithPhoneNumber(`+91${phone}`);
      setConfirmation(confirmation);
      router.push({pathname:"/(auth)/otp",
        params:{
          phone,
        },
      });
    }catch (e: any) {
  console.log("OTP Error:", e);
  Alert.alert(
    "OTP Error",
    e?.message ?? JSON.stringify(e)
  );
}finally{
    setIsLoading(false);
  }};
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.contentContainer}>
        {/* Decorative Elements */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <Animated.View style={[styles.formContainer, animatedStyle]}>
          {/* Brand Header */}
          <Animated.View entering={ZoomIn.delay(100)} style={styles.brandContainer}>
            <View style={styles.brandIcon}>
              <Image
                source={require("../../assets/images/icon.png")}
                style={styles.brandImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>BonMart</Text>
            <Text style={styles.subtitle}>Shop Good, Live Good</Text>
          </Animated.View>

          {/* Welcome Section */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.welcomeSection}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Enter your mobile number to continue</Text>
          </Animated.View>

          {/* Login Form */}
          <Animated.View entering={FadeInUp.delay(200)}>
            <InputField
              placeholder="Phone Number"
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
              keyboardType="phone-pad"
              maxLength={10}
              autoComplete="tel"
              textContentType="telephoneNumber"
              autoCapitalize="none"
              leftIcon={
              <Ionicons
                name="call-outline"
                size={20}
                color={Colors.muted}
              />
              }
            />
          </Animated.View>

         

          {/* Login Button */}
          <Animated.View entering={FadeInUp.delay(300)} style={styles.buttonContainer}>
            <PrimaryButton
              title={isLoading ? "Sending OTP..." : "Continue"}
              onPress={sendOTP}
              disabled={isLoading}
            />
            {isLoading && (
              <ActivityIndicator
                style={styles.loader}
                size="small"
                color={Colors.primary}
              />
            )}
          </Animated.View>


          {/* Terms */}
          <Animated.View entering={FadeInUp.delay(500)}>
            <Text style={styles.terms}>
              By continuing, you agree to our{" "}
              <Text style={styles.link}>Terms of Service</Text> and{" "}
              <Text style={styles.link}
              onPress={openPrivacyPolicy}>
                Privacy Policy
              </Text>
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  // Decorative Elements
  decorCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.03,
  },
  decorCircle2: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.03,
  },

  // Form Container
  formContainer: {
    backgroundColor: Colors.card,
    borderRadius: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.separator,
  },

  // Brand
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 4,
  },

  // Welcome Section
  welcomeSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  // Forgot Password
  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  forgot: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
  },

  // Button Container
  buttonContainer: {
    marginBottom: 16,
  },
  loader: {
    marginTop: 12,
  },

  // Sign Up
  signupContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  signupText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  signupLink: {
    color: Colors.primary,
    fontWeight: "600",
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.separator,
  },
  or: {
    marginHorizontal: 12,
    fontSize: 12,
    color: Colors.muted,
    fontWeight: "500",
  },

  // Social Container
  socialContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
  },

  // Terms
  terms: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.muted,
    lineHeight: 16,
  },
  link: {
    color: Colors.primary,
    fontWeight: "500",
  },
  brandImage: {
    width: 70,
    height: 70,
  },
  brandIcon: {
  width: 64,
  height: 64,
  borderRadius: 92,
  backgroundColor: Colors.primaryLight,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 12,
  overflow: "hidden",
},
});