// src/pages/Cart/Cart.jsx
import React from "react";
import { useCart } from "../../hooks/useCart";
import { useNavigate } from "react-router-dom";

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
  const { cart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

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
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
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
                            onClick={() => openCustomize(item)}
                            className="text-sm font-semibold text-gray-800 border border-gray-300 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg w-full sm:w-auto"
                          >
                            Customize
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg w-full sm:w-auto"
                        >
                          Remove
                        </button>
                      </div>

                      {customizations[item.productId]?.fragrance ||
                      customizations[item.productId]?.colourHex ||
                      customizations[item.productId]?.colourName ? (
                        <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2">
                          <span className="font-semibold text-gray-800">Customization:</span>{" "}
                          {customizations[item.productId]?.fragrance ? (
                            <span>
                              Fragrance:{" "}
                              <span className="font-medium text-gray-900">
                                {customizations[item.productId].fragrance === "Other"
                                  ? customizations[item.productId].fragranceOther || "Other"
                                  : customizations[item.productId].fragrance}
                              </span>
                            </span>
                          ) : null}
                          {customizations[item.productId]?.fragrance &&
                          (customizations[item.productId]?.colourHex ||
                            customizations[item.productId]?.colourName) ? (
                            <span> • </span>
                          ) : null}
                          {(customizations[item.productId]?.colourHex ||
                            customizations[item.productId]?.colourName) && (
                            <span className="inline-flex items-center gap-2">
                              <span>Colour:</span>
                              {customizations[item.productId]?.colourHex && (
                                <span
                                  className="inline-block w-3 h-3 rounded-full border border-black/10"
                                  style={{ backgroundColor: customizations[item.productId].colourHex }}
                                  aria-hidden="true"
                                />
                              )}
                              <span className="font-medium text-gray-900">
                                {customizations[item.productId]?.colourName ||
                                  customizations[item.productId]?.colourHex}
                              </span>
                            </span>
                          )}
                        </div>
                      ) : null}
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
                          className={`w-9 h-9 rounded-full border ${
                            active ? "ring-2 ring-yellow-accent border-black/20" : "border-black/10"
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
