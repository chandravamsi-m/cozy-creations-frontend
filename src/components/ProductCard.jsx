// src/components/ProductCard.jsx
import React, { useState, useEffect } from "react";
import { getImageSrc } from "../utils/image";
import { useCart } from "../hooks/useCart";

export default function ProductCard({ product }) {
  const [quantity, setQuantity] = useState(0);

  const { addItem, updateQuantity, removeItem, cart } = useCart();

  // CATEGORY ICONS
  const categoryIcons = {
    flower: "🌸",
    animal: "🐾",
    festive: "🎆",
    special: "⭐",
    glassJar: "🫙",
  };

  const getCategoryIcon = (category) => {
    return categoryIcons[category] || "🕯️";
  };

  const formatPrice = (price) => {
    if (!price) return "₹0";
    return `₹${price}`;
  };

  const getDetailChips = (product) => {
    const chips = [];
    if (product.waxType) {
      chips.push({
        label:
          product.waxType.charAt(0).toUpperCase() +
          product.waxType.slice(1) +
          " Wax",
        key: "waxType",
      });
    }
    if (product.weightGrams) {
      chips.push({
        label: `${product.weightGrams}g`,
        key: "weight",
      });
    }
    if (product.burnTimeHours) {
      chips.push({
        label: `${product.burnTimeHours}h Burn`,
        key: "burnTime",
      });
    }
    return chips;
  };

  // Sync UI quantity with cart quantity
  useEffect(() => {
    const item = cart.find((i) => i.productId === product.id);
    setQuantity(item ? item.quantity : 0);
  }, [cart, product.id]);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      thumbnailUrl: product.thumbnailUrl || product.imageUrl,
      quantity: 1,
    });
    setQuantity(1);
  };

  const handleQuantityChange = (delta) => {
    const newQuantity = Math.max(0, quantity + delta);

    if (newQuantity === 0) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, newQuantity);
    }

    setQuantity(newQuantity);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm relative group hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* TAGS */}
      {product.onSale && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full z-10">
          SALE
        </div>
      )}
      {product.limitedEdition && !product.onSale && (
        <div className="absolute top-2 left-2 bg-yellow-accent text-black text-xs px-2 py-1 rounded-full z-10">
          Limited Edition
        </div>
      )}

      {/* PRODUCT IMAGE */}
      <div
        className="aspect-[4/3] bg-[#F5F5F0] overflow-hidden"
      >
        <img
          src={getImageSrc(product.imageUrl || product.image, product.mimeType)}
          alt={product.altText || product.name || "product"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "https://via.placeholder.com/400x300?text=No+image";
          }}
        />
      </div>

      {/* PRODUCT DETAILS */}
      <div className="p-3 sm:p-4 xl:p-3 space-y-2">
        {/* NAME + PRICE */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm sm:text-base xl:text-sm text-gray-900 flex-1">
            {product.name}
          </h3>
          <span className="text-sm sm:text-base xl:text-sm font-medium text-[#8B7355] whitespace-nowrap">
            {formatPrice(product.price)}
          </span>
        </div>

        {/* CHIPS */}
        <div className="flex flex-wrap gap-1.5">
          {getDetailChips(product).map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
            >
              {chip.label}
            </span>
          ))}
        </div>

        <div className="border-t border-gray-200 my-3"></div>

        {/* CATEGORY + CART BUTTON */}
        <div className="flex items-center justify-between pt-1">
          {/* CATEGORY ICON */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">
              {getCategoryIcon(product.category)}
            </span>
            {product.secondaryCategory && (
              <span className="text-sm text-gray-600">
                {getCategoryIcon(product.secondaryCategory)}
              </span>
            )}
          </div>

          {/* CART BUTTONS */}
          {quantity > 0 ? (
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-2 py-1">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Decrease quantity"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 12H4"
                  />
                </svg>
              </button>

              <span className="text-sm font-medium text-gray-900 min-w-[20px] text-center">
                {quantity}
              </span>

              <button
                onClick={() => handleQuantityChange(1)}
                className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Increase quantity"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="w-10 h-10 bg-[#8B7355] rounded-full flex items-center justify-center hover:bg-[#7A6345] transition-colors shadow-sm"
              aria-label="Add to cart"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
