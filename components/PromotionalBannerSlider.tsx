import React, { useEffect, useRef, useState } from "react";
import { FlatList, Linking, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { db } from "@/firebase/config";

type Banner = { id: string; imageUrl: string; active?: boolean; position?: number; actionType?: string; actionTarget?: string };

export default function PromotionalBannerSlider() {
  const { width } = useWindowDimensions();
  const [enabled, setEnabled] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Banner>>(null);
  const itemWidth = width - 32;

  useEffect(() => db.collection("settings").doc("homeBanners").onSnapshot((snap) => {
    const data = snap.data();
    const next = (Array.isArray(data?.banners) ? data.banners : [])
      .filter((b: Banner) => b.active !== false && typeof b.imageUrl === "string" && b.imageUrl.length > 0)
      .sort((a: Banner, b: Banner) => (a.position ?? 0) - (b.position ?? 0))
      .slice(0, 5);
    setEnabled(data?.enabled === true);
    setBanners(next);
    setIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, (error) => console.log("Banner listener:", error.message)), []);

  useEffect(() => {
    if (!enabled || banners.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % banners.length;
        listRef.current?.scrollToOffset({ offset: next * (itemWidth + 12), animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [enabled, banners.length, itemWidth]);

  const openBanner = async (banner: Banner) => {
    const target = banner.actionTarget?.trim();
    if (!target) return;
    if (banner.actionType === "product") router.push({ pathname: "/product/[id]", params: { id: target } });
    else if (banner.actionType === "category") router.push({ pathname: "/section/[name]", params: { name: target } });
    else if (banner.actionType === "url" && (target.startsWith("https://") || target.startsWith("http://"))) {
      try { await Linking.openURL(target); } catch (error) { console.log("Banner link:", error); }
    }
  };

  if (!enabled || banners.length === 0) return null;
  return <View style={styles.wrap}>
    <FlatList ref={listRef} data={banners} horizontal pagingEnabled snapToInterval={itemWidth + 12}
      decelerationRate="fast" showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id}
      onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / (itemWidth + 12)))}
      renderItem={({ item }) => <TouchableOpacity activeOpacity={item.actionType && item.actionType !== "none" ? 0.88 : 1}
        onPress={() => void openBanner(item)} style={{ width: itemWidth, marginRight: 12 }}>
        <Image source={{ uri: item.imageUrl }} contentFit="cover" transition={180} style={styles.image} />
      </TouchableOpacity>} />
    {banners.length > 1 && <View style={styles.dots}>{banners.map((b, i) =>
      <View key={b.id} style={[styles.dot, i === index && styles.activeDot]} />)}</View>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 2, marginBottom: 14 },
  image: { width: "100%", aspectRatio: 3, borderRadius: 12, backgroundColor: "#F2F2F2" },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 7 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#D0D0D0" },
  activeDot: { width: 15, backgroundColor: "#333333" }
});
