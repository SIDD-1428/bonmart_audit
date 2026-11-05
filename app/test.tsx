import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";

import { getProducts } from "../services/products";

export default function Test() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  return (
    <View style={{ flex: 1, padding: 20, marginTop: 50 }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 15 }}>
            <Text>{item.name}</Text>
            <Text>₹{item.price}</Text>
            <Text>{item.category}</Text>
          </View>
        )}
      />
    </View>
  );
}