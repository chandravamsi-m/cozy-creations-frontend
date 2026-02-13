// src/pages/admin/AdminOffers.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CATEGORIES = [
  { value: "flower", label: "Flower Collection" },
  { value: "animal", label: "Animal Collection" },
  { value: "festive", label: "Festive Collection" },
  { value: "glassJar", label: "Glass Jar Collection" },
  { value: "special", label: "Special Collection" },
];

const toCloudinaryThumb = (url) => {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("res.cloudinary.com")) return url;
  if (!url.includes("/image/upload/")) return url;
  const parts = url.split("/image/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/image/upload/w_100,h_100,c_fill,q_auto,f_auto/${parts[1]}`;
};

const BannerPreview = ({ settings }) => {
  if (!settings.isActive) return (
    <div className="w-full bg-gray-100 rounded-lg p-8 text-center text-gray-400 border-2 border-dashed border-gray-200">
      Banner is currently disabled and won't be visible
    </div>
  );

  return (
    <div className="w-full bg-[#1a1a1a] rounded-lg overflow-hidden shadow-inner p-4 mb-8">
      {/* <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 font-bold border-b border-gray-800 pb-2">
        Live Banner Preview (on dark background)
      </p> */}
      <div className="w-full bg-transparent text-white/90 py-3 px-4 text-[10px] sm:text-xs font-medium tracking-wide border-b border-white/20">
        <div className="max-w-[1280px] mx-auto flex justify-between items-center">
          <div className="hidden md:flex items-center gap-2 opacity-80">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            <span className="font-light tracking-wider">{settings.email}</span>
          </div>

          <div className="flex-1 text-center font-normal text-white">
            <p className="tracking-[0.05em] lowercase">{settings.offerText || "your offer message here"}</p>
          </div>

          <div className="hidden md:flex items-center gap-2 opacity-80">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="font-light tracking-wider">{settings.phone}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminOffers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectionListFilter, setSelectionListFilter] = useState("all");

  const [offerSettings, setOfferSettings] = useState({
    // Banner settings
    isActive: false,
    offerText: "",
    email: "cozycreationscorner13@gmail.com",
    phone: "+91 80194 01322",

    // Discount settings
    hasDiscount: false,
    discountType: "percentage",
    discountValue: 0,

    // Targeting
    applicableToAll: true,
    applicableCategories: [],
    applicableProducts: [],

    // Constraints
    minCartValue: 0
  });

  useEffect(() => {
    fetchOfferSettings();
    fetchProducts();
  }, []);

  const fetchOfferSettings = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/admin/offers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch offer settings");

      const data = await res.json();
      setOfferSettings((prev) => ({ ...prev, ...data.offer }));
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const querySnapshot = await getDocs(collection(db, "products"));
      const productList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(p => p.isActive !== false); // Only active products

      setProducts(productList);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/admin/offers`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(offerSettings),
      });

      if (!res.ok) throw new Error("Failed to save offer settings");

      const data = await res.json();
      showToast("Offer saved successfully!");
      setOfferSettings((prev) => ({ ...prev, ...data.offer }));

      // Smooth scroll to top of the main container to show success message and preview
      setTimeout(() => {
        const scrollable = document.querySelector('main.overflow-y-auto') || document.querySelector('main');
        if (scrollable) {
          scrollable.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category) => {
    setOfferSettings((prev) => {
      const categories = prev.applicableCategories || [];
      const currentProducts = prev.applicableProducts || [];
      const categoryProductIds = products
        .filter((p) => p.category === category)
        .map((p) => p.id);

      if (categories.includes(category)) {
        // Remove category AND its products
        return {
          ...prev,
          applicableCategories: categories.filter((c) => c !== category),
          applicableProducts: currentProducts.filter((id) => !categoryProductIds.includes(id)),
        };
      } else {
        // Add category AND its products (avoiding duplicates)
        const newProducts = [...new Set([...currentProducts, ...categoryProductIds])];
        return {
          ...prev,
          applicableCategories: [...categories, category],
          applicableProducts: newProducts,
        };
      }
    });
  };

  const toggleProduct = (productId) => {
    setOfferSettings((prev) => {
      const currentProducts = prev.applicableProducts || [];
      const categories = prev.applicableCategories || [];
      const product = products.find((p) => p.id === productId);

      if (currentProducts.includes(productId)) {
        // Remove product
        const newProducts = currentProducts.filter((p) => p !== productId);
        // Also remove parent category if it was selected
        const newCategories = product
          ? categories.filter((c) => c !== product.category)
          : categories;

        return {
          ...prev,
          applicableProducts: newProducts,
          applicableCategories: newCategories,
        };
      } else {
        // Add product
        return {
          ...prev,
          applicableProducts: [...currentProducts, productId],
        };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offer settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🎁 Manage Offers & Discounts
        </h1>

        <form onSubmit={handleSave} className="space-y-6">

          {/* Banner Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Offer Banner
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {offerSettings.isActive
                  ? "Banner is currently visible on the homepage"
                  : "Banner is currently hidden"}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setOfferSettings((prev) => ({ ...prev, isActive: !prev.isActive }))
              }
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors shrink-0 p-1 ${offerSettings.isActive ? "bg-green-600" : "bg-gray-300"
                }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${offerSettings.isActive ? "translate-x-6" : "translate-x-0"
                  }`}
              />
            </button>
          </div>


          {/* Offer Text */}
          <div className="max-w-2xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offer Message
            </label>
            <textarea
              value={offerSettings.offerText}
              onChange={(e) =>
                setOfferSettings((prev) => ({ ...prev, offerText: e.target.value }))
              }
              rows={2}
              placeholder="e.g., valentine's day special - limited time offer"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>

          {/* Contact Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={offerSettings.email}
                onChange={(e) =>
                  setOfferSettings((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                type="text"
                value={offerSettings.phone}
                onChange={(e) =>
                  setOfferSettings((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>
          <BannerPreview settings={offerSettings} />


          {/* Discount Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  💰 Enable Discount
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {offerSettings.hasDiscount
                    ? "Discounts will be applied to products"
                    : "No discounts active"}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setOfferSettings((prev) => ({ ...prev, hasDiscount: !prev.hasDiscount }))
                }
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors shrink-0 p-1 ${offerSettings.hasDiscount ? "bg-green-600" : "bg-gray-300"
                  }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${offerSettings.hasDiscount ? "translate-x-6" : "translate-x-0"
                    }`}
                />
              </button>
            </div>

            {offerSettings.hasDiscount && (
              <div className="space-y-4 pl-4 border-l-4 border-blue-200">
                {/* Discount Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setOfferSettings(prev => ({ ...prev, discountType: "percentage" }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors w-full sm:w-auto sm:min-w-[180px] ${offerSettings.discountType === "percentage"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferSettings(prev => ({ ...prev, discountType: "fixed" }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors w-full sm:w-auto sm:min-w-[180px] ${offerSettings.discountType === "fixed"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                      Fixed Amount (₹)
                    </button>
                  </div>
                </div>

                {/* Discount Value */}
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offerSettings.discountValue === 0 && offerSettings.discountValue !== "0" ? "" : offerSettings.discountValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOfferSettings((prev) => ({
                        ...prev,
                        discountValue: val === "" ? "" : parseFloat(val) || 0
                      }));
                    }}
                    placeholder={offerSettings.discountType === "percentage" ? "20" : "100"}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {offerSettings.discountType === "percentage"
                      ? "Enter percentage (e.g., 20 for 20% off)"
                      : "Enter amount in rupees (e.g., 100 for ₹100 off)"}
                  </p>
                </div>

                {/* Target Products */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apply Discount To
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3">
                    <button
                      type="button"
                      onClick={() => setOfferSettings(prev => ({ ...prev, applicableToAll: true }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors w-full sm:w-auto sm:min-w-[180px] ${offerSettings.applicableToAll
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                      All Products
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferSettings(prev => ({ ...prev, applicableToAll: false }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors w-full sm:w-auto sm:min-w-[180px] ${!offerSettings.applicableToAll
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                      Specific Products/Categories
                    </button>
                  </div>

                  {!offerSettings.applicableToAll && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      {/* Categories */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Select Categories</h4>
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => toggleCategory(cat.value)}
                              className={`px-3 py-2 rounded-full text-sm transition-colors text-center w-full sm:w-auto ${(offerSettings.applicableCategories || []).includes(cat.value)
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-300 hover:border-blue-400"
                                }`}
                            >
                              <span className="sm:hidden">{cat.label.replace(" Collection", "")}</span>
                              <span className="hidden sm:inline">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Products */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Select Products {loadingProducts && "(Loading...)"}
                        </h4>

                        {/* Category Filter Bar - Desktop */}
                        <div className="hidden sm:flex flex-wrap items-center justify-start gap-1.5 mb-3 p-2 bg-white border border-gray-200 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setSelectionListFilter("all")}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all min-w-[50px] ${selectionListFilter === "all"
                              ? "bg-black text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}
                          >
                            All
                          </button>
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setSelectionListFilter(cat.value)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all min-w-[80px] ${selectionListFilter === cat.value
                                ? "bg-black text-white"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                            >
                              {cat.label.replace(" Collection", "")}
                            </button>
                          ))}
                        </div>

                        {/* Category Filter Bar - Mobile */}
                        <div className="block sm:hidden mb-3">
                          <select
                            value={selectionListFilter}
                            onChange={(e) => setSelectionListFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-gray-400 text-sm font-medium"
                          >
                            <option value="all">Filter by: All Products</option>
                            {CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                Filter by: {cat.label.replace(" Collection", "")}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                          {products
                            .filter(p => selectionListFilter === "all" || p.category === selectionListFilter)
                            .map((product) => (
                              <label
                                key={product.id}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-50 last:border-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={(offerSettings.applicableProducts || []).includes(product.id)}
                                  onChange={() => toggleProduct(product.id)}
                                  className="w-4 h-4 text-blue-600 shrink-0"
                                />
                                <div className="w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                                  <img
                                    src={toCloudinaryThumb(product.imageUrl || product.image)}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-700 truncate">{product.name}</span>
                              </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Selected: {(offerSettings.applicableProducts || []).length} product(s)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Min Cart Value */}
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Cart Value (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offerSettings.minCartValue === 0 && offerSettings.minCartValue !== "0" ? "" : offerSettings.minCartValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOfferSettings((prev) => ({
                        ...prev,
                        minCartValue: val === "" ? "" : parseFloat(val) || 0
                      }));
                    }}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave 0 for no minimum requirement
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
