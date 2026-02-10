// src/pages/admin/AdminProducts.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { createProduct, deleteProduct, updateProduct, permanentlyDeleteProduct, generateCatalogue } from "../../api/adminProducts";

// Cloudinary config
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default function AdminProducts() {
  const { idToken } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState("");
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
      const regularProducts = list.filter(p => p.isBulk !== true);
      setProducts(regularProducts);
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

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this product?")) return;
    try {
      await deleteProduct(id, idToken);
      await loadProducts(true);
    } catch (error) {
      console.error("Failed to deactivate:", error);
      alert("Error: " + error.message);
    }
  };

  const handleActivate = async (id) => {
    if (!window.confirm("Activate this product?")) return;
    try {
      await updateProduct(id, { isActive: true }, idToken);
      await loadProducts(true);
    } catch (error) {
      console.error("Failed to activate:", error);
      alert("Error: " + error.message);
    }
  };

  const handlePermanentDelete = async (id) => {
    const confirmed = window.confirm(
      "WARNING: This will PERMANENTLY delete this product from the database. This action cannot be undone. Proceed?"
    );
    if (!confirmed) return;
    try {
      await permanentlyDeleteProduct(id, idToken);
      loadProducts();
    } catch (error) {
      console.error("Failed to permanent delete:", error);
      alert("Error: " + error.message);
    }
  };

  const handleGenerateCatalogue = async () => {
    if (!window.confirm("Generate and download the product catalogue PDF?")) return;
    setCatalogueLoading(true);
    try {
      const blob = await generateCatalogue(idToken);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cozy-catalogue.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Catalogue Generation Error:", error);
      alert("Error generating catalogue: " + error.message);
    } finally {
      setCatalogueLoading(false);
    }
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
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setImageFile(null);
    setPreview(null);
    setFormMsg("");
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
      setShowEditModal(true);
    } catch (error) {
      console.error("Error loading product:", error);
      setFormMsg("Error loading product");
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingProductId(null);
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
      };
      await createProduct(payload, idToken);
      setFormMsg("Product created successfully ✔");
      await loadProducts();
      setTimeout(() => handleCloseAddModal(), 1500);
    } catch (err) {
      setFormMsg("Error: " + err.message);
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
      };
      await updateProduct(editingProductId, payload, idToken);
      setFormMsg("Product updated successfully ✔");
      await loadProducts();
      setTimeout(() => handleCloseEditModal(), 1500);
    } catch (err) {
      setFormMsg("Error: " + err.message);
    }
    setFormLoading(false);
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div className="flex items-end gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 leading-none">Products</h2>
          <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400 mb-0.5">
            {loading ? "..." : `${products.length} Items`}
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleGenerateCatalogue}
            disabled={loading || catalogueLoading}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-[10px] sm:text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {catalogueLoading ? (
              <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "📄 Catalogue"}
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-black text-white rounded-xl font-medium text-[10px] sm:text-xs uppercase tracking-wider hover:bg-gray-800 transition-all active:scale-95 shadow-md"
          >
            + New Product
          </button>
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
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300">
                {/* Product Image */}
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-gray-50">
                  <img
                    src={toCloudinaryThumb(p.imageUrl)}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                </div>

                {/* Product Info */}
                <div className="mb-0.5 min-h-[2.8rem] flex flex-col justify-start">
                  <h3 className="font-semibold text-[clamp(13px,3.8vw,15px)] text-gray-900 leading-[1.2] whitespace-normal">{p.name}</h3>
                  <p className="text-gray-400 text-[10px] sm:text-xs font-medium">₹{p.price}</p>
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fixed Focus Bug: Moved outside to keep stable reference
const ProductForm = ({
  isEdit,
  onSubmit,
  product,
  updateField,
  handleFileChange,
  preview,
  formLoading,
  handleCloseAddModal,
  handleCloseEditModal
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    {/* Product Name */}
    <div className="space-y-1">
      <label htmlFor="product-name" className="text-sm font-medium text-gray-800">
        Product Name <span className="text-red-500">*</span>
      </label>
      <input
        id="product-name"
        type="text"
        value={product.name}
        onChange={(e) => updateField("name", e.target.value)}
        placeholder="Product Name"
        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none"
        required
      />
    </div>

    {/* Category */}
    <div className="space-y-1">
      <label htmlFor="product-category" className="text-sm font-medium text-gray-800">
        Category <span className="text-red-500">*</span>
      </label>
      <select
        id="product-category"
        value={product.category}
        onChange={(e) => updateField("category", e.target.value)}
        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none"
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

    {/* Row: Wax Type & Specification */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor="product-wax-type" className="text-sm font-medium text-gray-800">
          Wax Type <span className="text-red-500">*</span>
        </label>
        <select
          id="product-wax-type"
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

    {/* Row: Weight & Burn Time */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Weight */}
      <div className="space-y-1">
        <label htmlFor="product-weight" className="text-sm font-medium text-gray-800">
          Weight <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="product-weight"
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

      {/* Burn Time */}
      <div className="space-y-1">
        <label htmlFor="product-burn-time" className="text-sm font-medium text-gray-800">
          Burn Time <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="product-burn-time"
            type="number"
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

    {/* Row: Quantity Pack & Price */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor="product-quantity-pack" className="text-sm font-medium text-gray-800">
          Qty Pack <span className="text-red-500">*</span>
        </label>
        <input
          id="product-quantity-pack"
          type="number"
          value={product.quantityPack}
          onChange={(e) => updateField("quantityPack", e.target.value)}
          placeholder="1"
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="product-price" className="text-sm font-medium text-gray-800">
          Price (₹) <span className="text-red-500">*</span>
        </label>
        <input
          id="product-price"
          type="number"
          value={product.price}
          onChange={(e) => updateField("price", e.target.value)}
          placeholder="Price"
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
          required
        />
      </div>
    </div>

    {/* Row: Dimensions & Inventory (Optional) */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor="product-dimensions" className="text-sm font-medium text-gray-800">
          Dimensions <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <div className="flex items-center gap-0 border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-black h-10 bg-white">
          <input
            id="product-dimensions"
            type="text"
            value={product.dimensions}
            onChange={(e) => updateField("dimensions", e.target.value)}
            placeholder="e.g. 10x15"
            className="flex-1 p-2 outline-none border-none text-sm h-full"
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
        <label htmlFor="product-inventory" className="text-sm font-medium text-gray-800">
          Inventory <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <input
          id="product-inventory"
          type="number"
          value={product.inventory}
          onChange={(e) => updateField("inventory", e.target.value)}
          placeholder="Default 100"
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10 text-sm"
        />
      </div>
    </div>

    {/* Customizations */}
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="space-y-1 w-full">
        <label htmlFor="product-custom-fragrance" className="text-sm font-medium text-gray-800">
          Customizable Fragrance
        </label>
        <select
          id="product-custom-fragrance"
          value={product.customizableFragrance}
          onChange={(e) => updateField("customizableFragrance", e.target.value)}
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
        >
          <option value="true">Fragrance: Yes</option>
          <option value="false">Fragrance: No</option>
        </select>
      </div>

      <div className="space-y-1 w-full">
        <label htmlFor="product-custom-color" className="text-sm font-medium text-gray-800">
          Customizable Color
        </label>
        <select
          id="product-custom-color"
          value={product.customizableColor}
          onChange={(e) => updateField("customizableColor", e.target.value)}
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
        >
          <option value="true">Color: Yes</option>
          <option value="false">Color: No</option>
        </select>
      </div>
    </div>

    {/* Image Upload */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-800 block">
        Product Image {!isEdit && <span className="text-red-500">*</span>}
      </label>

      <div className="relative group">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="product-image-upload"
        />

        <label
          htmlFor="product-image-upload"
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
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">Upload Product Image</p>
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">PNG, JPG up to 5MB</p>
              </div>
            </div>
          )}
        </label>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-3 pt-6 border-t border-gray-100 mt-2">
      <button
        type="submit"
        disabled={formLoading}
        className="flex-1 bg-black text-white px-6 py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 active:scale-95 shadow-sm flex items-center justify-center min-h-[44px]"
      >
        {formLoading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Update Product" : "Create Product")}
      </button>
      <button
        type="button"
        onClick={isEdit ? handleCloseEditModal : handleCloseAddModal}
        className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-95"
      >
        Cancel
      </button>
    </div>
  </form >
);
