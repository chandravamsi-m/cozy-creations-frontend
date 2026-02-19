import React, { useState, useEffect } from "react";
import { getImageSrc } from "../utils/image";
import { useCart } from "../hooks/useCart";
import { calculateProductDiscount } from "../utils/offerUtils";
import { ShoppingCart, Plus, Minus } from "lucide-react";

import FlowerIcon from "../assets/svgs/flower-icon.svg";
import AnimalIcon from "../assets/svgs/animal-icon.svg";
import FestiveIcon from "../assets/svgs/festive-icon.svg";
import SpecialIcon from "../assets/svgs/spl-icon.svg";
import GlassJarIcon from "../assets/svgs/glass-jar-icon.svg";

export default function ProductCard({ product, onOpenQuickView }) {
  const [quantity, setQuantity] = useState(0);
  const [discount, setDiscount] = useState(null);
  const [loadingDiscount, setLoadingDiscount] = useState(true);

  // Determine if it's a bulk product using the new schema
  const isBulk = product.isBulk === true || (product.bulkPricingTiers && product.bulkPricingTiers.length > 0);
  const firstTier = isBulk && product.bulkPricingTiers && product.bulkPricingTiers.length > 0 ? product.bulkPricingTiers[0] : null;

  // Legacy bulk fields are removed as per user feedback

  const { addItem, updateQuantity, removeItem, cart } = useCart();

  // CATEGORY ICONS
  const categoryIcons = {
    flower: FlowerIcon,
    animal: AnimalIcon,
    festive: FestiveIcon,
    special: SpecialIcon,
    glassJar: GlassJarIcon,
  };

  const getCategoryIcon = (category) => {
    if (!category || !categoryIcons[category]) return null;

    return (
      <img
        src={categoryIcons[category]}
        alt={category}
        className="w-6 h-6"
      />
    );
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
    if (product.dimensions) {
      chips.push({
        label: product.dimensions,
        key: "dimensions",
      });
    }
    if (product.quantityPack) {
      chips.push({
        label: `Pack of ${product.quantityPack}`,
        key: "quantityPack",
      });
    }
    return chips;
  };

  const toCloudinaryThumb = (url) => {
    if (!url || typeof url !== "string") return url;
    if (!url.includes("res.cloudinary.com")) return url;
    if (!url.includes("/image/upload/")) return url;
    const parts = url.split("/image/upload/");
    if (parts.length !== 2) return url;
    // Optimized thumbnail for grid performance
    return `${parts[0]}/image/upload/w_520,h_390,c_fill,q_auto,f_auto/${parts[1]}`;
  };

  // Sync UI quantity with cart quantity
  useEffect(() => {
    const item = cart.find((i) => i.productId === product.id);
    setQuantity(item ? item.quantity : 0);
  }, [cart, product.id]);

  // Fetch discount for this product
  useEffect(() => {
    setLoadingDiscount(true);
    calculateProductDiscount(product)
      .then((discountData) => {
        if (discountData.hasDiscount) {
          setDiscount(discountData);
        } else {
          setDiscount(null);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch discount:', err);
      })
      .finally(() => {
        setLoadingDiscount(false);
      });
  }, [product.id]);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      thumbnailUrl: product.thumbnailUrl || product.imageUrl,
      quantityPack: product.quantityPack || 1,
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
    <div className="bg-white rounded-2xl shadow-sm relative group hover:shadow-md transition-shadow duration-200 overflow-visible h-full flex flex-col">
      <style>
        {`
          .diagonal-strike {
            position: relative;
            display: inline-block;
          }
          .diagonal-strike::after {
            content: "";
            position: absolute;
            top: 45%;
            left: -2%;
            width: 104%;
            height: 1px;
            background: currentColor;
            transform: rotate(-12deg);
          }
          .star-qty-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            width: 42px;
            height: 42px;
            background-image: url('https://res.cloudinary.com/dumkblp3v/image/upload/v1770800754/Star-badge_ttci0q.svg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 900;
            z-index: 30;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
            padding-bottom: 2px;
            transition: transform 0.3s ease;
          }
        `}
      </style>

      {/* OFFER BANNER (Top Right) */}
      {discount?.hasDiscount && (
        <div className="absolute top-2 right-2 bg-yellow-accent text-black text-[8px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md z-20 shadow-lg border border-yellow-accent/50 animate-pulse">
          Offer
        </div>
      )}

      {/* PRODUCT IMAGE */}
      <div
        className="aspect-[4/3] bg-[#F5F5F0] overflow-visible shrink-0 relative cursor-pointer"
        onClick={onOpenQuickView}
      >
        <div className="w-full h-full overflow-hidden rounded-t-2xl">
          <img
            src={toCloudinaryThumb(
              getImageSrc(product.imageUrl || product.image, product.mimeType)
            )}
            alt={product.altText || product.name || "product"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "https://via.placeholder.com/400x300?text=No+image";
            }}
          />
        </div>
      </div>

      {/* PRODUCT DETAILS */}
      <div className="pt-3 px-3 pb-1.5 sm:pt-4 sm:px-4 sm:pb-2 xl:pt-3 xl:px-3 xl:pb-1.5 space-y-3 flex-1 flex flex-col">
        {/* NAME + PRICE */}
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-1 sm:gap-2">
          <h3
            className="font-semibold text-sm sm:text-base xl:text-sm text-gray-900 w-full sm:w-auto sm:flex-1 leading-tight cursor-pointer hover:text-[#8B7355] transition-colors"
            onClick={onOpenQuickView}
          >
            {product.name}
          </h3>
          {discount && discount.hasDiscount ? (
            <div className="flex items-center gap-1.5 bg-yellow-accent/60 border border-yellow-accent/70 px-2 py-1 rounded-full shadow-sm self-start sm:self-auto mt-1 sm:mt-0 whitespace-nowrap shrink-0">
              <span className="text-[10px] text-gray-400 diagonal-strike font-medium leading-none">
                ₹{product.price.toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm font-bold text-green-700 leading-none">
                ₹{discount.discountedPrice.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="flex items-center bg-yellow-accent/60 border border-yellow-accent/70 px-3 py-1 rounded-full shadow-sm self-start sm:self-auto mt-1 sm:mt-0 whitespace-nowrap shrink-0">
              <span className="text-sm sm:text-base xl:text-sm font-bold text-[#6F573D] leading-none">
                {formatPrice(product.price)}
              </span>
            </div>
          )}
        </div>

        {/* CHIPS */}
        <div className="flex flex-wrap gap-1.5">
          {getDetailChips(product).map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700"
            >
              {chip.label}
            </span>
          ))}
        </div>

        <div className="border-t border-gray-100 mt-auto pt-2">
          {/* CATEGORY + CART BUTTON */}
          <div className="flex items-center justify-between">
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
              <div
                className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-2 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(-1);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="text-sm font-medium text-gray-900 min-w-[20px] text-center">
                  {quantity}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(1);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-[#8B7355] rounded-full flex items-center justify-center hover:bg-[#7A6345] transition-colors shadow-sm"
                aria-label="Add to cart"
              >
                <ShoppingCart className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
