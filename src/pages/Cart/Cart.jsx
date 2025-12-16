// src/pages/Cart/Cart.jsx
import React from "react";
import { useCart } from "../../hooks/useCart";
import { useNavigate } from "react-router-dom";

export default function CartPage() {
  const { cart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  // calculate total
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // handlers mapped correctly to your hook functions
  const decreaseQuantity = (id) => {
    const item = cart.find((i) => i.productId === id);
    if (!item) return;

    const newQty = item.quantity - 1;
    if (newQty <= 0) removeItem(id);
    else updateQuantity(id, newQty);
  };

  const increaseQuantity = (id) => {
    const item = cart.find((i) => i.productId === id);
    if (!item) return;

    updateQuantity(id, item.quantity + 1);
  };

  const removeFromCart = (id) => removeItem(id);

  return (
    <main className="w-full bg-[#FBFAF9] min-h-screen px-4 py-10">
      <h1 className="text-3xl font-semibold mb-6">Your Cart</h1>

      {/* Empty cart */}
      {cart.length === 0 && (
        <div className="text-center py-20">
          <p className="text-xl text-gray-600">Your cart is empty 🛒</p>
          <button
            onClick={() => navigate("/products")}
            className="mt-6 bg-yellow-accent px-4 py-2 rounded-lg"
          >
            Browse Products
          </button>
        </div>
      )}

      {/* Cart items */}
      {cart.map((item) => (
        <div
          key={item.productId}  // 👈 FIXED UNIQUE KEY
          className="bg-white p-4 rounded-lg shadow flex gap-4 mb-4"
        >
          <div className="w-28 h-28 bg-gray-100 rounded overflow-hidden">
            <img
              src={item.thumbnailUrl || item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold">{item.name}</h2>
            <p className="text-gray-600">₹{item.price}</p>

            {/* Quantity Controls */}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => decreaseQuantity(item.productId)}
                className="bg-gray-200 px-3 py-1 rounded"
              >
                -
              </button>

              <span className="font-medium">{item.quantity}</span>

              <button
                onClick={() => increaseQuantity(item.productId)}
                className="bg-gray-200 px-3 py-1 rounded"
              >
                +
              </button>
            </div>

            <button
              onClick={() => removeFromCart(item.productId)}
              className="text-red-500 text-sm mt-2"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {/* Cart Total */}
      {cart.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between text-xl font-semibold mb-4">
            <span>Total:</span>
            <span>₹{totalAmount}</span>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="w-full bg-yellow-accent py-3 rounded-lg text-black font-medium"
          >
            Proceed to Checkout →
          </button>
        </div>
      )}
    </main>
  );
}
