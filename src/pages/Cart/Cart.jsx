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
    <main className="w-full bg-[#FBFAF9] min-h-screen px-4 py-10 pt-20 sm:pt-24 font-montserrat">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
              Your Cart
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {cart.length === 0 ? "No items added yet." : `${cart.length} item(s) in your cart`}
            </p>
          </div>
          <button
            onClick={() => navigate("/products")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 shadow-sm"
          >
            Continue shopping
          </button>
        </div>

        {/* Empty cart */}
        {cart.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-yellow-accent/60 grid place-items-center mx-auto text-2xl">
              🛒
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-gray-600">
              Add something cozy — your next favorite candle is waiting.
            </p>
            <button
              onClick={() => navigate("/products")}
              className="mt-6 bg-yellow-accent hover:bg-yellow-accent/90 px-5 py-3 rounded-xl font-semibold text-black"
            >
              Browse products
            </button>
          </div>
        )}

        {cart.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={item.thumbnailUrl || item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                            {item.name}
                          </h2>
                          <p className="mt-1 text-sm text-gray-600">
                            ₹{item.price} <span className="text-gray-400">each</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-500">Subtotal</p>
                          <p className="text-base font-semibold text-gray-900">
                            ₹{item.price * item.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Quantity Controls */}
                        <div className="inline-flex items-center gap-2 bg-white border border-gray-300 rounded-full px-2 py-1">
                          <button
                            onClick={() => decreaseQuantity(item.productId)}
                            className="w-9 h-9 rounded-full hover:bg-gray-50 text-gray-800 grid place-items-center"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <span className="min-w-[28px] text-center font-semibold text-gray-900">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => increaseQuantity(item.productId)}
                            className="w-9 h-9 rounded-full hover:bg-gray-50 text-gray-800 grid place-items-center"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg w-full sm:w-auto"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <aside className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm lg:sticky lg:top-28">
                <h3 className="text-lg font-semibold text-gray-900">Order summary</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>Items</span>
                    <span className="font-medium">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-medium">₹{totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-base font-semibold text-gray-900">
                    <span>Total</span>
                    <span>₹{totalAmount}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/checkout")}
                  className="mt-5 w-full bg-yellow-accent hover:bg-yellow-accent/90 py-3 rounded-xl text-black font-semibold"
                >
                  Proceed to Checkout →
                </button>

                <p className="mt-3 text-xs text-gray-500">
                  Secure checkout. You can review your order before placing it.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
