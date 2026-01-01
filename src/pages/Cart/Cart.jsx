// src/pages/Cart/Cart.jsx
import React from "react";
import { useCart } from "../../hooks/useCart";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLoginModal } from "../../contexts/LoginModalContext";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
import { optimizeCloudinaryImage, IMAGE_PRESETS } from "../../utils/imageOptimization";

const FRAGRANCE_OPTIONS = [
  "Rose",
  "Jasmine",
  "Sandal",
  "Ocean mint",
  "Lemon Grass",
  "Cherry blossom",
  "Oud",
  "Jezz-z",
  "Deco",
  "Apple pine",
  "Mogra",
  "Raat Raani",
];

const COLOR_PRESETS = [
  { name: "White", value: "#FFFFFF" },
  { name: "Ivory", value: "#FFF5E6" },
  { name: "Beige", value: "#E7D3B0" },
  { name: "Brown", value: "#8B5E3C" },
  { name: "Black", value: "#111827" },
  { name: "Red", value: "#EF4444" },
  { name: "Pink", value: "#EC4899" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Yellow", value: "#FACC15" },
  { name: "Orange", value: "#F97316" },
];

export default function CartPage() {
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const { user, idToken } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [customizations, setCustomizations] = React.useState(() => {
    try {
      const raw = localStorage.getItem("cc_cart_customizations_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [customizeOpenFor, setCustomizeOpenFor] = React.useState(null); // productId
  const [draft, setDraft] = React.useState({
    fragrance: "",
    fragranceOther: "",
    colourHex: "",
    colourName: "",
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("cc_cart_customizations_v1", JSON.stringify(customizations));
    } catch {
      // ignore storage write failures
    }
  }, [customizations]);

  const openCustomize = (item) => {
    const saved = customizations[item.productId] || {};
    setDraft({
      fragrance: saved.fragrance || "",
      fragranceOther: saved.fragranceOther || "",
      colourHex: saved.colourHex || saved.colour || "",
      colourName: saved.colourName || "",
    });
    setCustomizeOpenFor(item.productId);
  };

  const closeCustomize = () => {
    setCustomizeOpenFor(null);
  };

  const saveCustomize = () => {
    if (!customizeOpenFor) return;
    setCustomizations((prev) => ({
      ...prev,
      [customizeOpenFor]: {
        fragrance: draft.fragrance,
        fragranceOther: draft.fragrance === "Other" ? draft.fragranceOther : "",
        colourHex: draft.colourHex,
        colourName: draft.colourName,
      },
    }));
    closeCustomize();
  };

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

  // Handle checkout - navigate to checkout page
  const handleCheckout = () => {
    // Check if cart is empty
    if (cart.length === 0) return;

    // Check if user is logged in
    if (!user) {
      openLoginModal();
      return;
    }

    // Proceed to checkout page
    navigate("/checkout");
  };

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
                  className="bg-white border border-gray-200/60 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden shrink-0 relative group">
                      <img
                        src={optimizeCloudinaryImage(item.thumbnailUrl || item.imageUrl, IMAGE_PRESETS.cart)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1 leading-tight line-clamp-2">
                            {item.name}
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-600">
                            ₹{item.price.toLocaleString()} <span className="text-gray-400">each</span>
                          </p>
                          {item.quantityPack && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Pack of {item.quantityPack}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Subtotal</p>
                          <p className="text-lg font-bold text-gray-900">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Customization Display */}
                      {customizations[item.productId]?.fragrance ||
                        customizations[item.productId]?.colourHex ||
                        customizations[item.productId]?.colourName ? (
                        <div className="mb-3 p-2.5 bg-gradient-to-br from-yellow-accent/10 to-yellow-accent/5 border border-yellow-accent/20 rounded-lg">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <svg className="w-3.5 h-3.5 text-yellow-accent" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wide">Customized</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {customizations[item.productId]?.fragrance && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-600">Fragrance:</span>
                                <span className="font-semibold text-gray-900 bg-white px-2 py-0.5 rounded text-[11px]">
                                  {customizations[item.productId].fragrance === "Other"
                                    ? customizations[item.productId].fragranceOther || "Other"
                                    : customizations[item.productId].fragrance}
                                </span>
                              </div>
                            )}
                            {(customizations[item.productId]?.colourHex ||
                              customizations[item.productId]?.colourName) && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-600">Color:</span>
                                  {customizations[item.productId]?.colourHex && (
                                    <span
                                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                      style={{ backgroundColor: customizations[item.productId].colourHex }}
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="font-semibold text-gray-900 bg-white px-2 py-0.5 rounded text-[11px]">
                                    {customizations[item.productId]?.colourName ||
                                      customizations[item.productId]?.colourHex}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      ) : null}

                      {/* Actions Row */}
                      <div className="flex flex-row items-center gap-2 pt-3 border-t border-gray-200">
                        {/* Quantity Controls */}
                        <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                          <button
                            onClick={() => decreaseQuantity(item.productId)}
                            className="w-6 h-6 rounded-md hover:bg-white active:bg-gray-100 text-gray-700 hover:text-gray-900 grid place-items-center font-semibold text-xs transition-all"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <span className="min-w-[24px] text-center font-bold text-gray-900 text-xs">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => increaseQuantity(item.productId)}
                            className="w-6 h-6 rounded-md hover:bg-white active:bg-gray-100 text-gray-700 hover:text-gray-900 grid place-items-center font-semibold text-xs transition-all"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => openCustomize(item)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-xs font-semibold text-gray-800 transition-all hover:border-gray-400 whitespace-nowrap"
                        >
                          {customizations[item.productId] ? "Edit" : "Customize"}
                        </button>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 active:bg-red-100 text-xs font-semibold text-red-600 hover:text-red-700 transition-all hover:border-red-300 whitespace-nowrap"
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
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="mt-5 w-full bg-yellow-accent hover:bg-yellow-accent/90 py-3 rounded-xl text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

      {/* Customize Modal */}
      {customizeOpenFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#FBFAF9] rounded-2xl border border-black/10 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-black/10 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Customize your order</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    As per your customization requirement we have options and also accept your choice.
                  </p>
                </div>
                <button
                  onClick={closeCustomize}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 grid place-items-center text-gray-700"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Fragrance
                </label>
                <select
                  value={draft.fragrance}
                  onChange={(e) => setDraft((p) => ({ ...p, fragrance: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-accent/70"
                >
                  <option value="">Select fragrance</option>
                  {FRAGRANCE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {draft.fragrance === "Other" && (
                  <input
                    value={draft.fragranceOther}
                    onChange={(e) => setDraft((p) => ({ ...p, fragranceOther: e.target.value }))}
                    placeholder="Type your fragrance"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-accent/70"
                  />
                )}

                <p className="text-xs text-gray-500">
                  Options: {FRAGRANCE_OPTIONS.join(", ")} and many more.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Colour
                </label>
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">Pick</span>
                      <input
                        type="color"
                        value={draft.colourHex || "#F5F5F0"}
                        onChange={(e) => {
                          const newHex = e.target.value.toUpperCase();
                          const matchingPreset = COLOR_PRESETS.find(
                            (c) => c.value.toUpperCase() === newHex
                          );
                          setDraft((p) => ({
                            ...p,
                            colourHex: newHex,
                            colourName: matchingPreset ? matchingPreset.name : p.colourName,
                          }));
                        }}
                        className="w-10 h-10 p-0 border-0 bg-transparent"
                        aria-label="Pick a color"
                      />
                    </div>
                    <input
                      value={draft.colourName}
                      onChange={(e) => setDraft((p) => ({ ...p, colourName: e.target.value }))}
                      placeholder="Color name (optional)"
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-accent/70"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {COLOR_PRESETS.map((c) => {
                      const active = (draft.colourHex || "").toLowerCase() === c.value.toLowerCase();
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() =>
                            setDraft((p) => ({
                              ...p,
                              colourHex: c.value,
                              colourName: c.name,
                            }))
                          }
                          className={`w-9 h-9 rounded-full border ${active ? "ring-2 ring-yellow-accent border-black/20" : "border-black/10"
                            }`}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.name}
                          title={c.name}
                        />
                      );
                    })}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Choose a preset or pick any color. You can also type a name.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-black/10 bg-white flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={closeCustomize}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomize}
                className="px-4 py-2.5 rounded-xl bg-yellow-accent hover:bg-yellow-accent/90 text-sm font-semibold text-black"
              >
                Save customization
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
