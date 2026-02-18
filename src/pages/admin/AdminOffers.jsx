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
  const [isMinimized, setIsMinimized] = useState(false);

  if (!settings.isActive) return (
    <div className="w-full bg-gray-100 rounded-lg p-8 text-center text-gray-400 border-2 border-dashed border-gray-200">
      Floating card is currently disabled and won't be visible
    </div>
  );

  return (
    <div className="w-full bg-gray-100 rounded-xl p-8 relative min-h-[460px] border border-gray-200 overflow-hidden">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 font-bold border-b border-gray-200 pb-2">
        Live Floating Card Preview (Desktop View)
      </p>

      {/* Floating Card Container */}
      <div className={`absolute right-0 top-12 bottom-8 flex items-center justify-end pointer-events-none transition-all duration-500 ${!isMinimized ? 'pr-2' : ''}`}>
        {!isMinimized ? (
          <div className="w-48 sm:w-52 bg-white rounded-[1.5rem] shadow-2xl overflow-hidden border border-yellow-accent/30 pointer-events-auto transform transition-all duration-500 animate-fadeInRight flex flex-col relative group h-[340px] sm:h-[360px]">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="absolute right-2 top-2 w-5 h-5 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-lg z-10 transition-all border border-white/30 hover:bg-black/40"
            >
              ✕
            </button>
            <div className="h-1/2 bg-gray-100 relative overflow-hidden">
              {settings.bannerImageUrl ? (
                <img
                  src={settings.bannerImageUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] text-center p-4">
                  No Image Selected
                </div>
              )}
            </div>
            <div className="h-1/2 p-3 sm:p-4 flex flex-col items-center justify-between text-center bg-white">
              <div className="space-y-1 flex-1 flex flex-col justify-center">
                <span className="text-[7px] sm:text-[8px] font-black text-yellow-600 uppercase tracking-[0.2em] animate-pulse mb-1">
                  {settings.offerHeading || "Special Offer"}
                </span>
                <h3 className="text-[10px] font-black text-gray-900 leading-tight uppercase tracking-tight line-clamp-3">
                  {settings.offerText || "Limited time artisanal offer for your home"}
                </h3>
              </div>
              <button className="w-full py-2 bg-yellow-accent rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-yellow-100 hover:bg-yellow-400 transition-colors">
                Shop Now
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsMinimized(false)}
            className="w-6 py-2 bg-yellow-accent rounded-l-[2rem] flex flex-col items-center justify-center gap-1.5 shadow-xl pointer-events-auto hover:-translate-x-1 transition-transform group border-y border-l border-white/60 ring-2 ring-yellow-accent ring-offset-2 ring-offset-white"
          >
            <div className="flex flex-col items-center justify-center leading-[1.1] relative">
              {/* Subtle highlight pulse */}
              <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse scale-150 blur-lg" />

              {["O", "F", "F", "E", "R", "S"].map((char, i) => (
                <span key={i} className="text-[10px] font-bold uppercase text-black relative z-10">
                  {char}
                </span>
              ))}
            </div>
          </button>
        )}
      </div>

      <div className="absolute bottom-4 left-4 text-[10px] text-gray-400">
        * Preview shows floating behavior on the right edge
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
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🎁 Manage Offers & Discounts
        </h1>

        <form onSubmit={handleSave} className="space-y-8">
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
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors shrink-0 p-1 ${offerSettings.isActive ? "bg-green-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${offerSettings.isActive ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Banner Image & Text Group */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Image Upload */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">
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
                      {uploading ? "⌛" : "🖼️"}
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
            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">
                  Offer Heading (Animated)
                </label>
                <input
                  type="text"
                  value={offerSettings.offerHeading}
                  onChange={(e) =>
                    setOfferSettings((prev) => ({ ...prev, offerHeading: e.target.value }))
                  }
                  placeholder="e.g., Special Offer"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium shadow-inner"
                />
                <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tight">Small pulse text above the main message</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">
                  Offer Message
                </label>
                <textarea
                  value={offerSettings.offerText}
                  onChange={(e) =>
                    setOfferSettings((prev) => ({ ...prev, offerText: e.target.value }))
                  }
                  rows={4}
                  placeholder="e.g., valentine's day special - limited time offer"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium resize-none shadow-inner"
                />
              </div>
            </div>
          </div>

          <BannerPreview settings={offerSettings} />

          {/* Discount Section */}
          <div className="border-t pt-8">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span>💰</span> Enable Discount
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {offerSettings.hasDiscount ? "Discounts will be applied to products" : "No discounts active"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOfferSettings((prev) => ({ ...prev, hasDiscount: !prev.hasDiscount }))}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors shrink-0 p-1 ${offerSettings.hasDiscount ? "bg-green-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${offerSettings.hasDiscount ? "translate-x-6" : "translate-x-0"}`} />
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
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${offerSettings.applicableCategories.includes(cat.value) ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-blue-400"}`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Products Selector */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
                          <span>Select Individual Products</span>
                          <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-500 uppercase tracking-widest font-bold">
                            Total Selected: {offerSettings.applicableProducts.length}
                          </span>
                        </h4>

                        <div className="flex items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg p-1">
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

                        <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-gray-200 custom-scrollbar">
                          {products
                            .filter(p => selectionListFilter === "all" || p.category === selectionListFilter)
                            .map((p) => (
                              <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-100 group">
                                <input
                                  type="checkbox"
                                  checked={offerSettings.applicableProducts.includes(p.id)}
                                  onChange={() => toggleProduct(p.id)}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="w-8 h-8 rounded overflow-hidden bg-gray-100">
                                  <img src={toCloudinaryThumb(p.imageUrl || p.image)} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 truncate group-hover:text-blue-600">{p.name}</span>
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
                "Save Application Settings"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
