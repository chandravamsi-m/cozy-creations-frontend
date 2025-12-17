import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./hooks/useCart.jsx";
import { WishlistProvider } from "./hooks/useWishlist.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
        <App />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </StrictMode>
);
