import { db } from "@/firebase/config";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PersonalInfo() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  
  const validateEmail = (value: string) => {
    if (value.trim() === "") return true;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleContinue = async () => {
    if (!firstName.trim()) {
      Alert.alert("First Name Required");
      return;
    }

    if (!lastName.trim()) {
      Alert.alert("Last Name Required");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Email Address Required");
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert("Please enter a valid email address.");
      return;
    }

    const user = auth().currentUser;

    if (!user) {
      Alert.alert("User not found");
      return;
    }

    setLoading(true);

    try {
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          profileCompleted: true,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      router.replace({
        pathname:"/add-address",
        params:{
            onboarding:"true",
        },
    });
    } catch (error: any) {
      console.log(error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="person-circle-outline"
          size={90}
          color="#000"
        />
      </View>

      <Text style={styles.title}>
        Complete Your Profile
      </Text>

      <Text style={styles.subtitle}>
        Let's get to know you before you start shopping.
      </Text>

      <Text style={styles.label}>First Name</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter first name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Last Name</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter last name"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
      />

      <Text style={styles.label}>
        Email Address 
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.note}>
        We'll use your email for invoices, order updates
        and important notifications.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: "#000",
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    fontSize: 15,
    marginBottom: 40,
    lineHeight: 22,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111",
  },

  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },

  note: {
    color: "#666",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 36,
  },

  button: {
    backgroundColor: "#000",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});