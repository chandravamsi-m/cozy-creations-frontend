// src/pages/Products/Products.jsx
import React, { useEffect, useState } from "react";
import productsHeroBg from "../../assets/images/products-hero-bg.png";
import { useProducts } from "../../contexts/ProductsContext";
import ProductCard from "../../components/ProductCard";
import { getProductByIdFirestore } from "../../hooks/useProductsFirestore";
import { getImageSrc } from "../../utils/image";

// COLLECTIONS LIST
const COLLECTIONS = {
  flower: { label: "Flower", icon: "🌸" },
  animal: { label: "Animal", icon: "🐾" },
  festive: { label: "Festive", icon: "🎆" },
  special: { label: "Special", icon: "⭐" },
  glassJar: { label: "Glass Jar", icon: "🫙" },
};

// SORT OPTIONS
const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

export default function ProductsPage() {
  const {
    products: contextProducts,
    loading: contextLoading,
    error: contextError,
    loadProducts: refreshProducts,
  } = useProducts();

  // Local states
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("featured");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 8;

  // Modal + Enquiry
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [enqSubmitting, setEnqSubmitting] = useState(false);
  const [enqSuccess, setEnqSuccess] = useState(null);
  const [enqError, setEnqError] = useState(null);
  const [enqName, setEnqName] = useState("");
  const [enqPhone, setEnqPhone] = useState("");
  const [enqQuantity, setEnqQuantity] = useState(1);
  const [enqCustomization, setEnqCustomization] = useState("");

  // When Firestore products are loaded, set local lists
  useEffect(() => {
    if (contextProducts?.length > 0) {
      setProducts(contextProducts);
      setFiltered(contextProducts);
    }
  }, [contextProducts]);

  // Filter + sort logic
  useEffect(() => {
    if (!products || products.length === 0) {
      setFiltered([]);
      return;
    }

    const s = search.trim().toLowerCase();

    let list = products.filter((p) => {
      const matchesCategory = category ? p.category === category : true;
      const matchesSearch =
        s
          ? p.name?.toLowerCase().includes(s) ||
            p.productName?.toLowerCase().includes(s)
          : true;

      const matchesPrice =
        (!priceRange.min || p.price >= Number(priceRange.min)) &&
        (!priceRange.max || p.price <= Number(priceRange.max));

      return matchesCategory && matchesSearch && matchesPrice;
    });

    // Sorting logic
    switch (sortBy) {
      case "price-low":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        list.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-desc":
        list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      default:
        break;
    }

    setFiltered(list);
    setCurrentPage(1);
  }, [products, category, search, priceRange, sortBy]);

  // Firestore reload when category changes
  useEffect(() => {
    refreshProducts(category || "");
    setSearch("");
  }, [category]);

  // Load product detail from Firestore
  const openProductDetail = async (id) => {
    setModalOpen(true);
    setDetailLoading(true);
    setSelectedProduct(null);
    setDetailError(null);

    try {
      const data = await getProductByIdFirestore(id);
      if (!data) throw new Error("Not found");
      setSelectedProduct(data);
    } catch (err) {
      setDetailError("Failed to load product details");
    } finally {
      setDetailLoading(false);
    }
  };

  // Submit enquiry
  const submitEnquiry = async () => {
    setEnqError(null);
    setEnqSuccess(null);

    if (!enqName.trim()) return setEnqError("Please enter your name");
    if (!enqPhone.trim()) return setEnqError("Please enter your phone");

    const payload = {
      name: enqName.trim(),
      phone: enqPhone.trim(),
      quantity: Number(enqQuantity),
      productId: selectedProduct?.id,
      productName: selectedProduct?.name,
      productCategory: selectedProduct?.category,
      customizationRequest: enqCustomization,
      source: "website",
    };

    try {
      setEnqSubmitting(true);

      const resp = await fetch(
        import.meta.env.VITE_BACKEND_URL + "/enquiries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) throw new Error("Server error");

      setEnqSuccess("Enquiry submitted successfully!");
      setTimeout(() => setModalOpen(false), 1500);
    } catch (err) {
      setEnqError("Failed to submit enquiry");
    } finally {
      setEnqSubmitting(false);
    }
  };

  return (
    <main className="w-full bg-[#FBFAF9] font-montserrat">

      {/* HERO SECTION — unchanged UI */}
      <section className="relative w-full h-screen overflow-hidden">
        <img src={productsHeroBg} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6 md:px-[150px]">
          <div className="max-w-[461px] flex flex-col gap-6">
            <h1 className="text-white text-5xl font-normal leading-tight">
              Lighting Moments, One Candle at a Time
            </h1>
            <p className="text-white text-lg">
              Browse our lovingly made collections designed to uplift your space, calm your senses, and make gifting truly special.
            </p>
            <a
              href="#products"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-yellow-accent hover:bg-yellow-accent/90 text-black px-6 py-3 rounded-md w-fit"
            >
              Shop Now
            </a>
          </div>
        </div>
      </section>

      {/* PRODUCTS SECTION — full old UI restored */}
      <section id="products" className="min-h-screen bg-[#FBFAF9]">
        <div className="flex flex-col lg:flex-row">

          {/* SIDEBAR — unchanged */}
          <aside className="hidden lg:block w-1/5 bg-white border-r border-gray-200 p-6 sticky top-0">
            <h2 className="text-xl font-semibold mb-6">Collections</h2>

            <button
              onClick={() => setCategory("")}
              className={`w-full p-3 rounded-lg text-left ${!category ? "bg-gray-100" : ""}`}
            >
              All Products
            </button>

            {Object.entries(COLLECTIONS).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`w-full flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 ${
                  category === key ? "bg-gray-100" : ""
                }`}
              >
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </aside>

          {/* MAIN CONTENT — layout preserved */}
          <div className="flex-1 p-4 lg:p-6">

            {/* SORT ROW — unchanged UI */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <p className="text-sm text-gray-600">
                Showing {filtered.length} products
              </p>

              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white flex items-center gap-2"
                >
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </button>

                {showSortMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10 py-1">
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        onClick={() => {
                          setSortBy(o.value);
                          setShowSortMenu(false);
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* LOADING + ERROR */}
            {contextLoading && (
              <div className="py-12 text-center text-gray-600">Loading products…</div>
            )}
            {contextError && (
              <div className="py-6 text-red-600 text-center">{contextError}</div>
            )}

            {/* GRID — exactly old UI */}
            {!contextLoading && !contextError && (
              <>
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-gray-700">No products found.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                )}
              </>
            )}

            {/* PAGINATION — same UI */}
            {filtered.length > productsPerPage && (
              <div className="flex justify-center items-center gap-3 mt-10">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Prev
                </button>

                <button
                  disabled={currentPage * productsPerPage >= filtered.length}
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(Math.ceil(filtered.length / productsPerPage), p + 1)
                    )
                  }
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PRODUCT DETAIL MODAL — restored exactly */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative">

              <button
                className="absolute top-3 right-3 text-gray-600"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>

              {detailLoading ? (
                <div className="py-10 text-center">Loading product…</div>
              ) : detailError ? (
                <div className="py-10 text-center text-red-600">{detailError}</div>
              ) : selectedProduct ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* IMAGE */}
                  <div className="h-64 bg-gray-100 rounded overflow-hidden">
                    <img
                      src={getImageSrc(
                        selectedProduct.imageUrl,
                        selectedProduct.mimeType
                      )}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://via.placeholder.com/600x400?text=No+Image";
                      }}
                    />
                  </div>

                  {/* INFO */}
                  <div>
                    <h3 className="text-2xl font-bold">{selectedProduct.name}</h3>

                    <p className="text-sm text-gray-600 mt-2">
                      {selectedProduct.description}
                    </p>

                    <p className="mt-4 text-xl font-bold">₹{selectedProduct.price}</p>

                    {/* ENQUIRY FORM */}
                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Quick Enquiry</h4>

                      {enqSuccess && (
                        <div className="text-green-600 mb-2">{enqSuccess}</div>
                      )}
                      {enqError && (
                        <div className="text-red-600 mb-2">{enqError}</div>
                      )}

                      <input
                        className="w-full p-2 border rounded mb-2"
                        placeholder="Your Name"
                        value={enqName}
                        onChange={(e) => setEnqName(e.target.value)}
                      />

                      <input
                        className="w-full p-2 border rounded mb-2"
                        placeholder="Phone"
                        value={enqPhone}
                        onChange={(e) => setEnqPhone(e.target.value)}
                      />

                      <input
                        type="number"
                        className="w-full p-2 border rounded mb-2"
                        min="1"
                        value={enqQuantity}
                        onChange={(e) => setEnqQuantity(e.target.value)}
                      />

                      <textarea
                        className="w-full p-2 border rounded mb-3"
                        placeholder="Customization (optional)"
                        value={enqCustomization}
                        onChange={(e) => setEnqCustomization(e.target.value)}
                      />

                      <button
                        className="px-4 py-2 bg-yellow-accent rounded mt-1"
                        disabled={enqSubmitting}
                        onClick={submitEnquiry}
                      >
                        {enqSubmitting ? "Submitting…" : "Submit Enquiry"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
