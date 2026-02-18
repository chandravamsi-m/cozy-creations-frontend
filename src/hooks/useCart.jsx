import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { calculateProductDiscount } from "../utils/offerUtils";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useLocalStorage("cozy_cart", []);

  const addItem = (item) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.productId === item.productId);
      if (exists) {
        return prev.map((p) =>
          p.productId === item.productId
            ? { ...p, quantity: p.quantity + (item.quantity || 1) }
            : p
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const updateQuantity = (id, quantity) => {
    setCart((prev) =>
      prev.map((p) =>
        p.productId === id ? { ...p, quantity: quantity } : p
      )
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((p) => p.productId !== id));
  };

  const clearCart = () => setCart([]);

  const [deliveryConfig, setDeliveryConfig] = useState({
    isActive: false,
    amount: 0,
    freeDeliveryThreshold: 0,
    message: ""
  });

  // Fetch delivery settings on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/settings/delivery`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.delivery) {
          setDeliveryConfig(data.delivery);
        }
      })
      .catch(err => console.error("Failed to fetch delivery config:", err));
  }, []);

  const [itemDiscounts, setItemDiscounts] = useState({});
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);

  // Fetch discounts whenever cart changes
  useEffect(() => {
    const fetchDiscounts = async () => {
      setLoadingDiscounts(true);
      const discounts = {};
      try {
        await Promise.all(
          cart.map(async (item) => {
            const result = await calculateProductDiscount({
              id: item.productId,
              price: item.price,
              category: item.category
            });
            if (result.hasDiscount) {
              discounts[item.productId] = result;
            }
          })
        );
        setItemDiscounts(discounts);
      } catch (err) {
        console.error("Error fetching cart discounts:", err);
      } finally {
        setLoadingDiscounts(false);
      }
    };

    if (cart.length > 0) {
      fetchDiscounts();
    } else {
      setItemDiscounts({});
      setLoadingDiscounts(false);
    }
  }, [cart]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const totalDiscountAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const discount = itemDiscounts[item.productId];
      if (discount && discount.hasDiscount) {
        return sum + (discount.savedAmount * item.quantity);
      }
      return sum;
    }, 0);
  }, [cart, itemDiscounts]);

  const discountedTotal = totalPrice - totalDiscountAmount;

  // Calculate Delivery Fee based on discounted total
  const deliveryFee = useMemo(() => {
    if (!deliveryConfig.isActive) return 0;
    // Check threshold against discounted total (what user actually pays)
    if (deliveryConfig.freeDeliveryThreshold > 0 && discountedTotal >= deliveryConfig.freeDeliveryThreshold) {
      return 0; // Free delivery
    }
    return deliveryConfig.amount;
  }, [deliveryConfig, discountedTotal]);

  const finalTotal = discountedTotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        totalPrice, // Subtotal (raw)
        totalDiscountAmount,
        discountedTotal, // Total after discounts, before shipping
        deliveryFee,
        finalTotal, // Subtotal - Discount + Delivery
        deliveryConfig,
        itemDiscounts,
        loadingDiscounts
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
