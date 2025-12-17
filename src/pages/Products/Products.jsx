// src/pages/Products/Products.jsx
import React, { useEffect, useState } from "react";
import productsHeroBg from "../../assets/images/products-hero-bg.png";
import { useProducts } from "../../contexts/ProductsContext";
import ProductCard from "../../components/ProductCard";
import { getProductByIdFirestore } from "../../hooks/useProductsFirestore";
import { getImageSrc } from "../../utils/image";
import { fetchData, endpoints } from "../../services/api";
import { toImageSrc } from "../../utils/image";


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
    const s = String(search || "").trim().toLowerCase();
    const filteredList = products.filter((p) => {
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
      const resp = await fetch(enquiriesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Server Error: ${resp.status} ${resp.statusText} - ${txt}`);
      }

      const json = await resp.json();
      // backend returns { success: true, id: '...' }
      const createdId = json?.id ?? (json?.data && json.data.id) ?? null;

      setEnqSuccess("Enquiry submitted successfully. We will contact you soon!");
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
      setEnqError("Failed to submit enquiry");
    } finally {
      setEnqSubmitting(false);
    }
  };

  return (
    <main className="p-6 max-w-[1200px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">Products</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4 items-center">
        <label className="text-sm font-medium">Category:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="p-2 border rounded"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium ml-4">Search:</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="p-2 border rounded flex-1"
        />

        <button
          onClick={() => {
            setCategory("");
            setSearch("");
            loadProducts("");
          }}
          className="ml-2 p-2 border rounded bg-gray-100"
        >
          Reset
        </button>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="py-12 text-center text-gray-600">Loading products…</div>
      )}
      {error && <div className="py-6 text-red-600">Error: {error}</div>}

      {/* Grid */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-700">No products found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className="border rounded-lg p-3 flex flex-col"
                  role="article"
                >
                  <div className="h-48 bg-gray-100 mb-3 overflow-hidden">
                    <img
                      src={toImageSrc(p.imageUrl || p.image)}
                      alt={p.altText || p.name || "product"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://via.placeholder.com/400x300?text=No+image";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{p.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {p.category && <span className="capitalize">{p.category} • </span>}
                      {p.waxType && <span>{p.waxType} wax • </span>}
                      {p.weightGrams && <span>{p.weightGrams}g • </span>}
                      {p.burnTimeHours && <span>{p.burnTimeHours}h burn</span>}
                    </p>

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
                      src={toImageSrc(selectedProduct?.imageUrl || selectedProduct?.image)}
                      alt={selectedProduct?.altText || selectedProduct?.name || "product"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://via.placeholder.com/600x400?text=No+image";
                      }}
                    />
                  </div>

                  {/* INFO */}
                  <div>
                    <h3 className="text-2xl font-bold">{selectedProduct?.name}</h3>
                    <p className="text-sm text-gray-600 mt-2">{selectedProduct?.description || selectedProduct?.shortDesc || ""}</p>
                    <div className="mt-4 text-xl font-bold">₹{selectedProduct?.price}</div>

                    <p className="mt-4 text-xl font-bold">₹{selectedProduct.price}</p>

                    {/* ENQUIRY FORM */}
                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Quick Enquiry</h4>

                      {enqSuccess && <div className="text-green-600 mb-2">{enqSuccess}</div>}
                      {enqError && <div className="text-red-600 mb-2">{enqError}</div>}

                      <label className="block text-sm">Name</label>
                      <input className="w-full p-2 border rounded mb-2" value={enqName} onChange={(e)=>setEnqName(e.target.value)} />

                      <label className="block text-sm">Phone</label>
                      <input className="w-full p-2 border rounded mb-2" value={enqPhone} onChange={(e)=>setEnqPhone(e.target.value)} />

                      <label className="block text-sm">Quantity</label>
                      <input type="number" min={1} className="w-24 p-2 border rounded mb-2" value={enqQuantity} onChange={(e)=>setEnqQuantity(e.target.value)} />

                      <label className="block text-sm">Customization / Notes (optional)</label>
                      <textarea className="w-full p-2 border rounded mb-3" value={enqCustomization} onChange={(e)=>setEnqCustomization(e.target.value)} />

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={submitEnquiry}
                          disabled={enqSubmitting}
                          className="px-4 py-2 bg-yellow-accent text-black rounded"
                        >
                          {enqSubmitting ? "Submitting…" : "Submit Enquiry"}
                        </button>

                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">
                          Close
                        </button>
                      </div>
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
