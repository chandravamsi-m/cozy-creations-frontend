// src/pages/admin/AdminBulkProducts.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useProducts } from "../../contexts/ProductsContext";
import { updateProduct, deleteProduct, permanentlyDeleteProduct, generateBulkCatalogue, getCatalogueStatus } from "../../api/adminProducts";
import ProductForm from "../../components/admin/ProductForm";
import ConfirmModal from "../../components/ConfirmModal";
import { Loader2, FileText, Truck } from "lucide-react";

// Cloudinary config
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export default function AdminBulkProducts() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const { products: allProducts, loadProducts } = useProducts();

  const [showEditModal, setShowEditModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
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
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueProgress, setCatalogueProgress] = useState(0);
  const [catalogueStatus, setCatalogueStatusText] = useState("");

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
      throw new Error(`Image is still too large after compression. Please use a smaller image.`);
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
    setFormLoading(true);

    try {
      if (!product.dimensions) {
        showToast("Dimensions are required.", "error");
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
      showToast("Product updated successfully");
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
      message: "This will generate and download the bulk products catalogue PDF. Proceed?",
      type: "default",
      confirmText: "Download",
      onConfirm: async () => {
        setCatalogueLoading(true);
        setCatalogueProgress(0);
        setCatalogueStatusText("Starting...");
        let statusInterval;
        try {
          // Poll backend status for the generation phase
          statusInterval = setInterval(async () => {
            try {
              const status = await getCatalogueStatus(idToken);
              if (status) {
                // Map 0-100 backend progress to 0-90% UI progress
                setCatalogueProgress(Math.round(status.progress * 0.9));
                setCatalogueStatusText(status.currentAction);
              }
            } catch (pollErr) {
              console.warn("Status poll error:", pollErr);
            }
          }, 800);

          const blob = await generateBulkCatalogue(idToken, (p) => {
            // Once real download starts (90%+), clear polling and show download progress
            if (statusInterval) {
              clearInterval(statusInterval);
              statusInterval = null;
            }
            // Map 0-100 download progress to 90-100% UI progress
            setCatalogueProgress(90 + Math.round(p * 0.1));
            setCatalogueStatusText("Downloading...");
          });

          if (statusInterval) clearInterval(statusInterval);
          setCatalogueProgress(100);
          setCatalogueStatusText("Complete!");

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
          if (statusInterval) clearInterval(statusInterval);
          console.error("Bulk Catalogue Generation Error:", error);
          showToast("Failed to generate bulk catalogue", "error");
        } finally {
          setCatalogueLoading(false);
          setCatalogueProgress(0);
          setCatalogueStatusText("");
        }
      }
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
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 h-10 shadow-sm relative overflow-hidden"
          >
            {catalogueLoading ? (
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
                      <h3 className="font-semibold text-[clamp(14px,4vw,16px)] text-gray-900 leading-[1.2] whitespace-normal mb-1.5">{p.name}</h3>
                      {p.bulkPricingTiers && p.bulkPricingTiers.length > 0 ? (
                        <div className="space-y-0.5">
                          {p.bulkPricingTiers.map((tier, idx) => (
                            <p key={idx} className="text-[11px] flex justify-between items-center bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              <span className="text-gray-700 font-medium">
                                {tier.minQty} Pcs
                              </span>
                              <span className="text-green-700 font-bold">₹{tier.pricePerPc}/pc</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No tiers set</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] sm:text-[10px] text-gray-400 border-y border-gray-50 py-1 mb-1.5">
                      <p className="shrink-0">Cat: <span className="text-gray-900 font-medium uppercase">{p.category}</span></p>
                      <p className="shrink-0">Wax: <span className="text-gray-900 font-medium capitalize">{p.waxType}</span></p>
                      {p.dimensions && <p className="shrink-0">Size: <span className="text-gray-900 font-medium">{p.dimensions}</span></p>}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto pt-1 space-y-1.5">
                      <div className="flex flex-row gap-1">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="flex-1 bg-blue-600 text-white px-1 sm:px-2 py-1.5 rounded-lg font-bold text-[10px] sm:text-xs tracking-wider hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                          Edit
                        </button>

                        {p.isActive !== false ? (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="flex-1 bg-orange-600 text-white px-1 sm:px-2 py-1.5 rounded-lg font-bold text-[10px] sm:text-xs tracking-wider hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-1"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(p.id)}
                            className="flex-1 bg-green-600 text-white px-1 sm:px-2 py-1.5 rounded-lg font-bold text-[10px] sm:text-xs tracking-wider hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-1"
                          >
                            Activate
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handlePermanentDelete(p.id)}
                        className="w-full bg-red-50 border border-red-100 text-red-600 py-1.5 rounded-lg font-bold text-[10px] tracking-tight hover:bg-red-100 transition-all active:scale-[0.98]"
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
