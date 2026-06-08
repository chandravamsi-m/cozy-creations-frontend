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

  const fromPrice = React.useMemo(() => {
    if ((product.productType === "scented-stick" || product.productType === "perfume") && Array.isArray(product.variants) && product.variants.length > 0) {
      const availPrices = product.variants.filter(v => v.isAvailable !== false && Number(v.price) > 0).map(v => Number(v.price));
      return availPrices.length > 0 ? Math.min(...availPrices) : null;
    }
    return null;
  }, [product]);

  // Sync UI quantity with cart quantity
  useEffect(() => {
    const item = cart.find((i) => i.productId === product.id);
    setQuantity(item ? item.quantity : 0);
  }, [cart, product.id]);

  // Fetch or calculate discount for this product
  useEffect(() => {
    const priceToEvaluate = fromPrice !== null ? fromPrice : product.price;
    if (activeOffer) {
      // Use efficient local calculation if activeOffer is provided
      const localDiscount = getEffectiveDiscount(product, activeOffer, priceToEvaluate);
      setDiscount(localDiscount?.hasDiscount ? localDiscount : null);
      setLoadingDiscount(false);
    } else {
      // Fallback to async calculation (individual landing pages, etc.)
      setLoadingDiscount(true);
      calculateProductDiscount(product, priceToEvaluate)
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
    const type = product.productType || "candle";

    if (type === "scented-stick") {
      if (product.scentFamily) chips.push({ label: product.scentFamily, key: "scentFamily" });

      const availSizes = Array.isArray(product.variants) ? product.variants.filter(v => v.isAvailable !== false).length : 0;
      if (availSizes > 0) chips.push({ label: `${availSizes} Sizes`, key: "sizes" });
    } else if (type === "perfume") {
      if (product.scentFamily) chips.push({ label: product.scentFamily, key: "scentFamily" });
      if (product.isAlcoholFree) chips.push({ label: "Alcohol Free", key: "alcoholFree" });
      const availSizes = Array.isArray(product.variants) ? product.variants.filter(v => v.isAvailable !== false).length : 0;
      if (availSizes > 0) chips.push({ label: `${availSizes} Volumes`, key: "sizes" });
    } else {
      // Default: Candle
      if (product.waxType) {
        chips.push({
          label:
            product.waxType.charAt(0).toUpperCase() +
            product.waxType.slice(1) +
            " Wax",
          key: "waxType",
        });
      }
      if (product.weightGrams) chips.push({ label: `${product.weightGrams}g`, key: "weight" });
      if (product.burnTimeHours) chips.push({ label: `${product.burnTimeHours}h Burn`, key: "burnTime" });
      if (product.dimensions) chips.push({ label: product.dimensions, key: "dimensions" });
      if (product.quantityPack) chips.push({ label: `Pack of ${product.quantityPack}`, key: "quantityPack" });
    }
    return chips;
  };

  const toCloudinaryThumb = (url) => {
    if (!url || typeof url !== "string") return url;
    if (!url.includes("res.cloudinary.com")) return url;
    if (!url.includes("/image/upload/")) return url;
    // Guard: don't double-transform if transformations already exist
    if (url.includes("/image/upload/w_") || url.includes("/image/upload/q_") || url.includes("/image/upload/c_")) return url;
    const parts = url.split("/image/upload/");
    if (parts.length !== 2) return url;
    // Optimized thumbnail for grid performance
    return `${parts[0]}/image/upload/w_520,h_390,c_fill,q_auto,f_auto/${parts[1]}`;
  };

  const handleAddToCart = () => {
    if ((product.productType === "scented-stick" || product.productType === "perfume") && Array.isArray(product.variants) && product.variants.length > 0) {
      onOpenQuickView();
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      productType: product.productType || "candle",
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

        `}
      </style>

      {/* OFFER BANNER (Top Right) */}
      {discount?.hasDiscount && (
        <div className="absolute top-2 right-2 bg-yellow-accent text-black text-[8px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md z-20 shadow-md border border-yellow-accent/40 max-w-[120px] truncate" title={discount.offerName || "Offer"}>
          {discount.offerName || "Offer"}
        </div>
      )}

      {/* PRODUCT IMAGE */}
      <div
        className="aspect-square sm:aspect-[4/3] bg-[#F5F5F0] overflow-visible shrink-0 relative cursor-pointer"
        onClick={onOpenQuickView}
      >
        <div className="w-full h-full overflow-hidden rounded-t-2xl relative">
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
          {/* VARIANT-BASED PRODUCT: show "From ₹X" and redirect to quick view for size selection */}
          {(product.productType === "scented-stick" || product.productType === "perfume") && Array.isArray(product.variants) && product.variants.length > 0 ? (
            (() => {
              const availPrices = product.variants.filter(v => v.isAvailable !== false && Number(v.price) > 0).map(v => Number(v.price));
              const fromPrice = availPrices.length > 0 ? Math.min(...availPrices) : null;
              
              if (fromPrice !== null && discount?.hasDiscount) {
                return (
                  <div className="flex items-center gap-1 bg-yellow-accent/60 border border-yellow-accent/70 px-1 py-0 rounded-full shadow-sm self-center sm:self-auto whitespace-nowrap shrink-0 ml-auto">
                    <span className="text-[9px] text-gray-400 diagonal-strike font-medium leading-none">
                      From ₹{fromPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] sm:text-sm font-bold text-green-700 leading-none">
                      ₹{discount.discountedPrice.toLocaleString()}
                    </span>
                  </div>
                );
              }

              return (
                <div className="flex items-center bg-yellow-accent/60 border border-yellow-accent/70 px-2 py-0 rounded-full shadow-sm self-center sm:self-auto whitespace-nowrap shrink-0 ml-auto">
                  <span className="text-[10px] sm:text-sm md:text-base lg:text-sm font-bold text-[#6F573D] leading-none">
                    {fromPrice !== null ? `From ₹${fromPrice.toLocaleString()}` : "Select Size"}
                  </span>
                </div>
              );
            })()
          ) : discount && discount.hasDiscount ? (
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
            {quantity > 0 && !(product.productType === "scented-stick" || product.productType === "perfume") ? (
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
