import { createContext, useContext } from "react";
import { useLocalStorage } from "./useLocalStorage";

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

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
