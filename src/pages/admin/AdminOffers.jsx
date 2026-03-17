// src/pages/admin/AdminOffers.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Gift, Loader2, Image as ImageIcon, Coins, ChevronDown } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CATEGORIES = [
  { value: "flower", label: "Flower" },
  { value: "animal", label: "Animal" },
  { value: "festive", label: "Festive" },
  { value: "glassJar", label: "Glass Jar" },
  { value: "special", label: "Special" },
];

const toCloudinaryThumb = (url) => {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("res.cloudinary.com")) return url;
  if (!url.includes("/image/upload/")) return url;
  const parts = url.split("/image/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/image/upload/w_100,h_100,c_fill,q_auto,f_auto/${parts[1]}`;
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
    offerHeading: "Special Offer",
    offerText: "",
    email: "cozycreationscorner13@gmail.com",
    phone: "+91 80194 01322",
    bannerImageUrl: "",

    // Discount settings
    hasDiscount: false,
    discountType: "percentage",
    discountValue: 0,

    // Targeting
    applicableToAll: true,
    applicableCategories: [],
    applicableProducts: [],
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

  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image too large (max 5MB)", "error");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setOfferSettings(prev => ({ ...prev, bannerImageUrl: data.secure_url }));
      showToast("Image uploaded successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to upload image", "error");
    } finally {
      setUploading(false);
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
    <div className="p-0 sm:p-5 relative">
      <div className="p-4 sm:p-6 bg-transparent sm:bg-white sm:rounded-2xl sm:shadow-md sm:border sm:border-gray-100">
        <h1 className="text-xl font-black text-gray-900 mb-5 flex items-center gap-2">
          <Gift className="w-6 h-6 text-yellow-500" /> Manage Offers & Discounts
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 p-1 ${offerSettings.isActive ? "bg-green-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${offerSettings.isActive ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Banner Image & Text Group */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Image Upload */}
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-[0.2em]">
                Banner Image
              </label>
              <div className="relative group aspect-[4/5] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-blue-400">
                {offerSettings.bannerImageUrl ? (
                  <>
                    <img
                      src={offerSettings.bannerImageUrl}
                      className="w-full h-full object-cover"
                      alt="Offer Banner"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                        Change Image
                        <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <ImageIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{uploading ? "Uploading..." : "Click to Upload"}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter mt-1">Recommended: 400x500px</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            {/* Offer Text & Heading */}
            <div className="md:col-span-2 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-[0.2em]">
                  Offer Heading (Animated)
                </label>
                <input
                  type="text"
                  value={offerSettings.offerHeading}
                  onChange={(e) =>
                    setOfferSettings((prev) => ({ ...prev, offerHeading: e.target.value }))
                  }
                  placeholder="e.g., Special Offer"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium shadow-inner"
                />
                <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tight">Small pulse text above the main message</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-[0.2em]">
                  Offer Message
                </label>
                <textarea
                  value={offerSettings.offerText}
                  onChange={(e) =>
                    setOfferSettings((prev) => ({ ...prev, offerText: e.target.value }))
                  }
                  rows={4}
                  placeholder="e.g., valentine's day special - limited time offer"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium resize-none shadow-inner"
                />
              </div>
            </div>
          </div>



          {/* Discount Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-blue-600" /> Enable Discount
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {offerSettings.hasDiscount ? "Discounts will be applied to products" : "No discounts active"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOfferSettings((prev) => ({ ...prev, hasDiscount: !prev.hasDiscount }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 p-1 ${offerSettings.hasDiscount ? "bg-green-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${offerSettings.hasDiscount ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {offerSettings.hasDiscount && (
              <div className="space-y-6 pl-4 border-l-4 border-blue-200">
                {/* Discount Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={() => setOfferSettings(prev => ({ ...prev, discountType: "percentage" }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors min-w-[180px] ${offerSettings.discountType === "percentage" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 hover:border-gray-400"}`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferSettings(prev => ({ ...prev, discountType: "fixed" }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors min-w-[180px] ${offerSettings.discountType === "fixed" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 hover:border-gray-400"}`}
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
                </div>

                {/* Targeting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apply Discount To
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setOfferSettings(prev => ({ ...prev, applicableToAll: true }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors min-w-[180px] ${offerSettings.applicableToAll ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 hover:border-gray-400"}`}
                    >
                      All Products
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferSettings(prev => ({ ...prev, applicableToAll: false }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors min-w-[180px] ${!offerSettings.applicableToAll ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 hover:border-gray-400"}`}
                    >
                      Specific Products
                    </button>
                  </div>

                  {!offerSettings.applicableToAll && (
                    <div className="space-y-6 bg-gray-50 p-4 rounded-xl">
                      {/* Categories Selector */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Categories</h4>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => toggleCategory(cat.value)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border uppercase tracking-wider whitespace-nowrap ${offerSettings.applicableCategories.includes(cat.value) ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white border-gray-200 text-gray-500 hover:border-blue-400"}`}
                            >
                              {cat.label.replace(" Collection", "")}
                            </button>
                          ))}
                        </div>

                      </div>

                      {/* Products Selector */}
                      <div>
                        <h4 className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Individual Products</span>
                          <span className="text-[9px] bg-blue-100 px-2 py-0.5 rounded text-blue-700 uppercase tracking-widest font-black">
                            {offerSettings.applicableProducts.length} SELECTED
                          </span>
                        </h4>

                        {/* Filter Tabs / Dropdown */}
                        <div className="mb-3">
                          {/* Desktop: Tabs */}
                          <div className="hidden sm:flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => setSelectionListFilter("all")}
                              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${selectionListFilter === "all" ? "bg-black text-white" : "hover:bg-gray-100 text-gray-500"}`}
                            >
                              All
                            </button>
                            {CATEGORIES.map(cat => (
                              <button
                                key={cat.value}
                                type="button"
                                onClick={() => setSelectionListFilter(cat.value)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${selectionListFilter === cat.value ? "bg-black text-white" : "hover:bg-gray-100 text-gray-500"}`}
                              >
                                {cat.label.split(" ")[0]}
                              </button>
                            ))}
                          </div>

                          {/* Mobile: Filter Dropdown */}
                          <div className="sm:hidden relative">
                            <select
                              value={selectionListFilter}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                              onChange={(e) => setSelectionListFilter(e.target.value)}
                            >
                              <option value="all">All</option>
                              {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                  {cat.label}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>


                        <div className="grid max-h-56 overflow-y-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 bg-white p-2 rounded-xl border border-gray-200 custom-scrollbar">
                          {products
                            .filter(p => selectionListFilter === "all" || p.category === selectionListFilter)
                            .map((p) => (
                              <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-100 group">
                                <input
                                  type="checkbox"
                                  checked={offerSettings.applicableProducts.includes(p.id)}
                                  onChange={() => toggleProduct(p.id)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="w-6 h-6 rounded overflow-hidden bg-gray-100 shrink-0">
                                  <img src={toCloudinaryThumb(p.imageUrl || p.image)} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-700 truncate group-hover:text-blue-600">{p.name}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-8 py-3 rounded-xl transition-all font-bold uppercase tracking-widest text-xs disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-100 active:scale-95"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div >
    </div >
  );
}
