// src/pages/admin/AdminBulkProducts.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useProducts } from "../../contexts/ProductsContext";
import { createProduct, updateProduct, deleteProduct, permanentlyDeleteProduct, generateBulkCatalogue } from "../../api/adminProducts";
import { getImageSrc } from "../../utils/image";

// Cloudinary config
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export default function AdminBulkProducts() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const { products: allProducts, loadProducts } = useProducts();

  const scrollToTop = () => {
    setTimeout(() => {
      const scrollable = document.querySelector('main.overflow-y-auto') || document.querySelector('main');
      if (scrollable) {
        scrollable.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  // Filter only bulk products
  const [bulkProducts, setBulkProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  // Form state
  const [product, setProduct] = useState({
    name: "",
    category: "",
    waxType: "soy",
    waxTypeOther: "",
    weightGrams: "",
    burnTimeHours: "",
    dimensions: "",
    dimensionUnit: "cm",
    price: "",
    quantityPack: "",
    customizableFragrance: true,
    customizableColor: true,
    altText: "",
    inventory: "",
  });

  // Bulk pricing tiers state
  const [bulkPricingTiers, setBulkPricingTiers] = useState([]);

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const toCloudinaryThumb = (url) => {
    if (!url || typeof url !== "string") return "";
    if (!url.includes("res.cloudinary.com")) return url;
    if (!url.includes("/image/upload/")) return url;
    const parts = url.split("/image/upload/");
    if (parts.length !== 2) return url;
    return `${parts[0]}/image/upload/w_600,h_450,c_fill,q_auto,f_auto/${parts[1]}`;
  };

  // Load bulk products (products with bulkPricingTiers)
  const refreshLocalProducts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch including inactive products and bypass cache (force=true)
      const all = await loadProducts("", silent, true, true);
      if (all) {
        const filtered = all.filter(p => p.bulkPricingTiers && p.bulkPricingTiers.length > 0);
        setBulkProducts(filtered);
      }
    } catch (error) {
      console.error("Error refreshing bulk products:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refreshLocalProducts();
  }, [loadProducts]);

  // Remove the old allProducts listener to avoid stale/filtered data conflicts

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showForm) {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showForm]);

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  // Compress/convert image to WebP
  const compressToWebpUnderLimit = async (file, maxBytes = MAX_UPLOAD_BYTES) => {
    if (!(file instanceof File) || !file.type.startsWith("image/")) return file;

    const imgUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = imgUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const quality = 0.95;
      let scale = 1;

      for (let attempt = 0; attempt < 8; attempt++) {
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality)
        );

        if (!blob) throw new Error("Image compression failed");
        if (blob.size <= maxBytes) {
          const webpName = (file.name || "upload")
            .replace(/\.[^.]+$/, "")
            .concat(".webp");
          return new File([blob], webpName, { type: "image/webp" });
        }

        scale *= 0.85;
      }

      throw new Error(
        `Image is still too large after compression. Please use a smaller image.`
      );
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "cozy-products");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    return data.secure_url;
  };

  const handleNewProduct = () => {
    setEditMode(false);
    setCurrentProduct(null);
    setProduct({
      name: "",
      category: "",
      waxType: "soy",
      waxTypeOther: "",
      weightGrams: "",
      burnTimeHours: "",
      dimensions: "",
      dimensionUnit: "cm",
      price: "",
      quantityPack: "",
      customizableFragrance: true,
      customizableColor: true,
      altText: "",
      inventory: "",
    });
    setBulkPricingTiers([]);
    setImageFile(null);
    setPreview(null);
    setShowForm(true);
    setMsg("");
  };

  const handleEdit = (bulkProduct) => {
    setEditMode(true);
    setCurrentProduct(bulkProduct);
    setProduct({
      name: bulkProduct.name || "",
      category: bulkProduct.category || "",
      waxType: bulkProduct.waxType || "soy",
      waxTypeOther: bulkProduct.waxTypeOther || "",
      weightGrams: bulkProduct.weightGrams || "",
      burnTimeHours: bulkProduct.burnTimeHours || "",
      dimensions: bulkProduct.dimensions || "",
      dimensionUnit: bulkProduct.dimensionUnit || "cm",
      price: bulkProduct.price || "",
      quantityPack: bulkProduct.quantityPack || "",
      customizableFragrance: bulkProduct.customizableFragrance ?? true,
      customizableColor: bulkProduct.customizableColor ?? true,
      altText: bulkProduct.altText || "",
      inventory: bulkProduct.inventory || "",
    });
    setBulkPricingTiers(bulkProduct.bulkPricingTiers || []);
    setPreview(bulkProduct.imageUrl);
    setImageFile(null);
    setShowForm(true);
    setMsg("");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditMode(false);
    setCurrentProduct(null);
    setBulkPricingTiers([]);
    setImageFile(null);
    setPreview(null);
    setMsg("");
  };

  // Tier management functions
  const addTier = () => {
    setBulkPricingTiers([...bulkPricingTiers, { minQty: "", pricePerPc: "" }]);
  };

  const removeTier = (index) => {
    setBulkPricingTiers(bulkPricingTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, field, value) => {
    const updated = [...bulkPricingTiers];
    updated[index][field] = value;
    setBulkPricingTiers(updated);
  };

  const handleGenerateCatalogue = async () => {
    if (!window.confirm("Generate and download the bulk catalogue PDF?")) return;
    setCatalogueLoading(true);
    try {
      const blob = await generateBulkCatalogue(idToken);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cozy-bulk-catalogue.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Bulk catalogue generated and downloaded!");
    } catch (error) {
      console.error("Bulk Catalogue Generation Error:", error);
      showToast("Failed to generate bulk catalogue", "error");
    } finally {
      setCatalogueLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      // Validation
      if (!product.name || !product.category) {
        throw new Error("Name and category are required");
      }
      if (!product.quantityPack || Number(product.quantityPack) <= 0) {
        throw new Error("Quantity per Pack is required and must be at least 1");
      }
      if (!product.weightGrams || Number(product.weightGrams) <= 0) {
        throw new Error("Weight is required and must be greater than 0");
      }
      if (!product.burnTimeHours || String(product.burnTimeHours).trim() === "") {
        throw new Error("Burn Time is required");
      }
      if (!product.price || Number(product.price) <= 0) {
        throw new Error("Unit price is required and must be greater than 0");
      }

      // Validate bulk pricing tiers
      if (!bulkPricingTiers || bulkPricingTiers.length === 0) {
        throw new Error("Please add at least one bulk pricing tier");
      }

      // Validate each tier
      for (let i = 0; i < bulkPricingTiers.length; i++) {
        const tier = bulkPricingTiers[i];
        if (!tier.minQty || Number(tier.minQty) <= 0) {
          throw new Error(`Tier ${i + 1}: Minimum quantity is required and must be greater than 0`);
        }
        if (!tier.pricePerPc || Number(tier.pricePerPc) <= 0) {
          throw new Error(`Tier ${i + 1}: Price per piece is required and must be greater than 0`);
        }
      }

      // Check for ascending minQty
      const sortedTiers = [...bulkPricingTiers].sort((a, b) => Number(a.minQty) - Number(b.minQty));
      for (let i = 0; i < sortedTiers.length - 1; i++) {
        if (Number(sortedTiers[i].minQty) === Number(sortedTiers[i + 1].minQty)) {
          throw new Error("Tier quantities must be unique");
        }
      }

      let imageUrl = editMode ? currentProduct.imageUrl : null;

      // Upload image if changed
      if (imageFile) {
        try {
          const compressed = await compressToWebpUnderLimit(imageFile);
          imageUrl = await uploadToCloudinary(compressed);
        } catch (err) {
          throw new Error(`Image upload failed: ${err.message}`);
        }
      }

      if (!imageUrl && !editMode) {
        throw new Error("Please upload an image");
      }

      const productData = {
        name: product.name,
        category: product.category,
        waxType: product.waxType === "other" ? product.waxTypeOther : product.waxType,
        waxTypeOther: product.waxType === "other" ? product.waxTypeOther : "",
        weightGrams: Number(product.weightGrams) || 0,
        burnTimeHours: String(product.burnTimeHours).trim(),
        dimensions: product.dimensions
          ? `${product.dimensions}${product.dimensionUnit}`
          : "",
        dimensionUnit: product.dimensionUnit,
        price: Number(product.price),
        quantityPack: Number(product.quantityPack) || 1,
        customizableFragrance: product.customizableFragrance,
        customizableColor: product.customizableColor,
        altText: product.name,
        inventory: Number(product.inventory) || 0,
        imageUrl,
        bulkPricingTiers: bulkPricingTiers.map(tier => ({
          minQty: Number(tier.minQty),
          pricePerPc: Number(tier.pricePerPc)
        })),
      };

      if (editMode) {
        await updateProduct(currentProduct.id, productData, idToken);
        showToast("Bulk product updated successfully!");
      } else {
        await createProduct(productData, idToken);
        showToast("Bulk product created successfully!");
      }

      // Reset and reload
      await refreshLocalProducts(true);
      scrollToTop();
      handleCancel();
    } catch (err) {
      setMsg(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to deactivate this bulk product?")) return;
    try {
      await deleteProduct(id, idToken);
      showToast("Bulk product deactivated successfully");
      await refreshLocalProducts(true);
      scrollToTop();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleActivate = async (id) => {
    if (!confirm("Activate this product?")) return;
    try {
      await updateProduct(id, { isActive: true }, idToken);
      showToast("Bulk product activated successfully");
      await refreshLocalProducts(true);
      scrollToTop();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm("WARNING: This will PERMANENTLY delete this bulk product. This action cannot be undone. Proceed?")) return;
    try {
      await permanentlyDeleteProduct(id, idToken);
      showToast("Bulk product permanently deleted");
      await refreshLocalProducts(true);
      scrollToTop();
    } catch (err) {
      showToast(err.message, "error");
    }
  };



  return (
    <div className="space-y-4">
      <style>
        {`
          .diagonal-strike {
            position: relative;
            display: inline-block;
          }
          .diagonal-strike::after {
            content: "";
            position: absolute;
            top: 45%;
            left: -2%;
            width: 104%;
            height: 1px;
            background: currentColor;
            transform: rotate(-12deg);
          }
          .star-qty-badge {
            position: absolute;
            top: -12px;
            right: -12px;
            width: 48px;
            height: 48px;
            background-image: url('https://res.cloudinary.com/dumkblp3v/image/upload/v1770800754/Star-badge_ttci0q.svg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 900;
            z-index: 30;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
            padding-bottom: 2px;
            transition: transform 0.3s ease;
          }
        `}
      </style>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-end gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 leading-none">Bulk Products</h2>
          <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400 mb-0.5">
            {loading ? "..." : `${bulkProducts.length} Items`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleGenerateCatalogue}
              disabled={loading || catalogueLoading}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-[10px] sm:text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 h-10"
            >
              {catalogueLoading ? (
                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "📄 Catalogue"}
            </button>
            <button
              onClick={handleNewProduct}
              className="flex-1 sm:flex-none px-4 py-2 bg-black text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider hover:bg-gray-800 transition-all active:scale-95 h-10"
            >
              + New Bulk Product
            </button>
          </div>
        </div>
      </div>

      <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="bg-transparent">

          {bulkProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-12 font-medium">No bulk products yet.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
              {bulkProducts.map((p) => {
                const firstTier = p.bulkPricingTiers && p.bulkPricingTiers.length > 0 ? p.bulkPricingTiers[0] : null;

                return (
                  <div key={p.id} className={`bg-white border border-gray-100 rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300 relative ${p.isActive === false ? "opacity-75 grayscale-[0.3]" : ""}`}>
                    {/* Product Image */}
                    <div className="w-full aspect-[4/3] rounded-xl overflow-visible mb-2 bg-gray-50 relative group">
                      <img
                        src={toCloudinaryThumb(p.imageUrl)}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110 rounded-xl"
                      />

                    </div>

                    {/* Product Info */}
                    <div className="mb-0.5 min-h-[2.8rem] flex flex-col justify-start">
                      <h3 className="font-semibold text-[clamp(13px,3.8vw,15px)] text-gray-900 leading-[1.2] whitespace-normal">{p.name}</h3>
                      {firstTier ? (
                        <p className="text-xs">
                          <span className="text-gray-600 font-medium">From {firstTier.minQty} pcs:</span>{' '}
                          <span className="text-green-600 font-semibold">₹{firstTier.pricePerPc}/pc</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">No tiers set</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] sm:text-[10px] text-gray-400 border-y border-gray-50 py-1 mb-1.5">
                      <p className="shrink-0">Cat: <span className="text-gray-900 font-medium uppercase">{p.category}</span></p>
                      <p className="shrink-0">Wax: <span className="text-gray-900 font-medium capitalize">{p.waxType}</span></p>
                      {p.dimensions && <p className="shrink-0">Size: <span className="text-gray-900 font-medium">{p.dimensions}</span></p>}
                      <p className="shrink-0">Pack: <span className="text-gray-900 font-medium">{p.quantityPack}</span></p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto pt-1 space-y-1">
                      <div className="flex flex-row gap-1">
                        <button
                          onClick={() => handleEdit(p)}
                          className="flex-1 bg-blue-600 text-white px-1 sm:px-2 py-1.5 rounded-lg font-medium text-[9px] sm:text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                          Edit
                        </button>

                        {p.isActive !== false ? (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="flex-1 bg-orange-600 text-white px-1 sm:px-2 py-1.5 rounded-lg font-medium text-[9px] sm:text-[10px] uppercase tracking-wider hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-1"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(p.id)}
                            className="flex-1 bg-green-600 text-white px-1 sm:px-2 py-1.5 rounded-lg font-medium text-[9px] sm:text-[10px] uppercase tracking-wider hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-1"
                          >
                            Activate
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handlePermanentDelete(p.id)}
                        className="w-full border border-red-200 text-red-600 py-1 rounded-lg font-bold text-[9px] uppercase tracking-tight hover:bg-red-50 transition-all"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ADD/EDIT FORM MODAL */}
        {showForm && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 outline-none"
            onClick={handleCancel}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                <h2 className="text-xl font-black text-gray-900 pr-8">
                  {editMode ? "Edit Bulk Product" : "Add New Bulk Product"}
                </h2>
                <button
                  onClick={handleCancel}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                  aria-label="Close"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Product Name */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-800">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Product Name"
                      className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                      required
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-800">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={product.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="flower">Flower</option>
                      <option value="animal">Animal</option>
                      <option value="festive">Festive</option>
                      <option value="special">Special</option>
                      <option value="glassJar">Glass Jar</option>
                    </select>
                  </div>

                  {/* Row 1: Wax Type & Specification */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">
                        Wax Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={product.waxType}
                        onChange={(e) => updateField("waxType", e.target.value)}
                        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                      >
                        <option value="soy">Soy</option>
                        <option value="gel">Gel</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      {product.waxType === "other" && (
                        <>
                          <label className="text-sm font-medium text-gray-800">
                            Specify Wax <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={product.waxTypeOther}
                            onChange={(e) => updateField("waxTypeOther", e.target.value)}
                            placeholder="Specify wax type"
                            className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10 text-sm"
                            autoFocus={product.waxTypeOther === ""}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Weight & Burn Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">
                        Weight <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={product.weightGrams}
                          onChange={(e) => updateField("weightGrams", e.target.value)}
                          placeholder="Weight"
                          className="border border-gray-300 p-2 pr-12 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">g</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">
                        Burn Time <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={product.burnTimeHours}
                          onChange={(e) => updateField("burnTimeHours", e.target.value)}
                          placeholder="Burn Time"
                          className="border border-gray-300 p-2 pr-12 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Qty per Pack & Unit Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">
                        Qty per Pack <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={product.quantityPack}
                        onChange={(e) => updateField("quantityPack", e.target.value)}
                        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                        min="1"
                        required
                        placeholder="e.g. 1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">
                        Pack Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={product.price}
                        onChange={(e) => updateField("price", e.target.value)}
                        placeholder="Price per pack"
                        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                        min="0"
                        required
                      />
                      <p className="text-[10px] text-gray-500">
                        Price of a single product
                      </p>
                    </div>
                  </div>

                  {/* Bulk Pricing Tiers Section */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-bold text-gray-900 block">
                          Bulk Pricing Tiers <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Add multiple quantity-based pricing options
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addTier}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-all"
                      >
                        + Add Tier
                      </button>
                    </div>

                    {bulkPricingTiers.length === 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-500 font-medium">
                          No tiers yet. Click "+ Add Tier" to create pricing options.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {bulkPricingTiers.map((tier, index) => {
                          const totalPrice = (Number(tier.minQty) || 0) * (Number(tier.pricePerPc) || 0);
                          const regularTotal = (Number(tier.minQty) || 0) * (Number(product.price) || 0);
                          const savings = regularTotal > 0 && totalPrice > 0 ? regularTotal - totalPrice : 0;
                          const savingsPercent = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0;

                          return (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-700">Tier {index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeTier(index)}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-gray-600 font-medium block mb-1">
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    value={tier.minQty}
                                    onChange={(e) => updateTier(index, "minQty", e.target.value)}
                                    placeholder="e.g. 15"
                                    className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-blue-500 outline-none h-9 text-sm"
                                    min="1"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-600 font-medium block mb-1">
                                    Price per Piece (₹)
                                  </label>
                                  <input
                                    type="number"
                                    value={tier.pricePerPc}
                                    onChange={(e) => updateTier(index, "pricePerPc", e.target.value)}
                                    placeholder="e.g. 54"
                                    className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-blue-500 outline-none h-9 text-sm"
                                    min="0"
                                    step="0.01"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>


                  {/* Row: Dimensions & Inventory (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">Dimensions <span className="text-gray-500 text-xs">(optional)</span></label>
                      <div className="flex items-center gap-0 border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-black h-10 bg-white">
                        <input
                          type="text"
                          value={product.dimensions}
                          onChange={(e) => updateField("dimensions", e.target.value)}
                          className="flex-1 p-2 outline-none border-none text-sm h-full"
                          placeholder="e.g. 10x5"
                        />
                        <div className="relative h-full">
                          <select
                            value={product.dimensionUnit}
                            onChange={(e) => updateField("dimensionUnit", e.target.value)}
                            className="appearance-none bg-gray-50 text-[10px] font-bold uppercase tracking-widest pl-4 pr-10 h-full border-l border-gray-100 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                            <option value="cm">cm</option>
                            <option value="mm">mm</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-3 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">Inventory <span className="text-gray-500 text-xs">(optional)</span></label>
                      <input
                        type="number"
                        value={product.inventory}
                        onChange={(e) => updateField("inventory", e.target.value)}
                        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10 text-sm"
                        placeholder="Default 100"
                      />
                    </div>
                  </div>

                  {/* Row 6: Customizations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">Customizable Fragrance</label>
                      <select
                        value={product.customizableFragrance}
                        onChange={(e) => updateField("customizableFragrance", e.target.value === "true")}
                        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                      >
                        <option value="true">Fragrance: Yes</option>
                        <option value="false">Fragrance: No</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">Customizable Color</label>
                      <select
                        value={product.customizableColor}
                        onChange={(e) => updateField("customizableColor", e.target.value === "true")}
                        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
                      >
                        <option value="true">Color: Yes</option>
                        <option value="false">Color: No</option>
                      </select>
                    </div>
                  </div>

                  {/* Image Upload - Styled like Main Products */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-800 block">
                      Product Image {!editMode && <span className="text-red-500">*</span>}
                    </label>

                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="bulk-product-image-upload"
                      />

                      <label
                        htmlFor="bulk-product-image-upload"
                        className={`
                        relative flex flex-col items-center justify-center w-full min-h-[180px] 
                        border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
                        ${preview
                            ? 'border-transparent bg-gray-100 hover:bg-gray-200'
                            : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-black/20 hover:shadow-xl'}
                      `}
                      >
                        {preview ? (
                          <div className="w-full h-full absolute inset-0">
                            <img
                              src={preview}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              alt="Preview"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[2px]">
                              <div className="bg-white/90 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-gray-900 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                Change Image
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3 p-6 text-center">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center border border-gray-100 text-gray-400 group-hover:text-black group-hover:rotate-6 transition-all duration-300">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.587-1.587a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-black uppercase tracking-widest text-gray-900">Upload Bulk Image</p>
                              <p className="text-[10px] text-gray-400 font-medium tracking-wide">PNG, JPG up to 5MB</p>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-100 mt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-black text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 active:scale-95 shadow-sm flex items-center justify-center min-h-[44px]"
                    >
                      {loading ? "Saving..." : editMode ? "Update Product" : "Create Product"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
