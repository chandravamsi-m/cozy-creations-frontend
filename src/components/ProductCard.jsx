import React, { useState, useEffect } from "react";
import { getImageSrc } from "../utils/image";
import { useCart } from "../hooks/useCart";
import { calculateProductDiscount, getEffectiveDiscount } from "../utils/offerUtils";
import { ShoppingCart, Plus, Minus } from "lucide-react";

import FlowerIcon from "../assets/svgs/flower-icon.svg";
import AnimalIcon from "../assets/svgs/animal-icon.svg";
import FestiveIcon from "../assets/svgs/festive-icon.svg";
import SpecialIcon from "../assets/svgs/spl-icon.svg";
import GlassJarIcon from "../assets/svgs/glass-jar-icon.svg";

export default function ProductCard({ product, onOpenQuickView, activeOffer }) {
  const [quantity, setQuantity] = useState(0);
  const [discount, setDiscount] = useState(null);
  const [loadingDiscount, setLoadingDiscount] = useState(true);

  const { addItem, updateQuantity, removeItem, cart } = useCart();

  // Sync UI quantity with cart quantity
  useEffect(() => {
    const item = cart.find((i) => i.productId === product.id);
    setQuantity(item ? item.quantity : 0);
  }, [cart, product.id]);

  // Fetch or calculate discount for this product
  useEffect(() => {
    if (activeOffer) {
      // Use efficient local calculation if activeOffer is provided
      const localDiscount = getEffectiveDiscount(product, activeOffer);
      setDiscount(localDiscount.hasDiscount ? localDiscount : null);
      setLoadingDiscount(false);
    } else {
      // Fallback to async calculation (individual landing pages, etc.)
      setLoadingDiscount(true);
      calculateProductDiscount(product)
        .then((discountData) => {
          setDiscount(discountData?.hasDiscount ? discountData : null);
        })
        .catch((err) => {
          console.error("Failed to fetch legacy discount:", err);
          setDiscount(null);
        })
        .finally(() => {
          setLoadingDiscount(false);
        });
    }
  }, [product.id, activeOffer]);

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

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      weightGrams: product.weightGrams || 0,
      dimensions: product.dimensions || null,
      quantityPack: product.quantityPack || 1,
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
        <div className="absolute top-2 right-2 bg-yellow-accent text-black text-[8px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md z-20 shadow-lg border border-yellow-accent/50">
          Offer
        </div>
      )}

      {/* PRODUCT IMAGE */}
      <div
        className="aspect-square sm:aspect-[4/3] bg-[#F5F5F0] overflow-visible shrink-0 relative cursor-pointer"
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
      <div className="pt-1.5 px-1.5 pb-0.5 sm:pt-3 sm:px-3 sm:pb-1.5 xl:pt-2 xl:px-2 xl:pb-1 space-y-0.5 sm:space-y-2 flex-1 flex flex-col">
        {/* NAME + PRICE */}
        <div className="flex flex-row items-center justify-between gap-1 sm:gap-2">
          <h3
            className="font-semibold text-[11px] sm:text-sm md:text-base lg:text-sm text-gray-900 flex-1 leading-tight cursor-pointer hover:text-[#8B7355] transition-colors line-clamp-1"
            onClick={onOpenQuickView}
          >
            {product.name}
          </h3>
          {discount && discount.hasDiscount ? (
            <div className="flex items-center gap-1 bg-yellow-accent/60 border border-yellow-accent/70 px-1 py-0 rounded-full shadow-sm self-center sm:self-auto whitespace-nowrap shrink-0 ml-auto">
              <span className="text-[9px] text-gray-400 diagonal-strike font-medium leading-none">
                ₹{product.price.toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-sm font-bold text-green-700 leading-none">
                ₹{discount.discountedPrice.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="flex items-center bg-yellow-accent/60 border border-yellow-accent/70 px-2 py-0 rounded-full shadow-sm self-center sm:self-auto whitespace-nowrap shrink-0 ml-auto">
              <span className="text-[10px] sm:text-sm md:text-base lg:text-sm font-bold text-[#6F573D] leading-none">
                {formatPrice(product.price)}
              </span>
            </div>
          )}
        </div>

        {/* CHIPS */}
        <div className="flex flex-wrap gap-[2px] sm:gap-1">
          {getDetailChips(product).map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center px-1 py-0 rounded-full text-[9px] sm:text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap"
            >
              {chip.label}
            </span>
          ))}
        </div>

        <div className="border-t border-gray-100 mt-auto pt-1 sm:pt-1.5">
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
                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="text-sm font-medium text-gray-900 min-w-[20px] text-center">
                  {quantity}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(1);
                  }}
                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-[#8B7355] rounded-full flex items-center justify-center hover:bg-[#7A6345] transition-colors shadow-sm"
                aria-label="Add to cart"
              >
                <ShoppingCart className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
