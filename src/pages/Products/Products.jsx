// src/pages/ProductsPage.jsx
import React, { useEffect, useState } from "react";
import { fetchData, endpoints } from "../../services/api";
import productsHeroBg from "../../assets/images/products-hero-bg.png";
import { useProducts } from "../../contexts/ProductsContext";
import ProductCard from "../../components/ProductCard";

/**
 * ProductsPage
 * - lists products
 * - filters by category
 * - searches by name
 * - shows product detail modal
 * - allows submitting an enquiry (POST /enquiries)
 *
 * Notes:
 * - This code is intentionally focused on functionality rather than visuals.
 * - Your fetchData returns `response.json()`; backend responses are usually:
 *   { success: true, data: [...] } so we handle both shapes below.
 */

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "flower", label: "Flower" },
  { value: "animal", label: "Animal" },
  { value: "festive", label: "Festive" },
  { value: "special", label: "Special" },
  { value: "glassJar", label: "Glass Jar" },
];

const COLLECTIONS = {
  flower: {
    label: "Flower",
    icon: "🌸",
  },
  animal: {
    label: "Animal",
    icon: "🐾",
  },
  festive: {
    label: "Festive",
    icon: "🎆",
  },
  special: {
    label: "Special",
    icon: "⭐",
  },
  glassJar: {
    label: "Glass Jar",
    icon: "🫙",
  },
};

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

function normalizeResponse(json) {
  // backend may return { success: true, data: ... } or raw array/object
  if (!json) return null;
  if (typeof json === "object" && "data" in json) return json.data;
  return json;
}

