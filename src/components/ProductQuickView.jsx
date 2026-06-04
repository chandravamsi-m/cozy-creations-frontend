import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getImageSrc, optimizeCloudinaryUrl } from "../utils/image";
import { useCart } from "../hooks/useCart";
import { calculateProductDiscount, getEffectiveDiscount } from "../utils/offerUtils";
import { X, ShoppingCart, Plus, Minus, CheckCircle2, ChevronLeft, ChevronRight, Share2, Check } from "lucide-react";

import FlowerIcon from "../assets/svgs/flower-icon.svg";
import AnimalIcon from "../assets/svgs/animal-icon.svg";
import FestiveIcon from "../assets/svgs/festive-icon.svg";
import SpecialIcon from "../assets/svgs/spl-icon.svg";
import GlassJarIcon from "../assets/svgs/glass-jar-icon.svg";

export default function ProductQuickView({ product, onClose, activeOffer }) {
  const navigate = useNavigate();
  const [localQty, setLocalQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [discount, setDiscount] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  // Variant selection for Attar / Dhoop Sticks
  const isVariantProduct = ["scented-stick", "perfume"].includes(product?.productType) && Array.isArray(product?.variants) && product.variants.length > 0;
  const availableVariants = isVariantProduct ? product.variants.filter(v => v.isAvailable !== false) : [];
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const selectedVariant = isVariantProduct && availableVariants.length > 0 ? availableVariants[Math.min(selectedVariantIdx, availableVariants.length - 1)] : null;
  const { addItem, updateQuantity, removeItem, cart } = useCart();

  // Mobile swipe refs and handlers
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handlePrevImage = () => {
    setActiveIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!galleryImages || galleryImages.length <= 1) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Swipe threshold in pixels

    if (distance > minSwipeDistance) {
      handleNextImage();
    } else if (distance < -minSwipeDistance) {
      handlePrevImage();
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: product?.name || "Check out this candle!",
      text: `Check out this handcrafted candle — ${product?.name}`,
      url: shareUrl,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard not available — silently skip
      }
    }
  };

  const galleryImages = product && Array.isArray(product.images) && product.images.length > 0
    ? product.images.map(url => optimizeCloudinaryUrl(url, { width: 1000 }))
    : [optimizeCloudinaryUrl(product?.imageUrl || product?.image, { width: 1000 })].filter(Boolean);

  const isBulk = product ? (product.isBulk === true || (product.bulkPricingTiers && product.bulkPricingTiers.length > 0)) : false;

  // CATEGORY ICONS
  const categoryIcons = {
    flower: FlowerIcon,
    animal: AnimalIcon,
    festive: FestiveIcon,
    special: SpecialIcon,
    glassJar: GlassJarIcon,
  };

  // Derived: is this product already in cart? For variant products, match by productId + variantLabel
  const cartItem = cart.find((i) => {
    if (i.productId !== product?.id) return false;
    if (selectedVariant) return i.variantLabel === selectedVariant.label;
    return true;
  });
  const inCart = !!cartItem;
  const displayQty = inCart ? cartItem.quantity : localQty;

  // Prevent background scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    if (product) {
      if (activeOffer && !isVariantProduct) {
        setDiscount(getEffectiveDiscount(product, activeOffer));
      } else if (!isVariantProduct) {
        calculateProductDiscount(product).then(setDiscount);
      } else {
        setDiscount(null); // variant products don't use offer discounts
      }
      // Reset local selector whenever a new product is shown
      setLocalQty(1);
      setAdded(false);
      setActiveIndex(0);
      setSelectedVariantIdx(0);
    }
  }, [product?.id, activeOffer, isVariantProduct]);

  if (!product) return null;

  const handleAddToCart = () => {
    if (inCart) {
      // Already in cart — navigate to cart then close modal
      navigate("/cart");
      onClose();
      return;
    }
    if (isVariantProduct && !selectedVariant) {
      // Shouldn't happen if UI is correct, but guard anyway
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: selectedVariant ? selectedVariant.price : product.price,
      category: product.category || null,
      productType: product.productType || "candle",
      variantLabel: selectedVariant ? selectedVariant.label : null,
      variantPrice: selectedVariant ? selectedVariant.price : null,
      weightGrams: selectedVariant ? (selectedVariant.weightGrams || 0) : (product.weightGrams || 0),
      dimensions: product.dimensions || null,
      quantityPack: product.quantityPack || 1,
      thumbnailUrl: product.thumbnailUrl || product.imageUrl,
      quantity: localQty,
    });
    // Brief "Added!" feedback — the inCart state will then take over
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleQuantityChange = (delta) => {
    if (inCart) {
      // Directly update the cart quantity — match by productId + variantLabel
      const newQty = cartItem.quantity + delta;
      if (newQty <= 0) {
        // Remove by productId + variantLabel composite key
        removeItem(product.id, selectedVariant?.label || null);
      } else {
        updateQuantity(product.id, newQty, selectedVariant?.label || null);
      }
    } else {
      // Just move the local selector (min 1)
      setLocalQty((prev) => Math.max(1, prev + delta));
    }
  };

  const getDetailChips = (product) => {
    const chips = [];
    const type = product.productType || "candle";

    if (type === "scented-stick") {
      if (product.scentFamily) chips.push({ label: `${product.scentFamily} Scent`, key: "scentFamily" });
      if (product.burnTimeMinutes) chips.push({ label: `~${product.burnTimeMinutes}MIN BURN`, key: "burn" });
    } else if (type === "perfume") {
      if (product.scentFamily) chips.push({ label: product.scentFamily, key: "scentFamily" });
      if (product.longevityHours) chips.push({ label: `~${product.longevityHours}H LONGEVITY`, key: "longevity" });
      if (product.isAlcoholFree) chips.push({ label: "ALCOHOL FREE", key: "alcoholFree" });
    } else {
      // Default: Candle
      if (product.waxType) chips.push({ label: `${product.waxType.toUpperCase()} WAX`, key: "wax" });
      if (product.weightGrams) chips.push({ label: `${product.weightGrams}g`, key: "weight" });
      if (product.burnTimeHours) chips.push({ label: `${product.burnTimeHours}h BURN`, key: "burn" });
      if (product.dimensions) chips.push({ label: product.dimensions, key: "dims" });
    }
    return chips;
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-montserrat">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-5xl md:h-[600px] max-h-[90vh] rounded-[32px] shadow-2xl animate-scaleUp flex flex-col overflow-hidden">
        {/* Close Button - Now truly fixed relative to the modal frame */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:top-6 md:right-6 z-50 w-8 h-8 md:w-10 md:h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all active:scale-95 border border-gray-100"
        >
          <X className="w-4 h-4 md:w-5 md:h-5 text-gray-900" />
        </button>

        {/* Scrollable Area */}
        <div className="w-full h-full overflow-y-auto overflow-x-hidden md:overflow-hidden flex flex-col md:flex-row custom-scrollbar overscroll-contain">


        {/* Left: Image Section (Gallery) */}
        <div className="w-full md:w-1/2 bg-[#F8F8F5] relative group flex flex-col">
          {/* Main Large Image */}
          <div 
            className="relative w-full aspect-square md:aspect-auto md:flex-1 overflow-hidden cursor-zoom-in md:min-h-[400px] group"
            onClick={() => setIsZoomed(true)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Preload images for instant switching */}
            <div className="hidden">
              {galleryImages.map((img, i) => (
                <img key={i} src={img} alt="preload" />
              ))}
            </div>

            <img
              src={galleryImages[activeIndex]}
              alt={product.name}
              onError={(e) => {
                const original = Array.isArray(product.images) && product.images.length > activeIndex 
                  ? product.images[activeIndex] 
                  : (product.imageUrl || product.image);
                if (e.target.src !== original && original) {
                  e.target.src = original;
                }
              }}
              className="w-full h-full object-cover transition-transform duration-500"
            />

            {/* Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-11 md:h-11 bg-white/90 rounded-full flex items-center justify-center shadow-lg text-gray-800 hover:bg-white transition-all z-20 active:scale-90"
                >
                  <ChevronLeft className="w-4.5 h-4.5 md:w-6 md:h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-11 md:h-11 bg-white/90 rounded-full flex items-center justify-center shadow-lg text-gray-800 hover:bg-white transition-all z-20 active:scale-90"
                >
                  <ChevronRight className="w-4.5 h-4.5 md:w-6 md:h-6" />
                </button>
              </>
            )}
            {/* Pagination Dots */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(i);
                    }}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      activeIndex === i ? "w-4 bg-white" : "w-1 bg-white/40 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Content Section */}
        <div className="w-full md:w-1/2 p-5 md:p-8 md:overflow-y-auto bg-white flex flex-col">
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-1 font-serif flex items-start gap-2">
              <span className="flex-1">{product.name}</span>
              <button
                onClick={handleShare}
                title={copied ? "Link copied!" : "Share this product"}
                className={`shrink-0 mt-1 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  copied
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            </h2>

            {/* Price Row */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-4">
                {isVariantProduct && selectedVariant ? (
                  <span className="text-2xl md:text-3xl font-black text-gray-900">
                    ₹{selectedVariant.price.toLocaleString()}
                  </span>
                ) : discount?.hasDiscount ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl md:text-3xl font-black text-gray-900">₹{discount.discountedPrice.toLocaleString()}</span>
                    <span className="text-base text-gray-300 line-through font-medium">₹{product.price.toLocaleString()}</span>
                  </div>
                ) : (
                  <span className="text-2xl md:text-3xl font-black text-gray-900">₹{(product.price || 0).toLocaleString()}</span>
                )}
              </div>

              {!isVariantProduct && discount?.hasDiscount && (
                <div className="inline-flex items-center gap-2 bg-yellow-accent/20 border border-yellow-accent/30 text-yellow-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
                  {discount.offerName || "Offer"} Applied
                </div>
              )}
            </div>
          </div>

          {/* Variant Size Picker — Attar / Dhoop Sticks */}
          {isVariantProduct && availableVariants.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                {product.productType === "perfume" ? "Select Volume" : "Select Size"}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableVariants.map((v, idx) => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => setSelectedVariantIdx(idx)}
                    className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all ${
                      selectedVariantIdx === idx
                        ? "border-gray-900 bg-gray-900 text-white shadow-lg"
                        : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                    }`}
                  >
                    {v.label}
                    {Number(v.price) > 0 && (
                      <span className={`ml-1.5 font-medium ${selectedVariantIdx === idx ? "text-gray-300" : "text-gray-400"}`}>
                        ₹{Number(v.price).toLocaleString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Specs Chips — only show for candles or non-variant products */}
          <div className="flex flex-wrap gap-2 mb-4">
            {getDetailChips(product).map(chip => (
              <div key={chip.key} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[9px] font-bold text-gray-500 tracking-wider">
                {chip.label}
              </div>
            ))}
          </div>

          {/* Fragrance Notes (Perfume/Attar specific) */}
          {product.productType === "perfume" && product.scentNotes && (
            <div className="mb-4 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
              <h4 className="text-[10px] font-black text-purple-900 uppercase tracking-widest mb-3">Fragrance Notes</h4>
              <div className="grid grid-cols-3 gap-2">
                {product.scentNotes.top && (
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100/50 shadow-sm text-center">
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-wider mb-0.5">Top</p>
                    <p className="text-xs font-bold text-gray-700">{product.scentNotes.top}</p>
                  </div>
                )}
                {product.scentNotes.middle && (
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100/50 shadow-sm text-center">
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-wider mb-0.5">Middle</p>
                    <p className="text-xs font-bold text-gray-700">{product.scentNotes.middle}</p>
                  </div>
                )}
                {product.scentNotes.base && (
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100/50 shadow-sm text-center">
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-wider mb-0.5">Base</p>
                    <p className="text-xs font-bold text-gray-700">{product.scentNotes.base}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {product.ingredients && (
            <div className="mb-4 text-xs text-gray-500">
              <span className="font-bold text-gray-700">Ingredients: </span>
              {product.ingredients}
            </div>
          )}

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
            <div className="flex items-center bg-gray-50 rounded-2xl p-0.5 sm:p-1 w-[105px] sm:w-auto h-[44px] sm:h-[48px] sm:min-w-[130px]">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-900 active:scale-90"
              >
                <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <span className="flex-1 text-center font-black text-gray-900 text-xs sm:text-base">{displayQty}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-900 active:scale-90"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>

            {/* Add / In Cart Button */}
            {inCart ? (
              <button
                onClick={() => {
                  navigate("/cart");
                  onClose();
                }}
                className="flex-1 h-[44px] sm:h-[48px] bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-wider sm:tracking-[0.15em] text-[10px] sm:text-xs rounded-2xl shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {/* <span>✓</span> */}
                <span className="whitespace-nowrap">View Cart</span>
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                className={`flex-1 h-[44px] sm:h-[48px] font-black uppercase tracking-wider sm:tracking-[0.2em] text-[10px] sm:text-xs rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-3 ${added
                  ? "bg-green-500 text-white shadow-green-500/20"
                  : "bg-yellow-accent hover:bg-yellow-accent/90 text-black shadow-yellow-accent/20"
                  }`}
              >
                {added ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="whitespace-nowrap">Added!</span>
                  </>
                ) : (
                  <><ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 hidden sm:block" /><span className="whitespace-nowrap">Add to Cart</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Zoom Overlay (Lightbox) - Outside transformed container to ensure true fullscreen */}
      {/* Fullscreen Lightbox */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[3000] bg-black/95 flex flex-col items-center justify-between backdrop-blur-md animate-fadeIn p-4 sm:p-8 overscroll-contain"
          onClick={() => setIsZoomed(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 z-[3010] w-8 h-8 sm:w-10 sm:h-10 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center transition-all text-gray-900 shadow-xl"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Spacer for top */}
          <div className="h-8 sm:h-12 w-full shrink-0"></div>

          {/* Main Image */}
          <div 
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getImageSrc(galleryImages[activeIndex])}
              alt={product.name}
              className="max-w-full max-h-full object-contain shadow-2xl animate-scaleUp select-none"
            />
            
            {/* Lightbox Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
                  }}
                  className="absolute left-0 sm:-left-12 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center transition-all text-gray-900 shadow-xl z-[3010]"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-0 sm:-right-12 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center transition-all text-gray-900 shadow-xl z-[3010]"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails in Lightbox */}
          {galleryImages.length > 1 ? (
            <div className="w-full max-w-2xl overflow-x-auto flex gap-3 px-4 py-4 shrink-0 hide-scrollbar snap-x z-[3010] justify-center">
              {galleryImages.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(i);
                  }}
                  className={`relative w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-lg overflow-hidden snap-center transition-all border-2 ${activeIndex === i ? "border-white opacity-100 scale-105" : "border-transparent opacity-50 hover:opacity-100"}`}
                >
                  <img src={getImageSrc(imgUrl)} alt={`Thumbnail ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
             <div className="h-8 sm:h-12 w-full shrink-0"></div>
          )}
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
        .overscroll-contain { overscroll-behavior: contain; }
      `}</style>
    </div>
  );
}
