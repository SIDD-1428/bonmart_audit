import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";

const Colors={
    card:"#FFFFFF",
    textPrimary:"#000000",
    textSecondary:"#666666",
    separator:"#E8E8E8",
};

type CategoryCardProps={
    title:string;
    subtitle?:string;
    image:string;
    onPress:()=>void;
};

const {width: SCREEN_WIDTH}=Dimensions.get("window");

const CARD_WIDTH=(SCREEN_WIDTH-54)/2;

export default function CategoryCard({
    title,
    subtitle,
    image,
    onPress,
}: CategoryCardProps){
    const handlePress=async()=>{
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };


    return(
        <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={handlePress}
        >
       <View style={styles.imageContainer}>
        {image ? (
            <Image
            source={{ uri: image }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            />
        ) : (
            <Ionicons
            name="image-outline"
            size={30}
            color="#999"
            />
        )}
        </View>

        <View style={styles.textSection}>
        <Text style={styles.title} numberOfLines={2}>
         {title}
        </Text>

        {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
        </Text>
        )}
        </View>

        <View style={styles.arrowContainer}>
            <Ionicons
            name="arrow-forward"
            size={18}
            color={Colors.textSecondary}
            />
        </View>
    </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  card: {
  width: CARD_WIDTH,
  height: 225,
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: "#F0F0F0",
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: .06,
  shadowRadius: 8,
  elevation: 3,
  marginBottom: 18,
},
  textSection: {
    flex:1,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing:-0.5,
    color: "#1C1C1E",
  },

  subtitle: {
    marginTop:6,
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 20,
  },
  content:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
  },

  arrowContainer:{
    alignItems:"flex-end",
  },

  leftSection:{
    flexDirection:"row",
    alignItems:"center",
    flex:1,
  },
  imageContainer: {
    width: "100%",
    height: 125,
    borderRadius: 13,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    overflow:"hidden",
},

image: {
    width: "100%",
    height: "100%",
},
});