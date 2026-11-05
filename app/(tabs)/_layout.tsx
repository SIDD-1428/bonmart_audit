import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useCart } from "../../context/CartContext";

export default function TabLayout(){
  const { cart } = useCart();
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  return(
    <Tabs screenOptions={{
      headerShown:false,
      tabBarActiveTintColor: "black",
      tabBarInactiveTintColor: "gray",
      tabBarStyle: {
        height:60, 
        paddingBottom: 8
      },
    }}>

      {/*Home screen*/}
      <Tabs.Screen name="home"
      options={{
        title: "Home",
        tabBarIcon: ({color, size})=>(
            <Ionicons name="home" color={color} size={size}/>
        )
      }}/>
    
      {/*Cart screen*/}
      <Tabs.Screen
  name="cart"
  options={{
    title: "Cart",
    tabBarBadge: totalQty > 0 ? totalQty : undefined,
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="cart" size={size} color={color} />
    ),
  }}
/>

{/*order*/}
<Tabs.Screen
    name="orders"
    options={{
      title: "Orders",
      tabBarIcon: ({ color }) => (
        <Ionicons name="receipt-outline" size={24} color={color} />
      ),
    }}
  />
      {/*Profile screen*/}
      <Tabs.Screen name="profile"
      options={{
        title: "Profile",
        tabBarIcon: ({color, size})=>(
            <Ionicons name="person" color={color} size={size}/>
        )
      }} />
    </Tabs>
  );
}