// src/pages/ProductsPage.jsx
import React, { useEffect, useState } from "react";
import { fetchData, endpoints } from "../../services/api";
import { toImageSrc } from "../../utils/image";


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

function normalizeResponse(json) {
  // backend may return { success: true, data: ... } or raw array/object
  if (!json) return null;
  if (typeof json === "object" && "data" in json) return json.data;
  return json;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Helper: fetch products list
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

  // initial load
  useEffect(() => {
    loadProducts();
  }, []);

  // filter & search reactively
  useEffect(() => {
    if (!products || products.length === 0) {
      setFiltered([]);
      return;
    }
    const s = String(search || "").trim().toLowerCase();
    const filteredList = products.filter((p) => {
      const matchesCategory = category ? p.category === category : true;
      const matchesSearch = s
        ? (p.name || "").toLowerCase().includes(s) ||
          (p.productName || "").toLowerCase().includes(s)
        : true;
      return matchesCategory && matchesSearch;
    });
    setFiltered(filteredList);
  }, [products, category, search]);

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
      console.error("Enquiry error", err);
      setEnqError(err?.message || "Failed to submit enquiry");
    } finally {
      setEnqSubmitting(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Products</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6 items-stretch sm:items-center">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-2 border rounded flex-1 sm:flex-none min-w-[120px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm font-medium whitespace-nowrap">Search:</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="p-2 border rounded flex-1"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setCategory("");
            setSearch("");
            loadProducts("");
          }}
          className="p-2 border rounded bg-gray-100 hover:bg-gray-200 transition-colors whitespace-nowrap"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{p.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {p.category && <span className="capitalize">{p.category} • </span>}
                      {p.waxType && <span>{p.waxType} wax • </span>}
                      {p.weightGrams && <span>{p.weightGrams}g • </span>}
                      {p.burnTimeHours && <span>{p.burnTimeHours}h burn</span>}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xl font-bold">₹{p.price}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openProductDetail(p.id)}
                          className="px-3 py-2 bg-white border rounded"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setModalOpen(true);
                          }}
                          className="px-3 py-2 bg-yellow-accent text-black rounded"
                        >
                          Enquire
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

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

          <div className="relative z-10 max-w-2xl w-full bg-white rounded-lg p-4 sm:p-6 mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="h-64 bg-gray-100 overflow-hidden rounded">
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

                  <div>
                    <h3 className="text-2xl font-bold">{selectedProduct?.name}</h3>
                    <p className="text-sm text-gray-600 mt-2">{selectedProduct?.description || selectedProduct?.shortDesc || ""}</p>
                    <div className="mt-4 text-xl font-bold">₹{selectedProduct?.price}</div>

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
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
