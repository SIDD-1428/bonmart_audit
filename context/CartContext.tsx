import auth from "@react-native-firebase/auth";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { subscribeToProducts } from "../services/products";
type Product = {
    id: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
    maxOrderQty?: number;
    stock?: number;
    unit?: string;
    isAvailable?: boolean;
};

type CartItem = Product;

type CartContextType = {
    cart: CartItem[];
    addToCart: (product: CartItem) => void;
    increaseQty: (id: string) => void;
    decreaseQty: (id: string) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    syncProductDetails: (product: Partial<CartItem> & { id: string }) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    // Keep one shared catalogue listener alive for the authenticated session.
    useEffect(() => {
        let unsubscribeProducts: (() => void) | null = null;
        const unsubscribeAuth = auth().onAuthStateChanged((user) => {
            unsubscribeProducts?.();
            unsubscribeProducts = null;
            if (!user) {
                setCart([]);
                return;
            }
            unsubscribeProducts = subscribeToProducts((products) => {
                setCart((currentCart) => currentCart.map((item) => {
                    const latest = products.find((product) => product.id === item.id);
                    if (!latest) return { ...item, isAvailable: false };
                    const latestPrice = Number(latest.price);
                    return {
                        ...item,
                        name: latest.name ?? item.name,
                        price: Number.isFinite(latestPrice) ? latestPrice : item.price,
                        image: latest.image ?? item.image,
                        stock: latest.stock == null ? item.stock : Number(latest.stock),
                        maxOrderQty: latest.maxOrderQty == null ? item.maxOrderQty : Number(latest.maxOrderQty),
                        unit: latest.unit ?? item.unit,
                        isAvailable: latest.isAvailable !== false && latest.isActive !== false,
                    };
                }));
            }, (error) => console.log("Product sync error:", error.message));
        });
        return () => {
            unsubscribeAuth();
            unsubscribeProducts?.();
        };
    }, []);

    const clearCart = () => setCart([]);

    const syncProductDetails = (product: Partial<CartItem> & { id: string }) => {
        setCart((current) => current.map((item) => item.id !== product.id ? item : ({
            ...item,
            ...product,
            quantity: item.quantity,
            price: product.price == null ? item.price : Number(product.price),
        })));
    };

    const addToCart = (product: CartItem) => {
    setCart(prev => {
        const existing = prev.find(
            item => item.id === product.id
        );

        if (existing) {
            if (existing.isAvailable === false) {
                Alert.alert("Product unavailable", "This product is currently unavailable.");
                return prev;
            }

            if (
                existing.maxOrderQty &&
                existing.maxOrderQty > 0 &&
                existing.quantity >= existing.maxOrderQty
            ) {
                return prev;
            }

            if (
                existing.stock != null &&
                existing.quantity >= existing.stock
            ) {
                return prev;
            }

            return prev.map(item =>
                item.id === product.id
                    ? {
                        ...item,
                        quantity: item.quantity + 1,
                    }
                    : item
            );
        }

        if (product.isAvailable === false || (product.stock != null && product.stock <= 0)) {
            Alert.alert("Out of stock", "This product is currently unavailable.");
            return prev;
        }

        return [
            ...prev,
            {
                ...product,
                quantity: 1,
                isAvailable: true,
            },
        ];
    });
};

     const increaseQty = (id: string)=>{

                        setCart(prev => prev.map(item => {
                            console.log({
                                id:item.id,
                                quantity:item.quantity,
                                maxOrderQty: item.maxOrderQty,
                                stock:item.stock,
                                maxOrderQtyType:typeof item.maxOrderQty,
                                stockType:typeof item.stock,
                            });

                            if (item.id !== id)
                            return item;
                          if (item.isAvailable === false) {
                            Alert.alert("Product unavailable", "This product is currently unavailable.");
                            return item;
                          }
                          if(
                            item.maxOrderQty !=null && 
                            item.quantity >= Number(item.maxOrderQty)
                          ){
                             Alert.alert(
                                    "Limit Reached",
                                    `Maximum ${item.maxOrderQty} units allowed`
                                );
                            return item;
                          }
                          if(item.stock!= null &&
                            item.quantity >= Number(item.stock)
                          ){
                            Alert.alert("Out of Stock","Sorry! That's all we have at this moment.")
                            return item;
                          }
    
                          return {
                            ...item,
                            quantity:item.quantity +1,
                          };
    
                        })
                      );
                      } ;

    const decreaseQty = (id: string) => {
        setCart(prev =>
            prev
                .map(item =>
                    item.id === id
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter(item => item.quantity > 0)
        );
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, increaseQty, decreaseQty, removeFromCart, clearCart, syncProductDetails }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
