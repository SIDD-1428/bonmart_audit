import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Fuse from "fuse.js";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ProductCard from "../components/ProductCard";
import { subscribeToProducts } from "../services/products";

// ── Clean Black/White/Grey Color Scheme ──
const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  textPrimary: "#000000",
  textSecondary: "#666666",
  muted: "#999999",
  separator: "#E8E8E8",
  primary: "#000000",
  accent: "#333333",
};

export default function SearchScreen() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const popularSearches = [
    "Rice",
    "Atta",
    "Soap",
    "Shampoo",
    "Chips",
    "Vegetables",
    "Fruits",
    "Dairy",
    "Snacks",
    "Beverages",
  ];

  // Receive catalogue updates through the shared Firestore subscription.
  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (data) => { setProducts(data); setIsLoading(false); },
      (error) => { console.log("Search products listener error:", error.message); setIsLoading(false); }
    );
    loadRecentSearches();
    return unsubscribe;
  }, []);

  const loadRecentSearches = () => {
    // Load from AsyncStorage or local state
    // For now using local state with mock data
    setRecentSearches([]);
  };

  const saveRecentSearch = (term: string) => {
    setRecentSearches((prev) => {
      const updated = [term, ...prev.filter((item) => item !== term)];
      return updated.slice(0, 5);
    });
  };

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(products, {
        includeScore: true,
        threshold: 0.35, // Fuzzy matching sensitivity (lower = stricter)
        ignoreLocation: true, // Search entire string
        minMatchCharLength: 2,
        keys: [
          {
            name: "name",
            weight: 0.7, // Highest priority
          },
          {
            name: "category",
            weight: 0.2, // Medium priority
          },
          {
            name: "protext",
            weight: 0.1, // Lower priority
          },
          {
            name: "unit",
            weight: 0.05, // Lowest priority
          },
        ],
      }),
    [products]
  );

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      performSearch();
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  const performSearch = () => {
    if (!search.trim()) {
      setFilteredProducts([]);
      return;
    }

    const query = search.trim().toLowerCase();
    
    // Fuzzy search with Fuse
    const fuzzyResults = fuse.search(query);
    
    // Additional exact match boosting
    const ranked = fuzzyResults
      .map((result) => ({
        ...result.item,
        score: result.score ?? 1,
        // Boost exact matches
        boostedScore: (() => {
          let score = result.score ?? 1;
          const nameMatch = result.item.name?.toLowerCase() === query;
          const startsWithMatch = result.item.name?.toLowerCase().startsWith(query);
          
          if (nameMatch) score *= 0.3;
          else if (startsWithMatch) score *= 0.5;
          
          return score;
        })(),
      }))
      .sort((a, b) => a.boostedScore - b.boostedScore);

    setFilteredProducts(ranked);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
  };

  const selectSearch = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearch(value);
    saveRecentSearch(value);
  };

  const clearSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearch("");
    setFilteredProducts([]);
  };

  const clearRecentSearches = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecentSearches([]);
  };

  const renderProductCard = ({ item }: { item: any }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard
        id={item.id}
        name={item.name}
        price={item.price}
        stock={item.stock}
        image={item.image}
        protext={item.protext}
        rating={item.rating}
        unit={item.unit}
        maxOrderQty={item.maxOrderQty}
      />
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      {search.length > 0 ? (
        <>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={64} color={Colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with different keywords
          </Text>
        </>
      ) : (
        <>
          {/* Popular Searches */}
          <Text style={styles.sectionTitle}>Popular Searches</Text>
          <View style={styles.chipsContainer}>
            {popularSearches.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.chip}
                onPress={() => selectSearch(item)}
              >
                <Ionicons name="trending-up" size={14} color={Colors.primary} />
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsContainer}>
                {recentSearches.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, styles.recentChip]}
                    onPress={() => selectSearch(item)}
                  >
                    <Ionicons name="time-outline" size={14} color={Colors.muted} />
                    <Text style={styles.recentChipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products"
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={handleSearch}
            autoFocus
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Count */}
      {search.length > 0 && filteredProducts.length > 0 && (
        <View style={styles.resultCountContainer}>
          <Text style={styles.resultCount}>
            {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""} found
          </Text>
        </View>
      )}

      {/* Results or Suggestions */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },

  // Search Bar
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: -15,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },

  // Result Count
  resultCountContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultCount: {
    fontSize: 13,
    color: Colors.muted,
  },

  // Product List
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  productCardWrapper: {
    width: "48%",
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.muted,
  },

  // Empty State
  emptyContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  emptyIcon: {
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  clearText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
  },
  recentChip: {
    backgroundColor: Colors.card,
  },
  recentChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});