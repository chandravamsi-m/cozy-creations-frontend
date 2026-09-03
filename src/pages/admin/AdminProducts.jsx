// src/pages/admin/AdminProducts.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { createPortal } from "react-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useProducts } from "../../contexts/ProductsContext";
import { createProduct, deleteProduct, updateProduct, permanentlyDeleteProduct, generateCatalogue, getCatalogueStatus } from "../../api/adminProducts";
import { calculateProductDiscount, getEffectiveDiscount } from "../../utils/offerUtils";
import ProductForm from "../../components/admin/ProductForm";
import AdminProductQuickView from "../../components/admin/AdminProductQuickView";
import ConfirmModal from "../../components/ConfirmModal";
import Skeleton from "../../components/common/Skeleton";
import { Loader2, FileText, Plus, X, Search, Package, ChevronDown, Pencil, Trash2 } from "lucide-react";
import {
  parseAdminNumber,
} from "../../utils/adminNumberInputs";
import { optimizeCloudinaryUrl, compressToWebpUnderLimit } from "../../utils/image";

// Cloudinary config
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default function AdminProducts() {
  const { idToken } = useAuth();
  const { showToast } = useToast();

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
  const { 
    products, 
    loading, 
    loadProducts, 
    catalogueLoading, 
    catalogueProgress, 
    catalogueType, 
    activeOffers,
    startCatalogueGeneration 
  } = useProducts();

  // Bulk pricing tiers state (optional)
  const [bulkPricingTiers, setBulkPricingTiers] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Search and Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const SORT_OPTIONS = [
    { value: "featured", label: "Featured", shortLabel: "Featured" },
    { value: "price-low", label: "Price: Low to High", shortLabel: "Low to High" },
    { value: "price-high", label: "Price: High to Low", shortLabel: "High to Low" },
    { value: "name-asc", label: "Name: A to Z", shortLabel: "A to Z" },
    { value: "name-desc", label: "Name: Z to A", shortLabel: "Z to A" },
  ];

  const filteredProducts = React.useMemo(() => {
    let result = [...products];

    // 1. Search Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term) ||
          p.waxType?.toLowerCase().includes(term) ||
          (term === "bulk" && (
            (p.bulkPricingTiers && p.bulkPricingTiers.length > 0) || 
            (p.bulkPricing && p.bulkPricing.length > 0)
          ))
      );
    }

    // 2. Sort Logic
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case "price-high":
        result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case "name-asc":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-desc":
        result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "featured":
      default:
        // Default: Sort by Recently Added (using createdAt)
        result.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        break;
    }

    return result;
  }, [products, searchTerm, sortBy]);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [imageFiles, setImageFiles] = useState([null, null, null, null, null]);
  const [previews, setPreviews] = useState([null, null, null, null, null]);
  const [product, setProduct] = useState({
    name: "",
    category: "",
    waxType: "soy",
    waxTypeOther: "",
    weightGrams: "",
    dimensions: "",
    dimensionUnit: "cm",
    price: "",
    quantityPack: "",
    customizableFragrance: true,
    customizableColor: true,
    altText: "",
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
    return optimizeCloudinaryUrl(url, { width: 600, height: 450 });
  };

  useEffect(() => {
    loadProducts("", false, true); // Admin mode: silent=false, includeInactive=true
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

  // Click outside sort menu handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSortMenu && !e.target.closest("[data-sort-menu]")) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSortMenu]);
  // Keep QuickView in sync with master products list
  useEffect(() => {
    if (quickViewProduct) {
      const updated = products.find(p => p.id === quickViewProduct.id);
      if (updated) setQuickViewProduct(updated);
    }
  }, [products]);

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
          await loadProducts("", true, true, true); // (cat, silent, inactive, force)
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
          await loadProducts("", true, true, true);
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
          loadProducts("", false, true, true);
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
      onConfirm: () => startCatalogueGeneration('normal', idToken, showToast)
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
      dimensions: "",
      dimensionUnit: "cm",
      price: "",
      quantityPack: "",
      customizableFragrance: true,
      customizableColor: true,
      altText: "",
    });
    setImageFiles([null, null, null, null, null]);
    setPreviews([null, null, null, null, null]);
    setBulkPricingTiers([]); // Clear tiers for new product
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    previews.forEach(p => { if (p && p.startsWith("blob:")) URL.revokeObjectURL(p); });
    setImageFiles([null, null, null, null, null]);
    setPreviews([null, null, null, null, null]);
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
        showToast("Product not found", "error");
        return;
      }
      const data = snap.data();
      const isKnownWaxType = ["soy", "gel"].includes(data.waxType);
      setProduct({
        name: data.name || "",
        category: data.category || "",
        price: String(data.price ?? ""),
        weightGrams: String(data.weightGrams ?? ""),
        waxType: isKnownWaxType ? data.waxType : "other",
        waxTypeOther: isKnownWaxType ? "" : data.waxType,
        dimensions: data.dimensions ? data.dimensions.replace(/cm|mm/gi, "") : "",
        dimensionUnit: data.dimensionUnit || "cm",
        quantityPack: String(data.quantityPack ?? ""),
        customizableFragrance: data.customizableFragrance ?? true,
        customizableColor: data.customizableColor ?? true,
        altText: data.altText || "",
      });
      const initialPreviews = [null, null, null, null, null];
      if (Array.isArray(data.images) && data.images.length > 0) {
        data.images.slice(0, 5).forEach((url, i) => initialPreviews[i] = url);
      } else if (data.imageUrl) {
        initialPreviews[0] = data.imageUrl;
      }
      setPreviews(initialPreviews);
      setImageFiles([null, null, null, null, null]);
      setBulkPricingTiers(
        (data.bulkPricingTiers || data.bulkPricing || []).map((tier) => ({
          minQty: String(tier.minQty ?? ""),
          pricePerPc: String(tier.pricePerPc ?? ""),
        }))
      );
      setShowEditModal(true);
    } catch (error) {
      console.error("Error loading product:", error);
      showToast("Error loading product", "error");
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingProductId(null);
    setBulkPricingTiers([]);
    previews.forEach(p => { if (p && p.startsWith("blob:")) URL.revokeObjectURL(p); });
    setImageFiles([null, null, null, null, null]);
    setPreviews([null, null, null, null, null]);
    setFormMsg("");
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
      if (!product.quantityPack || Number(product.quantityPack) <= 0) {
        setFormMsg("Quantity per Pack is required and must be at least 1.");
        setFormLoading(false);
        return;
      }
      if (!product.dimensions) {
        setFormMsg("Dimensions are required for volumetric weight calculation.");
        setFormLoading(false);
        return;
      }
      if (!product.price || Number(product.price) <= 0) {
        setFormMsg("Price is required and must be greater than 0.");
        setFormLoading(false);
        return;
      }
      const hasAnyImage = imageFiles.some(f => f !== null) || previews.some(p => p !== null);
      if (!hasAnyImage) {
        setFormMsg("Please select at least a primary product image.");
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
        throw new Error("Please select at least a primary product image (Slot 1).");
      }
      const imageUrl = finalImages[0];
      const { waxTypeOther, ...productWithoutWaxTypeOther } = product;
      const payload = {
        ...productWithoutWaxTypeOther,
        price: parseAdminNumber(product.price),
        weightGrams: parseAdminNumber(product.weightGrams),
        quantityPack: parseAdminNumber(product.quantityPack),
        dimensions: product.dimensions ? `${product.dimensions.replace(/\s*(cm|mm)$/i, "")}${product.dimensionUnit || "cm"}` : "",
        waxType: product.waxType === "other" ? (waxTypeOther || "other") : product.waxType,
        customizableFragrance: product.customizableFragrance === "true" || product.customizableFragrance === true,
        customizableColor: product.customizableColor === "true" || product.customizableColor === true,
        imageUrl,
        thumbnailUrl: imageUrl,
        images: finalImages,
        altText: product.name,
        bulkPricingTiers: bulkPricingTiers.map(tier => ({
          minQty: String(tier.minQty),
          pricePerPc: parseAdminNumber(tier.pricePerPc)
        })).filter(tier => tier.minQty && tier.pricePerPc > 0)
      };
      await createProduct(payload, idToken);
      showToast("Product created successfully!");
      handleCloseAddModal();
      loadProducts("", true, true, true); // Silent refresh in background
    } catch (err) {
      showToast("Error: " + err.message, "error");
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
      if (!product.quantityPack || Number(product.quantityPack) <= 0) {
        showToast("Quantity per Pack is required and must be at least 1.", "error");
        setFormLoading(false);
        return;
      }
      if (!product.dimensions) {
        showToast("Dimensions are required for volumetric weight calculation.", "error");
        setFormLoading(false);
        return;
      }
      if (!product.price || Number(product.price) <= 0) {
        showToast("Price is required and must be greater than 0.", "error");
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
        price: parseAdminNumber(product.price),
        weightGrams: parseAdminNumber(product.weightGrams),
        quantityPack: parseAdminNumber(product.quantityPack),
        dimensions: product.dimensions ? `${product.dimensions.replace(/\s*(cm|mm)$/i, "")}${product.dimensionUnit || "cm"}` : "",
        waxType: product.waxType === "other" ? (waxTypeOther || "other") : product.waxType,
        customizableFragrance: product.customizableFragrance === "true" || product.customizableFragrance === true,
        customizableColor: product.customizableColor === "true" || product.customizableColor === true,
        imageUrl,
        thumbnailUrl: imageUrl,
        images: finalImages,
        altText: product.name,
        bulkPricingTiers: bulkPricingTiers.map(tier => ({
          minQty: String(tier.minQty),
          pricePerPc: parseAdminNumber(tier.pricePerPc)
        })).filter(tier => tier.minQty && tier.pricePerPc > 0)
      };
      await updateProduct(editingProductId, payload, idToken);
      showToast("Product updated successfully!");
      
      if (quickViewProduct && quickViewProduct.id === editingProductId) {
        setQuickViewProduct(prev => ({ ...prev, ...payload }));
      }

      handleCloseEditModal();
      loadProducts("", true, true, true);
    } catch (err) {
      console.error(err);
      showToast("Failed to update product", "error");
      setFormMsg("Error: " + err.message);
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pt-1 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 leading-tight">Product Inventory</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {loading ? "..." : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'Item' : 'Items'} found`}
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleGenerateCatalogue}
            disabled={loading || catalogueLoading}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 h-10 shadow-sm relative overflow-hidden min-w-[140px]"
          >
            {catalogueLoading && catalogueType === 'normal' ? (
              <>
                <Loader2 className="animate-spin h-3.5 w-3.5" />
                <span>{catalogueProgress}%</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Catalogue</span>
              </>
            )}
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-black text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-all active:scale-95 h-10 flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Search and Sort Row */}
      <div className="flex flex-row gap-2 mb-6">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex sm:pl-3.5 items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-gray-400">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <input
            type="text"
            placeholder="Search products..."
            className={`block w-full pl-8 sm:pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm h-10`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors active:scale-90"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>

        <div className="relative w-[125px] sm:w-[210px]" data-sort-menu>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm h-10 text-gray-700"
          >
            <div className="flex items-center truncate">
              <span className="text-gray-400 mr-1 hidden sm:inline font-normal">Sort:</span>
              <span className="truncate">
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Featured"}
                </span>
                <span className="sm:hidden">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.shortLabel || "Featured"}
                </span>
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 ml-1.5 transition-transform duration-200 ${showSortMenu ? "rotate-180" : ""}`} />
          </button>

          {showSortMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] py-1 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    setSortBy(o.value);
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[13px] sm:text-sm transition-colors ${
                    sortBy === o.value
                      ? "bg-indigo-50 text-indigo-600 font-bold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="hidden sm:inline">{o.label}</span>
                  <span className="sm:hidden">{o.shortLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 animate-in fade-in duration-500">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} height="280px" borderRadius="16px" className="w-full" />
          ))}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="border rounded bg-white p-6 text-center">
          <p className="font-medium">{searchTerm ? "No products match your search" : "No products yet"}</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchTerm ? "Try adjusting your search terms" : "Create your first product to see it listed here."}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-black text-white rounded flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredProducts.map((p) => (
              <AdminProductCard
                key={p.id}
                p={p}
                activeOffers={activeOffers}
                toCloudinaryThumb={toCloudinaryThumb}
                handleOpenEditModal={handleOpenEditModal}
                handleDelete={handleDelete}
                handleActivate={handleActivate}
                handlePermanentDelete={handlePermanentDelete}
                onQuickView={() => setQuickViewProduct(p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ADMIN QUICK VIEW MODAL */}
      {quickViewProduct && (
        <AdminProductQuickView
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onEdit={handleOpenEditModal}
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

      {/* ADD/EDIT MODAL CONTAINER */}
      {(showAddModal || showEditModal) && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={showAddModal ? handleCloseAddModal : handleCloseEditModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-black text-gray-900">
                {showAddModal ? "Add New Product" : "Edit Product"}
              </h2>
              <button
                onClick={showAddModal ? handleCloseAddModal : handleCloseEditModal}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <ProductForm
                isEdit={showEditModal}
                onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit}
                product={product}
                updateField={updateField}
                handleFileChange={handleFileChange}
                previews={previews}
                removeImage={removeImage}
                formLoading={formLoading}
                formMsg={formMsg}
                handleCloseAddModal={handleCloseAddModal}
                handleCloseEditModal={handleCloseEditModal}
                bulkPricingTiers={bulkPricingTiers}
                addTier={addTier}
                removeTier={removeTier}
                updateTier={updateTier}
              />
            </div>
          </div>
        </div>,
        document.body
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
  activeOffers,
  toCloudinaryThumb,
  handleOpenEditModal,
  handleDelete,
  handleActivate,
  handlePermanentDelete,
  onQuickView
}) => {
  const [discount, setDiscount] = useState(null);

  useEffect(() => {
    if (activeOffers?.length > 0) {
      const data = getEffectiveDiscount(p, activeOffers);
      setDiscount(data.hasDiscount ? data : null);
    } else {
      setDiscount(null);
    }
  }, [p, activeOffers]);

  const hasBulk = ((p.bulkPricingTiers && p.bulkPricingTiers.length > 0) || (p.bulkPricing && p.bulkPricing.length > 0));

  return (
    <div key={p.id} className={`bg-white rounded-[20px] p-2.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-shadow duration-300 relative group/card ${p.isActive === false ? "opacity-75 grayscale-[0.3]" : ""}`}>
      {/* Product Image - Clickable for Quick View */}
      <div 
        onClick={onQuickView}
        className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-1.5 sm:mb-2 bg-gray-50 relative isolation-isolate cursor-pointer group"
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
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 transform-gpu"
        />

        {p.isActive === false && (
          <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 bg-[#121212] text-[#fff] text-[8px] sm:text-[10px] font-medium px-1.5 sm:px-2.5 py-[2px] sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5 z-10 shadow-sm">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full" />
            Inactive
          </div>
        )}

        {hasBulk && (
          <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-black/80 backdrop-blur-sm text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-[2px] sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5 border border-white/10">
            <Package className="w-2 h-2 sm:w-3 sm:h-3" /> Bulk
          </div>
        )}
      </div>

      <div 
        onClick={onQuickView}
        className="flex items-start justify-between gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 cursor-pointer group/info"
      >
        <h3 className="font-bold text-base sm:text-xl text-[#1a1f36] leading-tight whitespace-normal line-clamp-2 group-hover/info:text-blue-600 transition-colors">{p.name}</h3>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 sm:mb-1.5 gap-1 sm:gap-0">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mb-0.5 whitespace-nowrap">Price</p>
          {discount && discount.hasDiscount ? (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-sm sm:text-base diagonal-strike">₹{p.price}</span>
              <span className="text-green-600 text-sm sm:text-base font-bold truncate">₹{discount.discountedPrice}</span>
            </div>
          ) : (
            <p className="text-sm sm:text-base font-bold text-[#1a1f36] truncate">₹{p.price}</p>
          )}
        </div>
        
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 w-full sm:w-auto bg-gray-50/80 sm:bg-transparent px-2 py-1.5 sm:p-0 rounded-md sm:rounded-none border sm:border-0 border-gray-100">
          <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium sm:mb-1">Status</p>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className={`text-[9px] sm:text-[11px] font-bold ${p.isActive === false ? 'text-gray-500' : 'text-[#059669]'}`}>
              {p.isActive === false ? 'Inactive' : 'Active'}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                p.isActive === false ? handleActivate(p.id) : handleDelete(p.id);
              }}
              className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 items-center rounded-full transition-colors shadow-sm ${p.isActive === false ? 'bg-gray-300' : 'bg-[#059669]'}`}
            >
              <span className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white shadow-sm transition-transform ${p.isActive === false ? 'translate-x-0.5' : 'translate-x-3.5 sm:translate-x-[18px]'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-1 sm:mb-1.5">
        <div className="px-1.5 sm:px-2 py-[2px] sm:py-0.5 bg-gray-50 border border-gray-100 rounded text-[8px] sm:text-[10px] text-gray-600 font-medium whitespace-nowrap">
          Cat: <span className="text-gray-900 font-bold uppercase">{p.category}</span>
        </div>
        <div className="px-1.5 sm:px-2 py-[2px] sm:py-0.5 bg-gray-50 border border-gray-100 rounded text-[8px] sm:text-[10px] text-gray-600 font-medium whitespace-nowrap">
          Wax: <span className="text-gray-900 font-bold capitalize">{p.waxType}</span>
        </div>
        {p.dimensions && (
          <div className="px-1.5 sm:px-2 py-[2px] sm:py-0.5 bg-gray-50 border border-gray-100 rounded text-[8px] sm:text-[10px] text-gray-600 font-medium whitespace-nowrap">
            Size: <span className="text-gray-900 font-bold">{p.dimensions}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-1.5 sm:pt-2 border-t border-gray-50 flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => handleOpenEditModal(p.id)}
          className="flex-1 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 py-1.5 sm:py-2 rounded sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm"
        >
          <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Edit
        </button>
        <button
          onClick={() => handlePermanentDelete(p.id)}
          className="flex-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 py-1.5 sm:py-2 rounded sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm"
          title="Delete Product"
        >
          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
};
