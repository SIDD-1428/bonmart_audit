import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useCart } from "../context/CartContext";

type Props = {
  id: string;
  name: string;
  stock?: number;
  price: number;
  image: string;
  protext?: string;
  rating: number;
  unit: string;
  width?: number;
  maxOrderQty?: number;
};

export default function ProductCard({
  id,
  name,
  price,
  stock = 0,
  image,
  protext = "",
  rating,
  unit,
  width = 120,
  maxOrderQty,
}: Props) {
  const { addToCart, cart, increaseQty, decreaseQty } = useCart();

  const itemInCart = cart.find((item) => item.id == id);
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && stock <= 5;

  const scale = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const isUpdatingRef=useRef(false);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.955, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  const animateBtn = () =>
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.2, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

  const handleCardPress = () => {
    if (isOutOfStock) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/product/[id]", params: { id } });
  };

  const handleAddToCart = (e: any) => {
  e.stopPropagation();
  
  if (isUpdatingRef.current) return;
  isUpdatingRef.current = true;

  if (isOutOfStock) {
    isUpdatingRef.current = false;
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  animateBtn();

  console.log("Adding to cart",{
    id,name,stock,maxOrderQty,stockType:typeof stock,maxOrderQtyType:typeof maxOrderQty,
  });
  
  addToCart({
    id,
    name,
    price,
    image,
    quantity: 1,
    stock,
    maxOrderQty,
    unit,
  });
  requestAnimationFrame(() => {
    isUpdatingRef.current = false;
  });
};

  const handleIncrease = (e: any) => {
  e.stopPropagation();

  if (isUpdatingRef.current) return;

  isUpdatingRef.current = true;

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  increaseQty(id);

  requestAnimationFrame(() => {
    isUpdatingRef.current = false;
  });
};

 const handleDecrease = (e: any) => {
  e.stopPropagation();

  if (isUpdatingRef.current) return;
  isUpdatingRef.current = true;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  decreaseQty(id);

  requestAnimationFrame(() => {
    isUpdatingRef.current = false;
  });
};

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handleCardPress}
    >
      <Animated.View
        style={[
          styles.card,
          { width },
          isOutOfStock && styles.outOfStockCard,
          { transform: [{ scale }] },
        ]}
      >
        {/* Stock Badge */}
        {isOutOfStock && (
          <View style={[styles.stockBadge, styles.outOfStockBadge]}>
            <Text style={styles.stockBadgeText}>Out of Stock</Text>
          </View>
        )}
        {isLowStock && (
          <View style={[styles.stockBadge, styles.lowStockBadge]}>
            <Text style={styles.stockBadgeText}>Only {stock} left</Text>
          </View>
        )}

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: image }}
            style={[styles.image, isOutOfStock && { opacity: 0.5 }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
          {rating > 0 && !isOutOfStock && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={8} color="#FF9500" />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
          <Text style={styles.unit}>{unit}</Text>

          <View style={styles.bottomRow}>
            <Text style={[styles.price, isOutOfStock && { color: "#ABABAB" }]}>
              ₹{price}
            </Text>

            {isOutOfStock ? (
              <View style={styles.unavailableBtn}>
                <Text style={styles.unavailableText}>N/A</Text>
              </View>

            ) : !itemInCart ? (
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddToCart}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={12} color="#fff" />
                  <Text style={styles.addText}>Add</Text>
                </TouchableOpacity>
              </Animated.View>

            ) : (
              <View style={styles.qtyBox}>
                <TouchableOpacity
                disabled={false}
                  style={styles.qtyBtn}
                  onPress={handleDecrease}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Ionicons name="remove" size={10} color="#007AFF" />
                </TouchableOpacity>


                <Text style={styles.qtyText}>{itemInCart.quantity}</Text>
                <TouchableOpacity
                  disabled={false}
                  style={[styles.qtyBtn, styles.qtyBtnAdd]}
                  onPress={handleIncrease}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Ionicons name="add" size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  outOfStockCard: { opacity: 0.7 },

  stockBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    zIndex: 10,
  },
  outOfStockBadge: { backgroundColor: "#FF3B30" },
  lowStockBadge: { backgroundColor: "#FF9500" },
  stockBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.1,
  },

  imageContainer: {
    position: "relative",
    backgroundColor: "#F7F7F9",
  },
  image: {
    width: "100%",
    height: 88,
  },

  ratingBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 20,
    gap: 2,
  },
  ratingText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },

  infoContainer: {
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
  },

  name: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1C1C1E",
    lineHeight: 16,
    minHeight: 32,
    letterSpacing: -0.1,
  },

  unit: {
    fontSize: 10,
    color: "#ABABAB",
    fontWeight: "500",
    marginTop: 1,
    marginBottom: 6,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.2,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 2,
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },

  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF4FF",
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 2,
    gap: 1,
  },
  qtyBtn: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnAdd: {
    backgroundColor: "#007AFF",
  },
  qtyText: {
    color: "#007AFF",
    fontSize: 11,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center",
  },

  unavailableBtn: {
    backgroundColor: "#F5F5F7",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  unavailableText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ABABAB",
  },
});
