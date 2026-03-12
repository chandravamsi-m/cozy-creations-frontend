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
            ? { ...p, ...item, quantity: p.quantity + (item.quantity || 1) }
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


  // shippingOverride: set by Checkout when Shiprocket returns a real rate.
  const [shippingOverride, setShippingOverride] = useState(null);
  const [deliverySettings, setDeliverySettings] = useState({ amount: 0, freeDeliveryThreshold: 0 });

  const [itemDiscounts, setItemDiscounts] = useState({});
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);

  // Fetch Delivery Settings once
  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/settings/delivery`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.delivery) setDeliverySettings(data.delivery); })
      .catch(err => console.warn("Delivery settings fetch failed:", err.message));
  }, []);

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
  const PLATFORM_FEE = 80;

  // Delivery fee logic:
  // 1. If Shiprocket returned a rate (shippingOverride), use it.
  // 2. Otherwise, check if total qualifies for free delivery.
  // 3. Otherwise, use the standard delivery amount from settings.
  const deliveryFee = useMemo(() => {
    if (shippingOverride !== null) return shippingOverride;
    if (deliverySettings.freeDeliveryThreshold > 0 && discountedTotal >= deliverySettings.freeDeliveryThreshold) {
      return 0;
    }
    return deliverySettings.amount || 0;
  }, [shippingOverride, deliverySettings, discountedTotal]);

  const finalTotal = cart.length > 0 ? discountedTotal + deliveryFee + PLATFORM_FEE : 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        totalPrice,
        totalDiscountAmount,
        discountedTotal,
        deliveryFee,
        platformFee: PLATFORM_FEE,
        finalTotal,
        itemDiscounts,
        loadingDiscounts,
        shippingOverride,
        setShippingOverride,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
