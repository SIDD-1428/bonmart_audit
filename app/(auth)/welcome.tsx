import { router } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import PrimaryButton from "../../components/PrimaryButton";

export default function Welcome(){
  return(
    <View style={styles.container}>

      {/* Title */}
      <Text style={styles.title}>Welcome</Text>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Image source={{uri: "https://placehold.co/47x47"}}
        style={styles.avatar}
        />
        <Text style={styles.name}>Siddharth Sunil</Text>
      </View>

      {/* Continue Button*/}
      <PrimaryButton title="Get Started" onPress={()=> router.replace("/(tabs)/home")}/>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 54,
    fontWeight: "600",
    marginTop: 100,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D9D9D9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 21,
    gap: 10,
  },

  avatar: {
    width: 47,
    height: 47,
    borderRadius: 100,
  },

  name: {
    fontSize: 19,
  },

});