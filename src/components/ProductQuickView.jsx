import React, { useState, useEffect } from "react";
import { getImageSrc } from "../utils/image";
import { useCart } from "../hooks/useCart";
import { calculateProductDiscount, getEffectiveDiscount } from "../utils/offerUtils";
import { X, ShoppingCart, Plus, Minus } from "lucide-react";

import FlowerIcon from "../assets/svgs/flower-icon.svg";
import AnimalIcon from "../assets/svgs/animal-icon.svg";
import FestiveIcon from "../assets/svgs/festive-icon.svg";
import SpecialIcon from "../assets/svgs/spl-icon.svg";
import GlassJarIcon from "../assets/svgs/glass-jar-icon.svg";

export default function ProductQuickView({ product, onClose, activeOffer }) {
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const { addItem, updateQuantity, removeItem, cart } = useCart();

  const isBulk = product ? (product.isBulk === true || (product.bulkPricingTiers && product.bulkPricingTiers.length > 0)) : false;

  // CATEGORY ICONS
  const categoryIcons = {
    flower: FlowerIcon,
    animal: AnimalIcon,
    festive: FestiveIcon,
    special: SpecialIcon,
    glassJar: GlassJarIcon,
  };

  useEffect(() => {
    if (product) {
      if (activeOffer) {
        // Instant local calculation
        setDiscount(getEffectiveDiscount(product, activeOffer));
      } else {
        // Fallback to async
        calculateProductDiscount(product).then(setDiscount);
      }

      // Sync with cart quantity if exists
      const item = cart.find((i) => i.productId === product.id);
      if (item) setQuantity(item.quantity);
    }
  }, [product, cart, activeOffer]);

  if (!product) return null;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      thumbnailUrl: product.thumbnailUrl || product.imageUrl,
      quantityPack: product.quantityPack || 1,
      quantity: quantity,
    });
  };

  const handleQuantityChange = (delta) => {
    const newQty = Math.max(1, quantity + delta);
    setQuantity(newQty);

    // If already in cart, update it
    const item = cart.find((i) => i.productId === product.id);
    if (item) {
      updateQuantity(product.id, newQty);
    }
  };

  const getDetailChips = (product) => {
    const chips = [];
    if (product.waxType) chips.push({ label: `${product.waxType.toUpperCase()} WAX`, key: "wax" });
    if (product.weightGrams) chips.push({ label: `${product.weightGrams}g`, key: "weight" });
    if (product.burnTimeHours) chips.push({ label: `${product.burnTimeHours}h BURN`, key: "burn" });
    if (product.dimensions) chips.push({ label: product.dimensions, key: "dims" });
    return chips;
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-montserrat">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all active:scale-95"
        >
          <X className="w-5 h-5 text-gray-900" />
        </button>

        {/* Left: Image Section */}
        <div className="w-full md:w-1/2 bg-[#F8F8F5] relative group cursor-zoom-in overflow-hidden h-[300px] md:h-auto">
          <img
            src={getImageSrc(product.imageUrl || product.image)}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${isZoomed ? 'scale-150 rotate-2' : 'group-hover:scale-105'}`}
            onClick={() => setIsZoomed(!isZoomed)}
          />
          {!isZoomed && (
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="bg-white/90 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-xl">
                Click to Zoom
              </span>
            </div>
          )}

        </div>

        {/* Right: Content Section */}
        <div className="w-full md:w-1/2 p-5 md:p-8 overflow-y-auto bg-white flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-yellow-accent/20 rounded-xl flex items-center justify-center text-xl">
                {product.category && categoryIcons[product.category] && (
                  <img src={categoryIcons[product.category]} className="w-5 h-5" alt={product.category} />
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {product.category} Collection
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-1 font-serif">{product.name}</h2>

            {/* Price Row */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-4">
                {discount?.hasDiscount ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl md:text-3xl font-black text-gray-900">₹{discount.discountedPrice.toLocaleString()}</span>
                    <span className="text-base text-gray-300 line-through font-medium">₹{product.price.toLocaleString()}</span>
                  </div>
                ) : (
                  <span className="text-2xl md:text-3xl font-black text-gray-900">₹{product.price.toLocaleString()}</span>
                )}
              </div>

              {discount?.hasDiscount && (
                <div className="inline-flex items-center gap-2 bg-yellow-accent/20 border border-yellow-accent/30 text-yellow-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
                  Offer Applied
                </div>
              )}
            </div>
          </div>


          {/* Specs Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {getDetailChips(product).map(chip => (
              <div key={chip.key} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[9px] font-bold text-gray-500 tracking-wider">
                {chip.label}
              </div>
            ))}
          </div>

          {/* Bulk Pricing Tiers */}
          {isBulk && product.bulkPricingTiers?.length > 0 && (
            <div className="mb-5 p-4 bg-yellow-accent/5 rounded-[24px] border border-yellow-accent/10">
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] mb-3">Bulk Buy Savings</h4>
              <div className="space-y-2">
                {product.bulkPricingTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-yellow-accent/10 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[12px] font-bold text-yellow-accent shadow-sm border border-yellow-accent/20">
                        {tier.minQty}
                      </span>
                      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Pieces</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-900">₹{tier.pricePerPc}/pc</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cart Interaction */}
          <div className="mt-auto pt-4 border-t border-gray-100 flex flex-row items-center gap-2 sm:gap-4">
            {/* Quantity Controls */}
            <div className="flex items-center bg-gray-50 rounded-2xl p-0.5 sm:p-1 w-[110px] sm:w-auto h-[48px] sm:h-[56px] sm:min-w-[140px]">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-900 active:scale-90"
              >
                <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <span className="flex-1 text-center font-black text-gray-900 text-sm sm:text-base">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-900 active:scale-90"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddToCart}
              className="flex-1 h-[48px] sm:h-[56px] bg-yellow-accent hover:bg-yellow-accent/90 text-black font-black uppercase tracking-wider sm:tracking-[0.2em] text-[10px] sm:text-xs rounded-2xl shadow-lg shadow-yellow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-3"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 hidden sm:block" />
              <span className="whitespace-nowrap">Add to Cart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Overlay (Lightbox) - Outside transformed container to ensure true fullscreen */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[1100] bg-black/95 flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(false);
          }}
        >
          <img
            src={getImageSrc(product.imageUrl || product.image)}
            alt={product.name}
            className="max-w-full max-h-full object-contain shadow-2xl animate-scaleUp"
          />
          <p className="absolute bottom-10 text-white/60 text-xs font-medium tracking-widest uppercase">Click anywhere to exit</p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scaleUp { animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
}
