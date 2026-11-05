import React from "react";
import { Image, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

type Props = {
  title: string;
  icon: any;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function SocialButton({ title, icon, onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <View style={styles.content}>
        <Image source={icon} style={styles.icon} />
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({

  button: {
    height: 40,
    backgroundColor: "#EEEEEE",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    width: 20,
    height: 20,
    marginRight:8,
  },

  text: {
    fontSize: 14,
    fontWeight: "500",
    color: "black",
  },

});