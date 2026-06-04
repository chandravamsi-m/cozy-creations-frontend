import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { calculateProductDiscount } from "../utils/offerUtils";
import { useSettings } from "../contexts/SettingsContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useLocalStorage("cozy_cart", []);
  const { settings } = useSettings();

  const addItem = (item) => {
    setCart((prev) => {
      // For variant products, identity = productId + variantLabel
      const exists = prev.find((p) =>
        p.productId === item.productId &&
        (item.variantLabel ? p.variantLabel === item.variantLabel : !p.variantLabel)
      );
      if (exists) {
        return prev.map((p) => {
          const sameItem = p.productId === item.productId &&
            (item.variantLabel ? p.variantLabel === item.variantLabel : !p.variantLabel);
          return sameItem
            ? { ...p, ...item, quantity: p.quantity + (item.quantity || 1) }
            : p;
        });
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  // variantLabel is optional — if provided, only update the matching variant
  const updateQuantity = (id, quantity, variantLabel = null) => {
    setCart((prev) =>
      prev.map((p) => {
        const matches = p.productId === id &&
          (variantLabel !== null ? p.variantLabel === variantLabel : true);
        return matches ? { ...p, quantity } : p;
      })
    );
  };

  // variantLabel is optional — if provided, only remove the matching variant
  const removeItem = (id, variantLabel = null) => {
    setCart((prev) =>
      prev.filter((p) => {
        if (p.productId !== id) return true;
        if (variantLabel !== null) return p.variantLabel !== variantLabel;
        return false;
      })
    );
  };

  const clearCart = () => setCart([]);


  // shippingOverride: set by Checkout when Shiprocket returns a real rate.
  const [shippingOverride, setShippingOverride] = useState(null);

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

  // Platform Fee dynamic logic
  const platformFee = useMemo(() => {
    if (!settings.payment?.isPlatformFeeEnabled) return 0;
    return Number(settings.payment?.platformFee) || 0;
  }, [settings.payment]);

  // Delivery fee logic using shared settings:
  const deliveryFee = useMemo(() => {
    if (settings.delivery && settings.delivery.isShippingFeeEnabled === false) {
      return 0;
    }
    
    if (shippingOverride !== null) return shippingOverride;
    const { freeDeliveryThreshold, amount } = settings.delivery || { freeDeliveryThreshold: 0, amount: 0 };
    if (freeDeliveryThreshold > 0 && discountedTotal >= freeDeliveryThreshold) {
      return 0;
    }
    return amount || 0;
  }, [shippingOverride, settings.delivery, discountedTotal]);

  const finalTotal = cart.length > 0 ? discountedTotal + deliveryFee + platformFee : 0;

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
        platformFee,
        isPlatformFeeEnabled: !!settings.payment?.isPlatformFeeEnabled,
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
