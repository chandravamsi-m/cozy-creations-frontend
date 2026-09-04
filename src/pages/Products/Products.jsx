// src/pages/Products/Products.jsx
import React, { useEffect, useRef, useState } from "react";
import { optimizeCloudinaryImage, IMAGE_PRESETS } from "../../utils/imageOptimization";
import { useProducts } from "../../contexts/ProductsContext";
import ProductCard from "../../components/ProductCard";
import ProductCardSkeleton from "../../components/skeletons/ProductCardSkeleton";
import ProductQuickView from "../../components/ProductQuickView";
import { useAutoScrollFromHero } from "../../hooks/useAutoScrollFromHero";
import ScrollDownIndicator from "../../components/ScrollDownIndicator";
import { useLocation, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../lib/api";

import FlowerIcon from "../../assets/svgs/flower-icon.svg";
import AnimalIcon from "../../assets/svgs/animal-icon.svg";
import FestiveIcon from "../../assets/svgs/festive-icon.svg";
import SpecialIcon from "../../assets/svgs/spl-icon.svg";
import GlassJarIcon from "../../assets/svgs/glass-jar-icon.svg";
import usePageSEO from "../../hooks/usePageSEO";
import { Sparkles, Leaf, Flame, Droplets } from "lucide-react";

import candleBg from "../../assets/images/candle_category_bg.png";
import agarbattiBg from "../../assets/images/agarbatti_category_bg.png";
import attarBg from "../../assets/images/attar_category_bg.png";

// Cloudinary hero image
const PRODUCTS_HERO_IMAGE = "https://res.cloudinary.com/dumkblp3v/image/upload/v1788458916/ChatGPT_Image_Sep_3_2026_11_32_58_PM_hfv8pi.webp";

// COLLECTIONS LIST — Candles
const CANDLE_COLLECTIONS = {
  flower: { label: "Flower", icon: FlowerIcon },
  animal: { label: "Animal", icon: AnimalIcon },
  festive: { label: "Festive", icon: FestiveIcon },
  special: { label: "Special", icon: SpecialIcon },
  glassJar: { label: "Glass Jar", icon: GlassJarIcon },
};

// Keep legacy alias for existing references below
const COLLECTIONS = CANDLE_COLLECTIONS;

// SORT OPTIONS
const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

const getMobileSortLabel = (label) => {
  return label.replace(/^(Price|Name):\s*/i, "");
};

export default function ProductsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  usePageSEO({
    title: "Shop Candles — All Collections",
    description:
      "Browse our handcrafted candle collections — floral, animal, festive, special & glass jar. Filter by category, sort by price, and find the perfect candle for your home.",
    path: "/products",
  });

  const {
    products: contextProducts,
    loading: contextLoading,
    error: contextError,
    loadProducts: refreshProducts,
    activeOffers,
    scentedSticks: contextScentedSticks,
    scentedSticksLoading,
    perfumes: contextPerfumes,
    perfumesLoading,
  } = useProducts();

  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [productType, setProductType] = useState("candle"); // "candle" | "scented-stick" | "perfume"
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const appliedInitialCategoryRef = useRef(false);
  const [priceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("featured");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const heroContentRef = useRef(null);
  const sidebarRef = useRef(null);
  const productsSectionRef = useRef(null);
  const productsGridRef = useRef(null);
  const deepLinkAppliedRef = useRef(false);

  const [isVisible, setIsVisible] = useState({
    hero: false,
    sidebar: false,
    products: false,
  });
  const productsPerPage = 8;

  useAutoScrollFromHero({
    enabled: typeof window !== "undefined" && window.innerWidth > 768,
    targetRef: productsSectionRef,
    delayMs: 10000,
  });

  // --- Deep-link helpers ---
  // Converts a product name to a URL-safe slug: "Rose Garden Candle" → "rose-garden-candle"
  const toSlug = (name) =>
    (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const openProduct = (p) => {
    setSelectedProduct(p);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("product", toSlug(p.name));
        return next;
      },
      { replace: true }
    );
  };

  const closeProduct = () => {
    setSelectedProduct(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("product");
        return next;
      },
      { replace: true }
    );
  };

  // On mount/context-load: if ?product=<slug> in URL, open that product
  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    const slug = searchParams.get("product");
    if (!slug) return;

    // Try to resolve from the already-loaded list (zero extra reads)
    if (contextProducts && contextProducts.length > 0) {
      deepLinkAppliedRef.current = true;
      const match = contextProducts.find((p) => toSlug(p.name) === slug);
      if (match) setSelectedProduct(match);
    }
    // If contextProducts is still loading, this effect re-runs when it populates
  }, [searchParams, contextProducts]);

  useEffect(() => {
    setIsVisible((prev) => ({ ...prev, hero: true }));
  }, []);

  const checkQualifies = (product, offers) => {
    if (!offers || offers.length === 0) return false;
    return offers.some(offer => {
      if (!offer.hasDiscount) return false;
      if (offer.applicableToAll) return true;
      if (offer.applicableCategories?.includes(product.category)) return true;
      if (offer.applicableProducts?.includes(product.id)) return true;
      return false;
    });
  };

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const productsElement = document.getElementById("products");
    if (productsElement) {
      productsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = entry.target.getAttribute("data-section");
            if (section) setIsVisible((prev) => ({ ...prev, [section]: true }));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (sidebarRef.current) observer.observe(sidebarRef.current);
    if (productsSectionRef.current) observer.observe(productsSectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSortMenu && !event.target.closest("[data-sort-dropdown]")) setShowSortMenu(false);
      if (showCategoryMenu && !event.target.closest("[data-category-dropdown]")) setShowCategoryMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSortMenu, showCategoryMenu]);

  useEffect(() => {
    if (productsGridRef.current && filtered.length > 0 && !contextLoading) {
      const cards = productsGridRef.current.querySelectorAll("[data-product-card]");
      cards.forEach((card) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
      });
      cards.forEach((card, index) => {
        setTimeout(() => {
          if (card) {
            card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
          }
        }, index * 50);
      });
    }
  }, [filtered, currentPage, contextLoading]);

  // When productType or any of the product lists change, update products
  useEffect(() => {
    if (productType === "candle") {
      setProducts((contextProducts || []).map(p => ({ ...p, productType: "candle" })));
    } else if (productType === "scented-stick") {
      setProducts((contextScentedSticks || []).map(p => ({ ...p, productType: "scented-stick" })));
    } else if (productType === "perfume") {
      setProducts((contextPerfumes || []).map(p => ({ ...p, productType: "perfume" })));
    }
  }, [productType, contextProducts, contextScentedSticks, contextPerfumes]);

  // Keep a separate effect just to reset fields on actual type tab change
  const prevProductType = useRef(productType);
  useEffect(() => {
    if (prevProductType.current !== productType) {
      setCategory("");
      setSearch("");
      setCurrentPage(1);
      prevProductType.current = productType;
    }
  }, [productType]);

  useEffect(() => {
    if (!products || products.length === 0) {
      setFiltered([]);
      return;
    }
    const s = search.trim().toLowerCase();
    // For variant-based products (attar/dhoop), derive a sortable price from variants
    const getEffectivePrice = (p) => {
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        const prices = p.variants.filter(v => v.isAvailable !== false && Number(v.price) > 0).map(v => Number(v.price));
        return prices.length > 0 ? Math.min(...prices) : Infinity;
      }
      return Number(p.price) || 0;
    };
    let list = products.filter((p) => {
      // Category filter only applies to candles
      const matchesCategory = (productType === "candle" && category) ? p.category === category : true;
      const matchesSearch = s
        ? p.name?.toLowerCase().includes(s) || p.productName?.toLowerCase().includes(s)
        : true;
      const matchesPrice =
        (!priceRange.min || getEffectivePrice(p) >= Number(priceRange.min)) &&
        (!priceRange.max || getEffectivePrice(p) <= Number(priceRange.max));
      return matchesCategory && matchesSearch && matchesPrice;
    });

    switch (sortBy) {
      case "price-low": list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b)); break;
      case "price-high": list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a)); break;
      case "name-asc": list.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
      case "name-desc": list.sort((a, b) => (b.name || "").localeCompare(a.name || "")); break;
      default:
        if (activeOffers?.length > 0) {
          list.sort((a, b) => {
            const aQ = checkQualifies(a, activeOffers);
            const bQ = checkQualifies(b, activeOffers);
            if (aQ && !bQ) return -1;
            if (!aQ && bQ) return 1;
            return 0;
          });
        }
    }
    setFiltered(list);
    setCurrentPage(1);
  }, [products, category, search, priceRange, sortBy, activeOffers, productType]);

  useEffect(() => {
    refreshProducts(category || "");
    setSearch("");
  }, [category]);

  useEffect(() => {
    if (appliedInitialCategoryRef.current) return;
    const incoming = location.state?.category;
    if (incoming) {
      appliedInitialCategoryRef.current = true;
      setCategory(incoming);
    }
  }, [location.state]);

  useEffect(() => {
    const shouldSkipHero = location.state?.scrollTo === "products" && location.state?.skipHero;
    if (!shouldSkipHero) return;
    requestAnimationFrame(() => {
      const el = document.getElementById("products");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    });
  }, [location.state, location.key]);

  useEffect(() => {
    const shouldSkipHero = location.state?.scrollTo === "products" && location.state?.skipHero;
    if (shouldSkipHero) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / productsPerPage));
  const pageItems = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const items = new Set([1, totalPages]);
    for (let p = currentPage - 1; p <= currentPage + 1; p++) {
      if (p > 1 && p < totalPages) items.add(p);
    }
    const arr = Array.from(items).sort((a, b) => a - b);
    const withDots = [];
    for (let i = 0; i < arr.length; i++) {
      withDots.push(arr[i]);
      if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) withDots.push("…");
    }
    return withDots;
  })();

  return (
    <main className="w-full bg-[#FBFAF9] font-montserrat">

      {/* HERO SECTION */}
      <section className="relative w-full h-auto min-h-[50vh] md:h-screen overflow-hidden">
        <img
          src={optimizeCloudinaryImage(PRODUCTS_HERO_IMAGE, IMAGE_PRESETS.hero)}
          className="absolute inset-0 w-full h-full object-cover"
          alt="Products Hero Background"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/40" />
        <div className="relative z-10 w-full h-full flex flex-col pt-32 pb-12 sm:pt-0 sm:pb-0 sm:justify-center">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div
              ref={heroContentRef}
              className={`max-w-2xl flex flex-col transition-all duration-700 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
            >
              <p className={`text-white font-semibold text-xs uppercase tracking-wider mb-4 transition-all duration-700 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
                Find Your Perfect Glow
              </p>
              <h1 className="text-white text-4xl md:text-6xl font-bold leading-tight mb-6 transition-all duration-700 delay-100">
                Lighting Moments, <br /> <span className="text-yellow-accent">One Candle at a Time</span>
              </h1>
              <p className={`text-white/90 text-xs md:text-sm font-semibold leading-relaxed max-w-lg mb-8 transition-all duration-700 delay-200 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
                Browse our lovingly made collections designed to uplift your space, calm your senses, and make gifting truly special.
              </p>
            </div>
          </div>
        </div>
        <div className="hidden md:block">
          <ScrollDownIndicator onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })} />
        </div>
      </section>
      {/* PRODUCTS SECTION */}
      <section id="products" ref={productsSectionRef} data-section="products" className="min-h-0 bg-[#FBFAF9]">
        {/* VISUAL CATEGORY CARDS */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="flex flex-row justify-center gap-4 sm:gap-6">
            {[
              {
                key: "candle",
                title: "Aromatic Candles",
                subtitle: "Sensory Light & Warmth",
                bg: candleBg,
              },
              {
                key: "scented-stick",
                title: "Handcrafted Dhoop",
                subtitle: "Natural Sacred Incense",
                bg: agarbattiBg,
              },
              {
                key: "perfume",
                title: "Luxury Attars",
                subtitle: "Pure Alcohol-Free Oils",
                bg: attarBg,
              },
            ].map((card) => {
              const isActive = productType === card.key;
              return (
                <button
                  key={card.key}
                  onClick={() => {
                    setProductType(card.key);
                    if (card.key !== "candle") {
                      setCategory("");
                    }
                    const el = document.getElementById("products");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={`relative w-[30%] max-w-[120px] sm:max-w-[160px] md:max-w-[192px] aspect-square rounded-2xl overflow-hidden group text-left transition-all duration-500 shadow-md flex-shrink-0 ${
                    isActive 
                      ? "ring-4 ring-yellow-accent shadow-xl scale-[1.02]" 
                      : "hover:scale-[1.01] hover:shadow-lg"
                  }`}
                >
                  {/* Background Image */}
                  <img
                    src={card.bg}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  
                  {/* Dark Overlays */}
                  <div className={`absolute inset-0 transition-opacity duration-500 bg-gradient-to-t from-black/80 via-black/40 to-transparent ${
                    isActive ? "opacity-95" : "opacity-80 group-hover:opacity-90"
                  }`} />

                  {/* Card Border glow / active effect */}
                  {isActive && (
                    <div className="absolute inset-0 border-2 border-yellow-accent rounded-2xl pointer-events-none" />
                  )}

                  {/* Content */}
                  <div className="absolute inset-0 p-3 sm:p-4 md:p-5 flex flex-col justify-end">
                    <span className={`text-[8px] md:text-[10px] uppercase tracking-widest font-semibold mb-0.5 sm:mb-1 transition-colors ${
                      isActive ? "text-yellow-accent" : "text-gray-300 group-hover:text-yellow-accent"
                    }`}>
                      {isActive ? "Selected" : "Explore"}
                    </span>
                    <h3 className="text-white text-xs sm:text-base md:text-lg font-bold tracking-wide leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-white/80 text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium hidden sm:block">
                      {card.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col lg:flex-row">

          {/* SIDEBAR */}
          <aside
            ref={sidebarRef}
            data-section="sidebar"
            className={`hidden lg:block w-1/5 bg-white border-r border-gray-200 p-6 pt-3 sticky top-[72px] self-start max-h-[calc(100vh-90px)] flex flex-col justify-between overflow-y-auto rounded-xl transition-all duration-700 ${isVisible.sidebar ? "translate-x-0 opacity-100" : "translate-x-[-20px] opacity-0"}`}
          >
            <div>
              <h2 className={`text-xl font-semibold ${productType === "candle" ? "mb-6" : "mb-2"}`}>
                {productType === "candle" ? "Collections" : productType === "scented-stick" ? "Dhoop Sticks" : "Attar"}
              </h2>
              {productType !== "candle" && (
                <p className="text-sm text-gray-500 leading-relaxed mb-2">
                  {productType === "scented-stick"
                    ? "Handcrafted Dhoop Sticks & Agarbatti. Available in multiple sizes."
                    : "Pure Attar & Natural Perfumes. Available in multiple volumes."}
                </p>
              )}
              {productType === "candle" && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => setCategory("")} className={`w-full p-3 rounded-lg text-left ${!category ? "bg-gray-100" : ""}`}>
                    All Products
                  </button>
                  {Object.entries(CANDLE_COLLECTIONS).map(([key, c]) => (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 ${category === key ? "bg-gray-100" : ""}`}
                    >
                      <img src={c.icon} alt={c.label} className="w-5 h-5" />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              {productType === "candle" && (
                <div className="bg-yellow-accent/20 border border-yellow-accent/40 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-semibold text-gray-900">Customize your order</span>{" "}
                      with fragrance &amp; color options in your cart.
                    </p>
                  </div>
                </div>
              )}
              {productType === "scented-stick" && (
                <div className="flex flex-col gap-3">
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Leaf className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700 leading-relaxed">
                        <span className="font-semibold text-gray-900">Hand-Rolled & Natural.</span>{" "}
                        Crafted with pure ingredients for a calming atmosphere.
                      </p>
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Flame className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700 leading-relaxed">
                        <span className="font-semibold text-gray-900">Long-Lasting Burn.</span>{" "}
                        Slow-burning natural binders ensure a lasting fragrance in your space.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {productType === "perfume" && (
                <div className="flex flex-col gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Droplets className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700 leading-relaxed">
                        <span className="font-semibold text-gray-900">100% Alcohol-Free.</span>{" "}
                        Gentle on the skin and formulated for a rich, lingering scent.
                      </p>
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700 leading-relaxed">
                        <span className="font-semibold text-gray-900">Artisan Crafted.</span>{" "}
                        Created using traditional methods for authentic fragrance profiles.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 p-4 lg:p-6 pb-4 relative z-10">

            {/* SORT ROW */}
            <div className={`relative flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 transition-all duration-700 delay-200 z-[100] ${isVisible.products ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
              <div className="text-sm text-gray-600 hidden sm:block whitespace-nowrap shrink-0">
                <span className="font-medium text-gray-900">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "product" : "products"} found
                {category && (
                  <span className="text-gray-500">
                    {" "}in <span className="font-medium text-gray-700">{COLLECTIONS[category]?.label || category}</span>
                  </span>
                )}
              </div>

              {/* Mobile Dropdowns Row */}
              <div className="lg:hidden flex flex-row gap-3 w-full sm:w-auto sm:min-w-[320px] sm:max-w-[400px]">
                {/* Category dropdown only for candles */}
                {productType === "candle" && (
                  <div className="relative flex-1" data-category-dropdown>
                    <button
                      onClick={() => { setShowCategoryMenu(!showCategoryMenu); setShowSortMenu(false); }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white flex items-center justify-between gap-3 shadow-sm hover:shadow transition z-[100]"
                    >
                      <span className="text-sm font-semibold text-gray-800">
                        {category ? CANDLE_COLLECTIONS[category]?.label || category : "All Products"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-500 transition-transform ${showCategoryMenu ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {showCategoryMenu && (
                      <div className="absolute left-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden max-h-[400px] overflow-y-auto">
                        <button className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${!category ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}`} onClick={() => { setCategory(""); setShowCategoryMenu(false); }}>
                          All Products
                        </button>
                        {Object.entries(CANDLE_COLLECTIONS).map(([key, c]) => (
                          <button key={key} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${category === key ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}`} onClick={() => { setCategory(key); setShowCategoryMenu(false); }}>
                            <img src={c.icon} alt={c.label} className="w-5 h-5" />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="relative flex-1" data-sort-dropdown>
                  <button
                    onClick={() => { setShowSortMenu(!showSortMenu); setShowCategoryMenu(false); }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white flex items-center justify-between gap-3 shadow-sm hover:shadow transition z-[100]"
                  >
                    <span className="text-sm font-semibold text-gray-800">
                      {getMobileSortLabel(SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "")}
                    </span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${showSortMenu ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden">
                      {SORT_OPTIONS.map((o) => (
                        <button key={o.value} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${o.value === sortBy ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}`} onClick={() => { setSortBy(o.value); setShowSortMenu(false); }}>
                          {getMobileSortLabel(o.label)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Sort */}
              <div className="hidden lg:block relative" data-sort-dropdown>
                <button
                  onClick={() => { setShowSortMenu(!showSortMenu); setShowCategoryMenu(false); }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white flex items-center justify-between gap-3 shadow-sm hover:shadow transition z-[100]"
                >
                  <span className="text-sm font-medium text-gray-800">
                    Sort: <span className="font-semibold">{SORT_OPTIONS.find((o) => o.value === sortBy)?.label}</span>
                  </span>
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${showSortMenu ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden">
                    {SORT_OPTIONS.map((o) => (
                      <button key={o.value} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${o.value === sortBy ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}`} onClick={() => { setSortBy(o.value); setShowSortMenu(false); }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Loading & Error */}
            {(productType === "candle" ? contextLoading : productType === "scented-stick" ? scentedSticksLoading : perfumesLoading) && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            )}
            {contextError && <div className="py-6 text-red-600 text-center">{contextError}</div>}

            {/* GRID */}
            {!contextLoading && !contextError && (
              <>
                {filtered.length === 0 ? (
                  <div className="py-16 sm:py-24 px-4 flex flex-col items-center justify-center text-center w-full">
                    {(productType === "scented-stick" || productType === "perfume") ? (
                      <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-50 flex items-center justify-center">
                          {productType === "scented-stick" ? (
                            <Leaf className="w-8 h-8 text-yellow-600" strokeWidth={1.5} />
                          ) : (
                            <Sparkles className="w-8 h-8 text-yellow-600" strokeWidth={1.5} />
                          )}
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Coming Soon</h3>
                        <p className="text-sm sm:text-base text-gray-500">
                          We are crafting the perfect {productType === "scented-stick" ? "natural dhoop sticks" : "luxury attars"} for you. Stay tuned for our official launch!
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 mb-4">No products found matching your criteria.</p>
                        <button 
                          onClick={() => { setCategory(""); setSearch(""); setSortBy("featured"); }} 
                          className="text-sm font-semibold text-yellow-600 hover:text-yellow-700 transition-colors"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div ref={productsGridRef} className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                    {filtered
                      .slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
                      .map((p) => (
                        <div key={p.id} data-product-card>
                          <ProductCard
                            product={p}
                            activeOffer={activeOffers}
                            onOpenQuickView={() => openProduct(p)}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

            {/* PAGINATION */}
            {filtered.length > productsPerPage && (
              <div className="flex flex-col items-center gap-3 mt-6 pb-2">
                <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-white border border-gray-200 rounded-full px-1.5 py-1.5 shadow-sm">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="w-9 h-9 rounded-full grid place-items-center text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page">
                    <span className="text-lg leading-none">‹</span>
                  </button>
                  {pageItems.map((it, idx) =>
                    it === "…" ? (
                      <span key={`dots-${idx}`} className="w-9 h-9 rounded-full grid place-items-center text-gray-400 select-none">…</span>
                    ) : (
                      <button key={it} onClick={() => setCurrentPage(it)} className={`w-9 h-9 rounded-full text-[13px] font-medium transition ${it === currentPage ? "bg-[#8B7355] text-white shadow-sm" : "text-gray-700 hover:bg-gray-50"}`} aria-current={it === currentPage ? "page" : undefined}>
                        {it}
                      </button>
                    )
                  )}
                  <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="w-9 h-9 rounded-full grid place-items-center text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page">
                    <span className="text-lg leading-none">›</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* QUICK VIEW MODAL */}
      {selectedProduct && (
        <ProductQuickView
          product={selectedProduct}
          activeOffer={activeOffers}
          onClose={closeProduct}
        />
      )}
    </main>
  );
}
