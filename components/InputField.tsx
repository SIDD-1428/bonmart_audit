import React, { ReactNode } from "react";
import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from "react-native";

type Props = {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  secure?: boolean;
  style?: StyleProp<ViewStyle>;
} & TextInputProps;

export default function InputField({
  secure,
  leftIcon,
  rightIcon,
  style,
  ...props
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      <TextInput
       {...props}
       secureTextEntry={secure}
       placeholderTextColor="#828282"
       style={styles.input}
      />
      {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    height: 48,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    color: "#000000",
    height: "100%",
  },
  icon: {
    marginHorizontal: 8,
  },
});