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
import { Sparkles } from "lucide-react";

// Cloudinary hero image
const PRODUCTS_HERO_IMAGE = "https://res.cloudinary.com/dumkblp3v/image/upload/v1771307257/image_5_ympux0.webp";

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

// COLLECTIONS — Scented Sticks
const SCENTED_STICK_CATEGORIES = {
  floral: { label: "Floral" },
  woody: { label: "Woody" },
  spiritual: { label: "Spiritual" },
  fruity: { label: "Fruity" },
  mixed: { label: "Mixed" },
};

// COLLECTIONS — Perfumes / Attar
const PERFUME_CATEGORIES = {
  attar: { label: "Attar" },
  "eau-de-parfum": { label: "Eau de Parfum" },
  "body-mist": { label: "Body Mist" },
  "roll-on": { label: "Roll-On" },
};

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
    let list = products.filter((p) => {
      const matchesCategory = category ? p.category === category : true;
      const matchesSearch = s
        ? p.name?.toLowerCase().includes(s) || p.productName?.toLowerCase().includes(s)
        : true;
      const matchesPrice =
        (!priceRange.min || p.price >= Number(priceRange.min)) &&
        (!priceRange.max || p.price <= Number(priceRange.max));
      return matchesCategory && matchesSearch && matchesPrice;
    });

    switch (sortBy) {
      case "price-low": list.sort((a, b) => a.price - b.price); break;
      case "price-high": list.sort((a, b) => b.price - a.price); break;
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
  }, [products, category, search, priceRange, sortBy, activeOffers]);

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

      {/* PRODUCT TYPE TABS */}
      <div className="bg-white border-b border-gray-200 sticky top-[72px] z-40 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 sm:gap-2 overflow-x-auto hide-scrollbar py-2">
            {[
              { key: "candle", label: "Candles", emoji: "🕯️" },
              { key: "scented-stick", label: "Agarbatti", emoji: "🌸" },
              { key: "perfume", label: "Attar & Perfumes", emoji: "✨" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setProductType(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  productType === tab.key
                    ? "bg-[#8B7355] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCTS SECTION */}
      <section id="products" ref={productsSectionRef} data-section="products" className="min-h-0 bg-[#FBFAF9]">
        <div className="flex flex-col lg:flex-row">

          {/* SIDEBAR */}
          <aside
            ref={sidebarRef}
            data-section="sidebar"
            className={`hidden lg:block w-1/5 bg-white border-r border-gray-200 p-6 pt-3 sticky top-[130px] self-start max-h-[calc(100vh-140px)] overflow-y-auto rounded-xl transition-all duration-700 ${isVisible.sidebar ? "translate-x-0 opacity-100" : "translate-x-[-20px] opacity-0"}`}
          >
            <h2 className="text-xl font-semibold mb-6">
              {productType === "scented-stick" ? "Scent Family" : productType === "perfume" ? "Fragrance Type" : "Collections"}
            </h2>
            <button onClick={() => setCategory("")} className={`w-full p-3 rounded-lg text-left ${!category ? "bg-gray-100" : ""}`}>
              All {productType === "scented-stick" ? "Agarbatti" : productType === "perfume" ? "Perfumes" : "Products"}
            </button>
            {productType === "candle" && Object.entries(CANDLE_COLLECTIONS).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 ${category === key ? "bg-gray-100" : ""}`}
              >
                <img src={c.icon} alt={c.label} className="w-5 h-5" />
                <span>{c.label}</span>
              </button>
            ))}
            {productType === "scented-stick" && Object.entries(SCENTED_STICK_CATEGORIES).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 ${category === key ? "bg-gray-100" : ""}`}
              >
                <span>{c.label}</span>
              </button>
            ))}
            {productType === "perfume" && Object.entries(PERFUME_CATEGORIES).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 ${category === key ? "bg-gray-100" : ""}`}
              >
                <span>{c.label}</span>
              </button>
            ))}
            {productType === "candle" && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-yellow-accent/20 border border-yellow-accent/40 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-semibold text-gray-900">Customize your order</span>{" "}
                      with fragrance &amp; color options in your cart.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 p-4 lg:p-6 pb-4 relative z-10">

            {/* SORT ROW */}
            <div className={`relative flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 transition-all duration-700 delay-200 z-[100] ${isVisible.products ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
              <div className="text-sm text-gray-600 hidden sm:block">
                <span className="font-medium text-gray-900">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "product" : "products"} found
                {category && (
                  <span className="text-gray-500">
                    {" "}in <span className="font-medium text-gray-700">{COLLECTIONS[category]?.label || category}</span>
                  </span>
                )}
              </div>

              {/* Mobile Dropdowns Row */}
              <div className="lg:hidden flex flex-row gap-3 w-full">
                <div className="relative flex-1" data-category-dropdown>
                  <button
                    onClick={() => { setShowCategoryMenu(!showCategoryMenu); setShowSortMenu(false); }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white flex items-center justify-between gap-3 shadow-sm hover:shadow transition z-[100]"
                  >
                    <span className="text-sm font-semibold text-gray-800">
                      {productType === "candle"
                        ? (category ? CANDLE_COLLECTIONS[category]?.label || category : "All Products")
                        : productType === "scented-stick"
                        ? (category ? SCENTED_STICK_CATEGORIES[category]?.label || category : "All Agarbatti")
                        : (category ? PERFUME_CATEGORIES[category]?.label || category : "All Perfumes")}
                    </span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${showCategoryMenu ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {showCategoryMenu && (
                    <div className="absolute left-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden max-h-[400px] overflow-y-auto">
                      <button className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${!category ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}`} onClick={() => { setCategory(""); setShowCategoryMenu(false); }}>
                        All {productType === "scented-stick" ? "Agarbatti" : productType === "perfume" ? "Perfumes" : "Products"}
                      </button>
                      {productType === "candle" && Object.entries(CANDLE_COLLECTIONS).map(([key, c]) => (
                        <button key={key} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${category === key ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}`} onClick={() => { setCategory(key); setShowCategoryMenu(false); }}>
                          <img src={c.icon} alt={c.label} className="w-5 h-5" />
                          {c.label}
                        </button>
                      ))}
                      {productType === "scented-stick" && Object.entries(SCENTED_STICK_CATEGORIES).map(([key, c]) => (
                        <button key={key} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${category === key ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}`} onClick={() => { setCategory(key); setShowCategoryMenu(false); }}>
                          {c.label}
                        </button>
                      ))}
                      {productType === "perfume" && Object.entries(PERFUME_CATEGORIES).map(([key, c]) => (
                        <button key={key} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${category === key ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"}`} onClick={() => { setCategory(key); setShowCategoryMenu(false); }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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
                  <div className="py-12 text-center text-gray-700">No products found.</div>
                ) : (
                  <div ref={productsGridRef} className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
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