export default function ProductsPage() {
  // Use products from context (preloaded on home page)
  const { products: contextProducts, loading: contextLoading, error: contextError, loadProducts: refreshProducts } = useProducts();
  
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // New filter states
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [color, setColor] = useState("");
  const [fragrance, setFragrance] = useState("");
  const [inStock, setInStock] = useState(true);
  const [sortBy, setSortBy] = useState("featured");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 8;

  const [selectedProduct, setSelectedProduct] = useState(null); // product object or null
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Enquiry form local state
  const [enqSubmitting, setEnqSubmitting] = useState(false);
  const [enqSuccess, setEnqSuccess] = useState(null);
  const [enqError, setEnqError] = useState(null);

  // Enquiry form fields (simple)
  const [enqName, setEnqName] = useState("");
  const [enqPhone, setEnqPhone] = useState("");
  const [enqQuantity, setEnqQuantity] = useState(1);
  const [enqCustomization, setEnqCustomization] = useState("");

  // Build enquiries URL from endpoints.products base
  // endpoints.products is like https://.../api/products
  // enquiries should be https://.../api/enquiries
  const enquiriesUrl = (() => {
    try {
      const url = new URL(endpoints.products);
      // replace pathname's last segment 'products' with 'enquiries' (works if products is last)
      const parts = url.pathname.split("/").filter(Boolean); // remove empty
      if (parts.length > 0 && parts[parts.length - 1] === "products") {
        parts[parts.length - 1] = "enquiries";
      } else {
        parts.push("enquiries");
      }
      url.pathname = "/" + parts.join("/");
      return url.toString();
    } catch (e) {
      // fallback: naive replace (if endpoints.products is a simple string)
      return endpoints.products.replace(/\/+products\/?$/, "/enquiries");
    }
  })();

  // Helper: fetch products list (for category filtering)
  const loadProducts = async (cat = "") => {
    setLoading(true);
    setError(null);

    try {
      // build URL with optional category query param
      const baseUrl = endpoints.products;
      const url = new URL(baseUrl);
      if (cat) url.searchParams.set("category", cat);

      const json = await fetchData(url.toString());
      const data = normalizeResponse(json);

      if (Array.isArray(data)) {
        setProducts(data);
        setFiltered(data);
      } else {
        // unexpected shape
        setProducts([]);
        setFiltered([]);
      }
    } catch (err) {
      console.error("Failed to load products", err);
      setError(
        err?.message || "Unable to load products. Please try again later."
      );
      setProducts([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  // Use products from context if available, otherwise load
  useEffect(() => {
    if (contextProducts && contextProducts.length > 0) {
      // Use preloaded products from context
      setProducts(contextProducts);
      setFiltered(contextProducts);
      setLoading(false);
      setError(null);
    } else if (!contextLoading && contextProducts.length === 0) {
      // If context has no products and not loading, load them
      loadProducts();
    }
  }, [contextProducts, contextLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show context error if available
  useEffect(() => {
    if (contextError) {
      setError(contextError);
    }
  }, [contextError]);

  // filter & search reactively with all new filters
  useEffect(() => {
    if (!products || products.length === 0) {
      setFiltered([]);
      return;
    }
    const s = String(search || "")
      .trim()
      .toLowerCase();
    const filteredList = products.filter((p) => {
      const matchesCategory = category ? p.category === category : true;
      const matchesSearch = s
        ? (p.name || "").toLowerCase().includes(s) ||
          (p.productName || "").toLowerCase().includes(s)
        : true;
      const matchesPrice =
        (!priceRange.min || p.price >= Number(priceRange.min)) &&
        (!priceRange.max || p.price <= Number(priceRange.max));
      const matchesInStock = inStock ? true : true; // Add stock logic if available
      return (
        matchesCategory &&
        matchesSearch &&
        matchesPrice &&
        matchesInStock
      );
    });

    // Sort products
    let sortedList = [...filteredList];
    switch (sortBy) {
      case "price-low":
        sortedList.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        sortedList.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        sortedList.sort((a, b) =>
          (a.name || a.productName || "").localeCompare(b.name || b.productName || "")
        );
        break;
      case "name-desc":
        sortedList.sort((a, b) =>
          (b.name || b.productName || "").localeCompare(a.name || a.productName || "")
        );
        break;
      default:
        // Featured - keep original order
        break;
    }

    setFiltered(sortedList);
    setCurrentPage(1); // Reset to first page when filters change
  }, [products, category, search, priceRange, inStock, sortBy]);

  // When category selection changes, we can fetch server-side filtered list for accuracy
  useEffect(() => {
    // load server-side results when category changes (except empty)
    if (category === "") {
      // if clearing category, reload all products
      loadProducts("");
    } else {
      loadProducts(category);
    }
    // reset search when changing category (optional)
    setSearch("");
  }, [category]);

  // show product detail: fetch by id to ensure fresh data if needed
  const openProductDetail = async (productId) => {
    setSelectedProduct(null);
    setDetailError(null);
    setDetailLoading(true);
    setModalOpen(true);

    try {
      const url = `${endpoints.products.replace(/\/+$/, "")}/${productId}`;
      const json = await fetchData(url);
      const data = normalizeResponse(json);
      // data may be product object or { success, data: product }
      setSelectedProduct(data);
    } catch (err) {
      console.error("Failed to load product detail", err);
      setDetailError("Failed to load product details");
    } finally {
      setDetailLoading(false);
    }
  };

  // Enquiry submission logic
  const submitEnquiry = async () => {
    setEnqError(null);
    setEnqSuccess(null);

    // basic validation
    if (!enqName || enqName.trim().length < 2) {
      setEnqError("Please enter your name.");
      return;
    }
    if (!enqPhone || enqPhone.trim().length < 8) {
      setEnqError("Please enter a valid phone number.");
      return;
    }
    const qNum = Number(enqQuantity);
    if (Number.isNaN(qNum) || qNum <= 0) {
      setEnqError("Please enter a valid quantity.");
      return;
    }

    // build payload
    const payload = {
      name: enqName.trim(),
      phone: enqPhone.trim(),
      quantity: qNum,
      productId: selectedProduct?.id || null,
      productName: selectedProduct?.name || selectedProduct?.productName || "",
      productCategory: selectedProduct?.category || null,
      customizationRequest: enqCustomization || "",
      deliveryLocation: "", // optional, can be collected later
      source: "website",
    };

    try {
      setEnqSubmitting(true);

      const resp = await fetch(enquiriesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(
          `Server Error: ${resp.status} ${resp.statusText} - ${txt}`
        );
      }

      const json = await resp.json();
      // backend returns { success: true, id: '...' }
      const createdId = json?.id ?? (json?.data && json.data.id) ?? null;

      setEnqSuccess(
        "Enquiry submitted successfully. We will contact you soon!"
      );
      // reset form fields
      setEnqName("");
      setEnqPhone("");
      setEnqQuantity(1);
      setEnqCustomization("");
      // Optionally close modal after a delay
      setTimeout(() => {
        setEnqSuccess(null);
        setModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Enquiry error", err);
      setEnqError(err?.message || "Failed to submit enquiry");
    } finally {
      setEnqSubmitting(false);
    }
  };

  return (
    <main className="w-full bg-[#FBFAF9] font-montserrat">
      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={productsHeroBg} 
            alt="Products Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6 md:px-[150px] lg:px-[200px]">
          <div className="flex flex-col gap-5 sm:gap-6 md:gap-8 max-w-[461px]">
            <div className="flex flex-col gap-2 sm:gap-3 text-white">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-normal leading-tight sm:leading-snug md:leading-tight capitalize">
                Lighting Moments, One Candle at a Time
              </h1>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed max-w-[423px]">
                Browse our lovingly made collections designed to uplift your space, calm your senses, and make gifting truly special.
              </p>
            </div>
            <a
              href="#products"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('products');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="bg-yellow-accent hover:bg-yellow-accent/90 text-black px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-md sm:rounded-lg text-sm sm:text-base md:text-[15.09px] font-normal capitalize transition-colors duration-200 w-fit cursor-pointer"
            >
              Shop Now
            </a>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="bg-[#FBFAF9] min-h-screen">
        <div className="flex flex-col lg:flex-row">
          {/* Left Sidebar - Collections (Desktop) */}
          <aside className="hidden lg:block w-full lg:w-1/5 bg-white border-r border-gray-200 p-4 lg:p-6 sticky top-0 h-fit lg:max-h-screen overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Collections</h2>
            
            {/* Collections List */}
            <div className="space-y-2">
              {/* All Products Option */}
              <button
                onClick={() => {
                  setCategory("");
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                  !category ? "bg-gray-100" : ""
                }`}
              >
                <span className="font-medium text-gray-900">All Products</span>
              </button>
              
              {Object.entries(COLLECTIONS).map(([key, collection]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCategory(key);
                  }}
                  className={`w-full flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                    category === key ? "bg-gray-100" : ""
                  }`}
                >
                  <span className="text-lg">{collection.icon}</span>
                  <span className="font-medium text-gray-900">{collection.label}</span>
                </button>
              ))}
            </div>

            {/* New Arrival Section */}
            <div className="mt-8 bg-[#F5F5F0] rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">NEW ARRIVAL</h3>
              <p className="text-sm text-gray-600 mb-3">Summer Scents</p>
              <a
                href="#products"
                className="text-sm text-yellow-accent hover:underline font-medium"
              >
                Shop Now →
              </a>
            </div>
          </aside>

          {/* Mobile Collections Chips */}
          <div className="lg:hidden px-4 pt-4 pb-2 bg-[#FBFAF9] sticky top-0 z-10">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {/* All Products Chip */}
              <button
                onClick={() => {
                  setCategory("");
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !category
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 border border-gray-300"
                }`}
              >
                <span>All Products</span>
              </button>
              
              {Object.entries(COLLECTIONS).map(([key, collection]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCategory(key);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    category === key
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 border border-gray-300"
                  }`}
                >
                  <span>{collection.icon}</span>
                  <span>{collection.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-4 lg:p-6 relative z-0">
            {/* Top Filters and Sort */}
            <div className="mb-6">
              {/* Filters Row */}
              {/* <div className="flex flex-wrap gap-3 mb-4">
                <select
                  value={priceRange.min ? `${priceRange.min}-${priceRange.max || ""}` : ""}
                  onChange={(e) => {
                    const [min, max] = e.target.value.split("-");
                    setPriceRange({ min: min || "", max: max || "" });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Price Range</option>
                  <option value="0-500">₹0 - ₹500</option>
                  <option value="500-1000">₹500 - ₹1000</option>
                  <option value="1000-2000">₹1000 - ₹2000</option>
                  <option value="2000-">₹2000+</option>
                </select>

                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Color</option>
                  <option value="white">White</option>
                  <option value="cream">Cream</option>
                  <option value="yellow">Yellow</option>
                  <option value="orange">Orange</option>
                </select>

                <select
                  value={fragrance}
                  onChange={(e) => setFragrance(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Fragrance</option>
                  <option value="floral">Floral</option>
                  <option value="woody">Woody</option>
                  <option value="fresh">Fresh</option>
                  <option value="sweet">Sweet</option>
                </select>

                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>In Stock</span>
                </label>
              </div> */}

              {/* Display Info and Sort */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="text-sm text-gray-600">
                  Showing {Math.min((currentPage - 1) * productsPerPage + 1, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors flex items-center gap-2 min-w-[140px] justify-between"
                    >
                      <span>{SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Featured'}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showSortMenu && (
                      <>
                        <div
                          className="fixed inset-0"
                          onClick={() => setShowSortMenu(false)}
                        ></div>
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setSortBy(option.value);
                                setShowSortMenu(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                sortBy === option.value
                                  ? 'bg-gray-100 font-medium text-gray-900'
                                  : 'text-gray-700'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Loading / Error */}
            {(loading || contextLoading) && (
              <div className="py-12 text-center text-gray-600">Loading products…</div>
            )}
            {(error || contextError) && (
              <div className="py-6 text-red-600">Error: {error || contextError}</div>
            )}

            {/* Product Grid */}
            {!loading && !contextLoading && !error && !contextError && (
              <>
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-gray-700">
                    No products found.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                      {filtered
                        .slice(
                          (currentPage - 1) * productsPerPage,
                          currentPage * productsPerPage
                        )
                        .map((p) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            onEnquire={() => {
                              setSelectedProduct(p);
                              setModalOpen(true);
                            }}
                            onViewDetails={() => openProductDetail(p.id)}
                          />
                        ))}
                    </div>

                    {/* Pagination */}
                    {filtered.length > productsPerPage && (
                      <div className="flex justify-center items-center gap-2 mt-8">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        {Array.from({ length: Math.ceil(filtered.length / productsPerPage) }, (_, i) => i + 1)
                          .slice(0, 3)
                          .map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-4 py-2 rounded ${
                                currentPage === page
                                  ? "bg-[#F5F5F0] text-gray-900 font-medium"
                                  : "text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        
                        {Math.ceil(filtered.length / productsPerPage) > 3 && (
                          <>
                            <span className="px-2 text-gray-600">...</span>
                            <button
                              onClick={() =>
                                setCurrentPage(Math.ceil(filtered.length / productsPerPage))
                              }
                              className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100"
                            >
                              {Math.ceil(filtered.length / productsPerPage)}
                            </button>
                          </>
                        )}

                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(Math.ceil(filtered.length / productsPerPage), prev + 1)
                            )
                          }
                          disabled={currentPage >= Math.ceil(filtered.length / productsPerPage)}
                          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

      {/* Product Detail + Enquiry Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setModalOpen(false)}
          ></div>

          <div className="relative z-10 max-w-2xl w-full bg-white rounded-lg p-6">
            <button
              className="absolute top-3 right-3 text-gray-600"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            {/* If a product is selected and detail is loading we fetch detail,
                otherwise show selectedProduct (from list) */}
            {detailLoading ? (
              <div className="py-8 text-center">Loading product...</div>
            ) : detailError ? (
              <div className="py-8 text-red-600">{detailError}</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-64 bg-gray-100 overflow-hidden rounded">
                    <img
                      src={getImageSrc(
                        selectedProduct?.imageUrl || selectedProduct?.image,
                        selectedProduct?.mimeType
                      )}
                      alt={
                        selectedProduct?.altText ||
                        selectedProduct?.name ||
                        "product"
                      }
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "https://via.placeholder.com/600x400?text=No+image";
                      }}
                    />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold">
                      {selectedProduct?.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedProduct?.description ||
                        selectedProduct?.shortDesc ||
                        ""}
                    </p>
                    <div className="mt-4 text-xl font-bold">
                      ₹{selectedProduct?.price}
                    </div>

                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Quick Enquiry</h4>

                      {enqSuccess && (
                        <div className="text-green-600 mb-2">{enqSuccess}</div>
                      )}
                      {enqError && (
                        <div className="text-red-600 mb-2">{enqError}</div>
                      )}

                      <label className="block text-sm">Name</label>
                      <input
                        className="w-full p-2 border rounded mb-2"
                        value={enqName}
                        onChange={(e) => setEnqName(e.target.value)}
                      />

                      <label className="block text-sm">Phone</label>
                      <input
                        className="w-full p-2 border rounded mb-2"
                        value={enqPhone}
                        onChange={(e) => setEnqPhone(e.target.value)}
                      />

                      <label className="block text-sm">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        className="w-24 p-2 border rounded mb-2"
                        value={enqQuantity}
                        onChange={(e) => setEnqQuantity(e.target.value)}
                      />

                      <label className="block text-sm">
                        Customization / Notes (optional)
                      </label>
                      <textarea
                        className="w-full p-2 border rounded mb-3"
                        value={enqCustomization}
                        onChange={(e) => setEnqCustomization(e.target.value)}
                      />

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={submitEnquiry}
                          disabled={enqSubmitting}
                          className="px-4 py-2 bg-yellow-accent text-black rounded"
                        >
                          {enqSubmitting ? "Submitting…" : "Submit Enquiry"}
                        </button>

                        <button
                          onClick={() => setModalOpen(false)}
                          className="px-4 py-2 border rounded"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </section>
    </main>
  );
}
