// src/pages/admin/AdminBulkProducts.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useProducts } from "../../contexts/ProductsContext";
import { updateProduct, deleteProduct, permanentlyDeleteProduct, generateBulkCatalogue, getCatalogueStatus } from "../../api/adminProducts";
import ProductForm from "../../components/admin/ProductForm";
import AdminProductQuickView from "../../components/admin/AdminProductQuickView";
import ConfirmModal from "../../components/ConfirmModal";
import { Loader2, FileText, Truck, Pencil, Trash2, Package } from "lucide-react";
import { optimizeCloudinaryUrl } from "../../utils/image";

// Cloudinary config
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export default function AdminBulkProducts() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const { 
    products: allProducts, 
    loadProducts,
    catalogueLoading,
    catalogueProgress,
    catalogueType,
    startCatalogueGeneration
  } = useProducts();

  const [showEditModal, setShowEditModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [imageFiles, setImageFiles] = useState([null, null, null, null, null]);
  const [previews, setPreviews] = useState([null, null, null, null, null]);
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
  });

  const [bulkPricingTiers, setBulkPricingTiers] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

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
  const [loading, setLoading] = useState(false);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "default",
    confirmText: "Confirm"
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const toCloudinaryThumb = (url) => {
    return optimizeCloudinaryUrl(url, { width: 600, height: 450 });
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

  const handleOpenEditModal = (p) => {
    setEditingProductId(p.id);
    setProduct({
      name: p.name || "",
      category: p.category || "",
      waxType: p.waxType || "soy",
      waxTypeOther: p.waxTypeOther || "",
      weightGrams: String(p.weightGrams ?? ""),
      burnTimeHours: p.burnTimeHours || "",
      dimensions: p.dimensions ? p.dimensions.replace(/cm|mm/gi, "") : "",
      dimensionUnit: p.dimensionUnit || "cm",
      price: String(p.price ?? ""),
      quantityPack: String(p.quantityPack ?? ""),
      customizableFragrance: p.customizableFragrance !== false,
      customizableColor: p.customizableColor !== false,
      altText: p.altText || "",
    });
    setBulkPricingTiers(
        (p.bulkPricingTiers || []).map((tier) => ({
          minQty: String(tier.minQty ?? ""),
          pricePerPc: String(tier.pricePerPc ?? ""),
        }))
      );
    const initialPreviews = [null, null, null, null, null];
    if (Array.isArray(p.images) && p.images.length > 0) {
      p.images.slice(0, 5).forEach((url, i) => initialPreviews[i] = url);
    } else if (p.imageUrl) {
      initialPreviews[0] = p.imageUrl;
    }
    setPreviews(initialPreviews);
    setImageFiles([null, null, null, null, null]);
    setShowEditModal(true);
  };

  // Keep QuickView in sync with master list
  useEffect(() => {
    if (quickViewProduct) {
      const updated = bulkProducts.find(p => p.id === quickViewProduct.id);
      if (updated) setQuickViewProduct(updated);
    }
  }, [bulkProducts]);

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingProductId(null);
    setImageFiles([null, null, null, null, null]);
    setPreviews([null, null, null, null, null]);
  };

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const newFiles = [...imageFiles];
      newFiles[index] = file;
      setImageFiles(newFiles);

      const newPreviews = [...previews];
      newPreviews[index] = URL.createObjectURL(file);
      setPreviews(newPreviews);
    }
  };

  const removeImage = (index) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    newFiles.push(null);
    setImageFiles(newFiles);

    const newPreviews = [...previews];
    if (newPreviews[index] && newPreviews[index].startsWith("blob:")) {
      URL.revokeObjectURL(newPreviews[index]);
    }
    newPreviews.splice(index, 1);
    newPreviews.push(null);
    setPreviews(newPreviews);
  };

  const compressToWebpUnderLimit = async (file, maxBytes = MAX_UPLOAD_BYTES) => {
    if (!(file instanceof File) || !file.type.startsWith("image/")) return file;
    
    // If it's already a small WebP, skip processing
    if (file.type === "image/webp" && file.size <= maxBytes) return file;

    const imgUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = imgUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Target a professional but efficient resolution (Max 1920px)
      const MAX_DIM = 1920;
      let scale = 1;
      if (img.naturalWidth > MAX_DIM || img.naturalHeight > MAX_DIM) {
        scale = MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight);
      }

      // 0.85 quality is the sweet spot for WebP (indistinguishable but fast/small)
      const quality = 0.85; 
      
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality)
      );
      
      if (!blob) throw new Error("Image compression failed");

      // If still too large (rare with 1920px/0.85), do one more aggressive pass
      if (blob.size > maxBytes) {
        const smallerBlob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/webp", 0.6)
        );
        return new File([smallerBlob || blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
      }

      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  const uploadToCloudinary = async (file) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(url, { method: "POST", body: form });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const cloudinaryMsg = data?.error?.message || data?.message || `Upload failed (HTTP ${res.status})`;
      throw new Error(cloudinaryMsg);
    }
    if (!data?.secure_url) throw new Error("Image upload failed: missing secure_url from Cloudinary");
    return data.secure_url;
  };

  const addTier = () => {
    setBulkPricingTiers([...bulkPricingTiers, { minQty: "", pricePerPc: "" }]);
  };

  const removeTier = (index) => {
    setBulkPricingTiers(bulkPricingTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, field, value) => {
    const newTiers = [...bulkPricingTiers];
    newTiers[index][field] = value;
    setBulkPricingTiers(newTiers);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormMsg("");
    setFormLoading(true);

    try {
      if (!product.dimensions) {
        setFormMsg("Dimensions are required.");
        setFormLoading(false);
        return;
      }

      const uploadPromises = previews.map(async (previewUrl, index) => {
        if (!previewUrl) return null;
        const file = imageFiles[index];
        if (file) {
          const fileToUpload = await compressToWebpUnderLimit(file, MAX_UPLOAD_BYTES);
          return await uploadToCloudinary(fileToUpload);
        }
        return previewUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const finalImages = uploadedUrls.filter(url => url !== null);

      if (finalImages.length === 0) {
        showToast("Please select at least a primary product image.", "error");
        setFormLoading(false);
        return;
      }

      const imageUrl = finalImages[0];
      const { waxTypeOther, ...productWithoutWaxTypeOther } = product;

      const payload = { 
        ...productWithoutWaxTypeOther,
        dimensions: product.dimensions ? `${product.dimensions.replace(/\s*(cm|mm)$/i, "")}${product.dimensionUnit || "cm"}` : "",
        waxType: product.waxType === "other" ? (waxTypeOther || "other") : product.waxType,
        imageUrl,
        thumbnailUrl: imageUrl,
        images: finalImages,
        bulkPricingTiers 
      };

      await updateProduct(editingProductId, payload, idToken);
      showToast("Product updated successfully!");

      // Update quick view state if it's open for this product
      if (quickViewProduct && quickViewProduct.id === editingProductId) {
        setQuickViewProduct(prev => ({ ...prev, ...payload }));
      }

      handleCloseEditModal();
      refreshLocalProducts(true);
    } catch (error) {
      console.error("Update error:", error);
      showToast(error.message || "Failed to update product", "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenerateCatalogue = () => {
    setConfirmModal({
      isOpen: true,
      title: "Generate Bulk Catalogue",
      message: "This will generate and download the bulk pricing catalogue PDF. Proceed?",
      type: "default",
      confirmText: "Download",
      onConfirm: () => startCatalogueGeneration('bulk', idToken, showToast)
    });
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Deactivate Bulk Product",
      message: "Are you sure you want to deactivate this bulk product? It will no longer be visible to customers.",
      type: "danger",
      confirmText: "Deactivate",
      onConfirm: async () => {
        try {
          await deleteProduct(id, idToken);
          showToast("Bulk product deactivated successfully");
          await refreshLocalProducts(true);
          scrollToTop();
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    });
  };

  const handleActivate = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Activate Bulk Product",
      message: "This product will become visible to customers again. Proceed?",
      type: "success",
      confirmText: "Activate",
      onConfirm: async () => {
        try {
          await updateProduct(id, { isActive: true }, idToken);
          showToast("Bulk product activated successfully");
          await refreshLocalProducts(true);
          scrollToTop();
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    });
  };

  const handlePermanentDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanent Delete",
      message: "WARNING: This will PERMANENTLY delete this bulk product. This action cannot be undone. Proceed?",
      type: "danger",
      confirmText: "Delete Permanently",
      onConfirm: async () => {
        try {
          await permanentlyDeleteProduct(id, idToken);
          showToast("Bulk product permanently deleted");
          await refreshLocalProducts(true);
          scrollToTop();
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    });
  };

  return (
    <div className="space-y-4 font-sans">
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
        `}
      </style>

      <div className="flex flex-row items-center justify-between gap-4 px-1 pt-1 mb-6">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-emerald-600" />
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 leading-none">Bulk Products</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
              {loading ? "..." : `${bulkProducts.length} Volume Products`}
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-2 shrink-0">
          <button
            onClick={handleGenerateCatalogue}
            disabled={loading || catalogueLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 h-10 shadow-sm relative overflow-hidden min-w-[140px]"
          >
            {catalogueLoading && catalogueType === 'bulk' ? (
              <>
                <Loader2 className="animate-spin h-3 w-3" />
                <span>{catalogueProgress}%</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Bulk Catalogue</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="bg-transparent">

          {bulkProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-12 font-medium">No bulk products yet.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
              {bulkProducts.map((p) => {
                return (
                  <div key={p.id} className={`bg-white rounded-2xl p-2 sm:p-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-shadow duration-300 relative group/card ${p.isActive === false ? "opacity-75 grayscale-[0.3]" : ""}`}>
                    {/* Product Image - Clickable for Quick View */}
                    <div 
                      onClick={() => setQuickViewProduct(p)}
                      className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-1 sm:mb-1.5 bg-gray-50 relative group isolation-isolate cursor-pointer"
                    >
                      <img
                        src={toCloudinaryThumb(p.imageUrl)}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          if (e.target.src !== p.imageUrl) {
                            e.target.src = p.imageUrl;
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110 transform-gpu"
                      />

                      {p.isActive === false && (
                        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 bg-[#121212] text-[#fff] text-[8px] sm:text-[10px] font-medium px-1.5 sm:px-2.5 py-[2px] sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5 z-10 shadow-sm">
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full" />
                          Inactive
                        </div>
                      )}
                    </div>

                    {/* Product Info - Clickable for Quick View */}
                    <div 
                      onClick={() => setQuickViewProduct(p)}
                      className="flex items-start justify-between mb-0.5 cursor-pointer group/info"
                    >
                      <h3 className="font-bold text-[13px] sm:text-[15px] text-[#1a1f36] leading-[1.2] whitespace-normal line-clamp-2 group-hover/info:text-blue-600 transition-colors">{p.name}</h3>
                    </div>

                    <div className="flex flex-col mb-1">
                      {p.bulkPricingTiers && p.bulkPricingTiers.length > 0 ? (
                        <div className="space-y-0.5 mt-0.5 w-full">
                          {p.bulkPricingTiers.map((tier, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50/80 px-2 py-0.5 rounded border border-gray-100/50">
                              <span className="text-[9px] sm:text-[10px] text-gray-600 font-medium">{tier.minQty} Pcs</span>
                              <span className="text-[9px] sm:text-[10px] text-green-600 font-bold">₹{tier.pricePerPc}/pc</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[9px] text-gray-400 mt-0.5">No tiers set</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto mb-1 bg-gray-50/50 px-2 py-1 rounded-md border border-gray-100/50">
                      <p className="text-[8px] sm:text-[9px] text-gray-500 font-medium">Status</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] sm:text-[10px] font-bold ${p.isActive === false ? 'text-gray-500' : 'text-[#059669]'}`}>
                          {p.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            p.isActive === false ? handleActivate(p.id) : handleDelete(p.id);
                          }}
                          className={`relative inline-flex h-3 w-6 sm:h-4 sm:w-8 items-center rounded-full transition-colors shadow-sm ${p.isActive === false ? 'bg-gray-300' : 'bg-[#059669]'}`}
                        >
                          <span className={`inline-block h-2 w-2 sm:h-3 sm:w-3 transform rounded-full bg-white shadow-sm transition-transform ${p.isActive === false ? 'translate-x-0.5' : 'translate-x-[14px] sm:translate-x-[18px]'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-0.5 mb-1 mt-0.5">
                      <div className="px-1.5 sm:px-2 py-[2px] sm:py-0.5 bg-gray-50 border border-gray-100 rounded text-[7px] sm:text-[9px] text-gray-600 font-medium whitespace-nowrap">
                        Cat: <span className="text-gray-900 font-bold uppercase">{p.category}</span>
                      </div>
                      <div className="px-1.5 sm:px-2 py-[2px] sm:py-0.5 bg-gray-50 border border-gray-100 rounded text-[7px] sm:text-[9px] text-gray-600 font-medium whitespace-nowrap">
                        Wax: <span className="text-gray-900 font-bold capitalize">{p.waxType}</span>
                      </div>
                      {p.dimensions && (
                        <div className="px-1.5 sm:px-2 py-[2px] sm:py-0.5 bg-gray-50 border border-gray-100 rounded text-[7px] sm:text-[9px] text-gray-600 font-medium whitespace-nowrap">
                          Size: <span className="text-gray-900 font-bold">{p.dimensions}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto pt-1 border-t border-gray-50 flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="flex-1 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 py-1 sm:py-1.5 rounded sm:rounded-lg text-[9px] sm:text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Edit
                      </button>

                      <button
                        onClick={() => handlePermanentDelete(p.id)}
                        className="flex-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 py-1 sm:py-1.5 rounded sm:rounded-lg text-[9px] sm:text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                        title="Delete Product"
                      >
                        <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ADMIN QUICK VIEW MODAL */}
        {quickViewProduct && (
          <AdminProductQuickView
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            onEdit={(pId) => {
              const p = bulkProducts.find(item => item.id === pId);
              if (p) handleOpenEditModal(p);
            }}
            onToggleStatus={(id) => {
              if (quickViewProduct.isActive !== false) {
                handleDelete(id);
              } else {
                handleActivate(id);
              }
            }}
            onPermanentDelete={handlePermanentDelete}
          />
        )}

        {/* EDIT MODAL */}
        {showEditModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseEditModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-xl font-black text-gray-900">
                  Edit Bulk Product
                </h2>
                <button
                  onClick={handleCloseEditModal}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                  aria-label="Close"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-left">
                <ProductForm
                  isEdit={true}
                  onSubmit={handleEditSubmit}
                  product={product}
                  updateField={updateField}
                  handleFileChange={handleFileChange}
                  previews={previews}
                  removeImage={removeImage}
                  formLoading={formLoading}
                  formMsg={formMsg}
                  handleCloseEditModal={handleCloseEditModal}
                  bulkPricingTiers={bulkPricingTiers}
                  addTier={addTier}
                  removeTier={removeTier}
                  updateTier={updateTier}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
