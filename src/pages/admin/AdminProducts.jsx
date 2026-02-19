// src/pages/admin/AdminProducts.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { createProduct, deleteProduct, updateProduct, permanentlyDeleteProduct, generateCatalogue, getCatalogueStatus } from "../../api/adminProducts";
import { calculateProductDiscount } from "../../utils/offerUtils";
import ProductForm from "../../components/admin/ProductForm";
import ConfirmModal from "../../components/admin/ConfirmModal";
import { Loader2 } from "lucide-react";

// Cloudinary config
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default function AdminProducts() {
  const { idToken } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);

  // URL query params for deep linking
  const queryParams = new URLSearchParams(window.location.search);
  const editId = queryParams.get("edit");

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
  const [loading, setLoading] = useState(true);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueProgress, setCatalogueProgress] = useState(0);
  const [catalogueStatus, setCatalogueStatusText] = useState("");

  // Bulk pricing tiers state (optional)
  const [bulkPricingTiers, setBulkPricingTiers] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState(""); // Keeping for inline validation/errors
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
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

  const loadProducts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(list);
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Handle deep linking for edit modal
  useEffect(() => {
    if (editId && products.length > 0 && !showEditModal) {
      const productToEdit = products.find(p => p.id === editId);
      if (productToEdit) {
        handleOpenEditModal(productToEdit);
        // Clean up URL without refreshing
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [editId, products]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (showAddModal) handleCloseAddModal();
        if (showEditModal) handleCloseEditModal();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showAddModal, showEditModal]);

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Deactivate Product",
      message: "Are you sure you want to deactivate this product? It will no longer be visible to customers.",
      type: "danger",
      confirmText: "Deactivate",
      onConfirm: async () => {
        try {
          await deleteProduct(id, idToken);
          showToast("Product deactivated successfully");
          await loadProducts(true);
          scrollToTop();
        } catch (error) {
          console.error("Failed to deactivate:", error);
          showToast(error.message, "error");
        }
      }
    });
  };

  const handleActivate = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Activate Product",
      message: "This product will become visible to customers again. Proceed?",
      type: "success",
      confirmText: "Activate",
      onConfirm: async () => {
        try {
          await updateProduct(id, { isActive: true }, idToken);
          showToast("Product activated successfully");
          await loadProducts(true);
          scrollToTop();
        } catch (error) {
          console.error("Failed to activate:", error);
          showToast(error.message, "error");
        }
      }
    });
  };

  const handlePermanentDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanent Delete",
      message: "WARNING: This will PERMANENTLY delete this product from the database. This action cannot be undone. Proceed?",
      type: "danger",
      confirmText: "Delete Permanently",
      onConfirm: async () => {
        try {
          await permanentlyDeleteProduct(id, idToken);
          showToast("Product deleted permanently");
          loadProducts();
          scrollToTop();
        } catch (error) {
          console.error("Failed to permanent delete:", error);
          showToast(error.message, "error");
        }
      }
    });
  };

  const handleGenerateCatalogue = () => {
    setConfirmModal({
      isOpen: true,
      title: "Generate Catalogue",
      message: "This will generate and download the product catalogue PDF. Proceed?",
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

          const blob = await generateCatalogue(idToken, (p) => {
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
          a.download = `cozy-catalogue.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          showToast("Catalogue generated and downloaded!");
        } catch (error) {
          if (statusInterval) clearInterval(statusInterval);
          console.error("Catalogue Generation Error:", error);
          showToast("Failed to generate catalogue", "error");
        } finally {
          setCatalogueLoading(false);
          setCatalogueProgress(0);
          setCatalogueStatusText("");
        }
      }
    });
  };

  // Modal handlers
  const handleOpenAddModal = () => {
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
    setImageFile(null);
    setPreview(null);
    setFormMsg("");
    setBulkPricingTiers([]); // Clear tiers for new product
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setImageFile(null);
    setPreview(null);
    setFormMsg("");
    setBulkPricingTiers([]);
  };

  const handleOpenEditModal = async (productId) => {
    setEditingProductId(productId);
    setFormMsg("");
    try {
      const ref = doc(db, "products", productId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setFormMsg("Product not found");
        return;
      }
      const data = snap.data();
      const isKnownWaxType = ["soy", "gel"].includes(data.waxType);
      setProduct({
        name: data.name || "",
        category: data.category || "",
        price: data.price || 0,
        weightGrams: data.weightGrams || 0,
        waxType: isKnownWaxType ? data.waxType : "other",
        waxTypeOther: isKnownWaxType ? "" : data.waxType,
        burnTimeHours: data.burnTimeHours || "",
        dimensions: data.dimensions ? data.dimensions.replace(/cm|mm/gi, "") : "",
        dimensionUnit: data.dimensionUnit || "cm",
        quantityPack: data.quantityPack || "",
        customizableFragrance: data.customizableFragrance ?? true,
        customizableColor: data.customizableColor ?? true,
        altText: data.altText || "",
        inventory: data.inventory || "",
      });
      setPreview(data.imageUrl);
      setImageFile(null);
      setBulkPricingTiers(data.bulkPricing || []); // Load existing tiers
      setShowEditModal(true);
    } catch (error) {
      console.error("Error loading product:", error);
      setFormMsg("Error loading product");
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingProductId(null);
    setBulkPricingTiers([]);
    setImageFile(null);
    setPreview(null);
    setFormMsg("");
  };

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) setPreview(URL.createObjectURL(file));
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
    } catch { }
    if (!res.ok) {
      const cloudinaryMsg = data?.error?.message || data?.message || `Upload failed (HTTP ${res.status})`;
      throw new Error(cloudinaryMsg);
    }
    if (!data?.secure_url) throw new Error("Image upload failed: missing secure_url from Cloudinary");
    return data.secure_url;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormMsg("");
    setFormLoading(true);
    try {
      if (!product.name || !product.category) {
        setFormMsg("Product name and category are required.");
        setFormLoading(false);
        return;
      }
      if (!product.weightGrams || Number(product.weightGrams) <= 0) {
        setFormMsg("Weight is required and must be greater than 0.");
        setFormLoading(false);
        return;
      }
      if (!product.burnTimeHours || Number(product.burnTimeHours) <= 0) {
        setFormMsg("Burn Time is required and must be greater than 0.");
        setFormLoading(false);
        return;
      }
      if (!product.quantityPack || Number(product.quantityPack) <= 0) {
        setFormMsg("Quantity per Pack is required and must be at least 1.");
        setFormLoading(false);
        return;
      }
      if (!product.price || Number(product.price) <= 0) {
        setFormMsg("Price is required and must be greater than 0.");
        setFormLoading(false);
        return;
      }
      if (!imageFile) {
        setFormMsg("Please select a product image.");
        setFormLoading(false);
        return;
      }
      const fileToUpload = await compressToWebpUnderLimit(imageFile, MAX_UPLOAD_BYTES);
      const imageUrl = await uploadToCloudinary(fileToUpload);
      const { waxTypeOther, ...productWithoutWaxTypeOther } = product;
      const payload = {
        ...productWithoutWaxTypeOther,
        price: Number(product.price),
        weightGrams: Number(product.weightGrams),
        quantityPack: Number(product.quantityPack),
        burnTimeHours: product.burnTimeHours || "",
        dimensions: product.dimensions ? `${product.dimensions.replace(/\s*(cm|mm)$/i, "")}${product.dimensionUnit || "cm"}` : "",
        waxType: product.waxType === "other" ? (waxTypeOther || "other") : product.waxType,
        customizableFragrance: product.customizableFragrance === "true" || product.customizableFragrance === true,
        customizableColor: product.customizableColor === "true" || product.customizableColor === true,
        inventory: product.inventory ? Number(product.inventory) : 100,
        imageUrl,
        altText: product.name,
        thumbnailUrl: imageUrl,
        bulkPricingTiers: bulkPricingTiers.map(tier => ({
          minQty: String(tier.minQty),
          pricePerPc: Number(tier.pricePerPc)
        })).filter(tier => tier.minQty && tier.pricePerPc > 0)
      };
      await createProduct(payload, idToken);
      showToast("Product created successfully!");
      await loadProducts();
      scrollToTop();
      setTimeout(() => handleCloseAddModal(), 1500);
    } catch (err) {
      setFormMsg("Error: " + err.message);
      showToast("Failed to create product", "error");
    }
    setFormLoading(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormMsg("");
    setFormLoading(true);
    try {
      if (!product.weightGrams || Number(product.weightGrams) <= 0) {
        setFormMsg("Weight is required and must be greater than 0.");
        setFormLoading(false);
        return;
      }
      if (!product.burnTimeHours || Number(product.burnTimeHours) <= 0) {
        setFormMsg("Burn Time is required and must be greater than 0.");
        setFormLoading(false);
        return;
      }
      if (!product.quantityPack || Number(product.quantityPack) <= 0) {
        setFormMsg("Quantity per Pack is required and must be at least 1.");
        setFormLoading(false);
        return;
      }
      if (!product.price || Number(product.price) <= 0) {
        setFormMsg("Price is required and must be greater than 0.");
        setFormLoading(false);
        return;
      }
      let imageUrl = preview;
      if (imageFile) {
        const fileToUpload = await compressToWebpUnderLimit(imageFile, MAX_UPLOAD_BYTES);
        imageUrl = await uploadToCloudinary(fileToUpload);
      }
      const { waxTypeOther, ...productWithoutWaxTypeOther } = product;
      const payload = {
        ...productWithoutWaxTypeOther,
        price: Number(product.price),
        weightGrams: Number(product.weightGrams),
        quantityPack: Number(product.quantityPack),
        burnTimeHours: product.burnTimeHours || "",
        dimensions: product.dimensions ? `${product.dimensions.replace(/\s*(cm|mm)$/i, "")}${product.dimensionUnit || "cm"}` : "",
        waxType: product.waxType === "other" ? (waxTypeOther || "other") : product.waxType,
        customizableFragrance: product.customizableFragrance === "true" || product.customizableFragrance === true,
        customizableColor: product.customizableColor === "true" || product.customizableColor === true,
        inventory: product.inventory ? Number(product.inventory) : 100,
        imageUrl,
        altText: product.name,
        thumbnailUrl: imageUrl,
        bulkPricingTiers: bulkPricingTiers.map(tier => ({
          minQty: String(tier.minQty),
          pricePerPc: Number(tier.pricePerPc)
        })).filter(tier => tier.minQty && tier.pricePerPc > 0)
      };
      await updateProduct(editingProductId, payload, idToken);
      showToast("Product updated successfully!");
      await loadProducts();
      scrollToTop();
      setTimeout(() => handleCloseEditModal(), 1500);
    } catch (err) {
      setFormMsg("Error: " + err.message);
      showToast("Failed to update product", "error");
    }
    setFormLoading(false);
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
        `}
      </style>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div className="flex items-end gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 leading-none">Products</h2>
          <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400 mb-0.5">
            {loading ? "..." : `${products.length} Items`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleGenerateCatalogue}
              disabled={loading || catalogueLoading}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-[10px] sm:text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 h-10 shadow-sm relative overflow-hidden"
            >
              {catalogueLoading ? (
                <>
                  <div className="absolute inset-0 bg-emerald-500/20" style={{ width: `${catalogueProgress}%`, transition: 'width 0.3s ease-out' }} />
                  <Loader2 className="animate-spin h-3 w-3 text-white relative z-10" />
                  <span className="relative z-10 font-bold flex flex-col items-start leading-none gap-0.5">
                    <span className="text-[8px] animate-pulse opacity-80 uppercase tracking-tighter">Generating...</span>
                    <span className="flex items-center gap-1">
                      <span className="text-[10px] font-black">{catalogueProgress}%</span>
                    </span>
                  </span>
                </>
              ) : (
                "📄 Catalogue"
              )}
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-none px-4 py-2 bg-black text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider hover:bg-gray-800 transition-all active:scale-95 h-10"
            >
              + New Product
            </button>
          </div>
        </div>
      </div>

      {!loading && products.length === 0 && (
        <div className="border rounded bg-white p-6 text-center">
          <p className="font-medium">No products yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Create your first product to see it listed here.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2 bg-black text-white rounded"
          >
            + Add Product
          </button>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {products.map((p) => (
              <AdminProductCard
                key={p.id}
                p={p}
                toCloudinaryThumb={toCloudinaryThumb}
                handleOpenEditModal={handleOpenEditModal}
                handleDelete={handleDelete}
                handleActivate={handleActivate}
                handlePermanentDelete={handlePermanentDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL CONTAINER */}
      {(showAddModal || showEditModal) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={showAddModal ? handleCloseAddModal : handleCloseEditModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-black text-gray-900">
                {showAddModal ? "Add New Product" : "Edit Product"}
              </h2>
              <button
                onClick={showAddModal ? handleCloseAddModal : handleCloseEditModal}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                aria-label="Close"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <ProductForm
                isEdit={showEditModal}
                onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit}
                product={product}
                updateField={updateField}
                handleFileChange={handleFileChange}
                preview={preview}
                formLoading={formLoading}
                handleCloseAddModal={handleCloseAddModal}
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

      {/* CONFIRMATION MODAL */}
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

const AdminProductCard = ({
  p,
  toCloudinaryThumb,
  handleOpenEditModal,
  handleDelete,
  handleActivate,
  handlePermanentDelete
}) => {
  const [discount, setDiscount] = useState(null);

  useEffect(() => {
    calculateProductDiscount(p)
      .then((data) => {
        if (data.hasDiscount) setDiscount(data);
      })
      .catch((err) => console.error("Discount error:", err));
  }, [p]);

  return (
    <div key={p.id} className={`bg-white border border-gray-100 rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300 relative ${p.isActive === false ? "opacity-75 grayscale-[0.3]" : ""}`}>
      {/* Product Image */}
      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-gray-50 relative">
        <img
          src={toCloudinaryThumb(p.imageUrl)}
          alt={p.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />

        {/* Bulk Pricing Badge */}
        <div className="absolute top-1 left-1 z-10 flex flex-col gap-1">
          {((p.bulkPricingTiers && p.bulkPricingTiers.length > 0) || (p.bulkPricing && p.bulkPricing.length > 0)) && (
            <span className="px-2 py-0.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-wider rounded-md shadow-sm border border-emerald-400/50">
              Bulk
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="mb-0.5 min-h-[2.8rem] flex flex-col justify-start">
        <h3 className="font-semibold text-[clamp(13px,3.8vw,15px)] text-gray-900 leading-[1.2] whitespace-normal">{p.name}</h3>
        {discount && discount.hasDiscount ? (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-[10px] diagonal-strike">₹{p.price}</span>
            <span className="text-green-600 text-[10px] sm:text-xs font-bold">₹{discount.discountedPrice}</span>
          </div>
        ) : (
          <p className="text-gray-400 text-[10px] sm:text-xs font-medium">₹{p.price}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] sm:text-[10px] text-gray-400 border-y border-gray-50 py-1 mb-1.5">
        <p className="shrink-0">Cat: <span className="text-gray-900 font-medium uppercase">{p.category}</span></p>
        <p className="shrink-0">Wax: <span className="text-gray-900 font-medium capitalize">{p.waxType}</span></p>
        {p.dimensions && <p className="shrink-0">Size: <span className="text-gray-900 font-medium">{p.dimensions}</span></p>}
        <p className="shrink-0">Pack: <span className="text-gray-900 font-medium">{p.quantityPack || 1}</span></p>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto pt-1 space-y-1">
        <div className="flex flex-row gap-1">
          <button
            onClick={() => handleOpenEditModal(p.id)}
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
          className="w-full border border-red-100 text-red-500 py-1 rounded-lg font-medium text-[9px] uppercase tracking-tight hover:bg-red-50 transition-all"
        >
          Delete Permanently
        </button>
      </div>
    </div>
  );
};
