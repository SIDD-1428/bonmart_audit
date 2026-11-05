import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/config";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OTP() {
  const { confirmation } = useAuthContext();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (
      e.nativeEvent.key === "Backspace" &&
      code[index] === "" &&
      index > 0
    ) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOTP=async()=>{
    const otp=code.join("");

    if(otp.length!==6){
      Alert.alert("Invalid OTP");
      return;
    }

    if(!confirmation){
      Alert.alert("Session Expired","Please request a new otp");
      router.replace("/(auth)/login");
      return;
    }

    setLoading(true);

    try{
      await confirmation.confirm(otp);
      const user=auth().currentUser;
      if(!user){
        throw new Error("User not found");
      }

      const userRef=db.collection("users").doc(user.uid);
      console.log("User UID:",user.uid);
    
      const userDoc=await userRef.get();
      console.log("User exists:",userDoc.exists());

      //creating user document for first time users
      if(!userDoc.exists()){
      console.log("Creating new user document");
        await userRef.set({
          uid:user.uid,
          phone:user.phoneNumber??"",
          email:"",
          firstName:"",
          lastName:"",
          fullName:"",
          profileCompleted:false,
          createdAt:firestore.FieldValue.serverTimestamp(),
          updatedAt:firestore.FieldValue.serverTimestamp(),
        });
      }else{
        //existing user
        await userRef.update({
          updatedAt:firestore.FieldValue.serverTimestamp(),
        });
      }

      //fetching latest user data
      const updatedUserDoc=await userRef.get();
      const userData=updatedUserDoc.data();

      //incomplete profile
      if(!userData?.profileCompleted){
        router.replace("/personal-info");
        return;
      }

      //check if user has atleast one address
      const addressSnapshot=await db
      .collection("addresses")
      .where("userId","==",user.uid)
      .limit(1)
      .get();

      if(addressSnapshot.empty){
        router.replace("/add-address");
      }else{
        router.replace("/(tabs)/home");
      }
    }catch(e:any){
      console.log("OTP Verify Error:",e);
      Alert.alert("Error",e.message??"Something went wrong.");
    }finally{
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>

      <View style={styles.icon}>
        <Ionicons
          name="shield-checkmark-outline"
          size={60}
          color="#000"
        />
      </View>

      <Text style={styles.title}>Verify OTP</Text>

      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to{"\n"}
        +91 {phone}
      </Text>

      <View style={styles.row}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) inputs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            style={styles.box}
            textAlign="center"
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={verifyOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            Verify
          </Text>
        )}
      </TouchableOpacity>

      {timer > 0 ? (
        <Text style={styles.timer}>
          Resend OTP in {timer}s
        </Text>
      ) : (
        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Text style={styles.resend}>
            Resend OTP
          </Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    padding: 24,
  },

  icon: {
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    fontSize: 15,
    marginBottom: 40,
    lineHeight: 22,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },

  box: {
    width: 50,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDD",
    fontSize: 24,
    fontWeight: "700",
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
    fontWeight: "700",
    fontSize: 16,
  },

  timer: {
    marginTop: 24,
    textAlign: "center",
    color: "#666",
  },

  resend: {
    marginTop: 24,
    textAlign: "center",
    fontWeight: "700",
    color: "#000",
  },
});