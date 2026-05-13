import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { updateProduct } from "../../api/adminProducts";
import { Package } from "lucide-react";
import {
  coerceAdminNumberInput,
  getStableAdminNumberValue,
  parseAdminNumber,
  preventNumberWheelChange,
} from "../../utils/adminNumberInputs";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dlrtaxlcl";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "cozy_unsigned";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const KNOWN_CATEGORIES = ["flower", "animal", "festive", "special", "glassJar"];
const KNOWN_WAX_TYPES = ["soy", "gel"];

export default function AdminEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { idToken } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [imageFiles, setImageFiles] = useState([null, null, null, null, null]);
  const [previews, setPreviews] = useState([null, null, null, null, null]);
  const [loading, setLoading] = useState(false);

  const scrollToTop = () => {
    setTimeout(() => {
      const scrollable = document.querySelector("main.overflow-y-auto") || document.querySelector("main");
      if (scrollable) {
        scrollable.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "products", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        showToast("Product not found", "error");
        return;
      }

      const data = snap.data();
      const initialWaxType = data.waxType || "soy";
      const isKnownWaxType = KNOWN_WAX_TYPES.includes(initialWaxType);

      setProduct({
        name: data.name || "",
        category: data.category || "",
        price: getStableAdminNumberValue(data.price ?? ""),
        weightGrams: getStableAdminNumberValue(data.weightGrams ?? ""),
        waxType: isKnownWaxType ? initialWaxType : "other",
        waxTypeOther: isKnownWaxType ? "" : initialWaxType,
        quantityPack: getStableAdminNumberValue(data.quantityPack ?? ""),
        burnTimeHours: data.burnTimeHours || "",
        dimensions: data.dimensions ? data.dimensions.replace(/\s*(cm|mm)$/i, "") : "",
        dimensionUnit: data.dimensions && /mm$/i.test(data.dimensions) ? "mm" : "cm",
        customizableFragrance: data.customizableFragrance ?? true,
        customizableColor: data.customizableColor ?? true,
        altText: data.altText || "",
        imageUrl: data.imageUrl || "",
      });

      const initialPreviews = [null, null, null, null, null];
      if (Array.isArray(data.images) && data.images.length > 0) {
        data.images.slice(0, 5).forEach((url, i) => initialPreviews[i] = url);
      } else if (data.imageUrl) {
        initialPreviews[0] = data.imageUrl;
      }
      setPreviews(initialPreviews);
    };

    load();
  }, [id, showToast]);

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleIntegerFieldChange = (field, value) => {
    updateField(field, coerceAdminNumberInput(String(product?.[field] ?? ""), value));
  };

  const handleDecimalFieldChange = (field, value) => {
    updateField(
      field,
      coerceAdminNumberInput(String(product?.[field] ?? ""), value, { allowDecimal: true })
    );
  };

  const handleFileChange = (index, event) => {
    const file = event.target.files[0];
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
    newFiles[index] = null;
    setImageFiles(newFiles);

    const newPreviews = [...previews];
    // Don't revoke Cloudinary URLs
    if (newPreviews[index] && newPreviews[index].startsWith("blob:")) {
      URL.revokeObjectURL(newPreviews[index]);
    }
    newPreviews[index] = null;
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

      throw new Error("Image is still too large after compression. Please use a smaller image.");
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  const uploadToCloudinary = async (file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      { method: "POST", body: form }
    );

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const cloudinaryMsg =
        data?.error?.message ||
        data?.message ||
        `Upload failed (HTTP ${response.status})`;
      throw new Error(cloudinaryMsg);
    }

    if (!data?.secure_url) throw new Error("Cloudinary upload failed: missing secure_url");

    return data.secure_url;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const uploadPromises = previews.map(async (previewUrl, index) => {
        if (!previewUrl) return null; // Slot is empty
        const file = imageFiles[index];
        if (file) {
          // New file selected for this slot, upload it
          const fileToUpload = await compressToWebpUnderLimit(file, MAX_UPLOAD_BYTES);
          return await uploadToCloudinary(fileToUpload);
        } else {
          // Existing Cloudinary URL
          return previewUrl;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const finalImages = uploadedUrls.filter(url => url !== null);
      
      if (finalImages.length === 0) {
        throw new Error("Please select at least a primary product image (Slot 1).");
      }

      const imageUrl = finalImages[0];

      const payload = {
        ...product,
        price: parseAdminNumber(product.price),
        weightGrams: parseAdminNumber(product.weightGrams),
        quantityPack: parseAdminNumber(product.quantityPack),
        dimensions: product.dimensions
          ? `${product.dimensions.replace(/\s*(cm|mm)$/i, "")}${product.dimensionUnit || "cm"}`
          : "",
        waxType: product.waxType === "other" ? (product.waxTypeOther || "other") : product.waxType,
        imageUrl,
        thumbnailUrl: imageUrl,
        images: finalImages,
        altText: product.name,
      };

      await updateProduct(id, payload, idToken);

      showToast("Product updated successfully");
      scrollToTop();
      setTimeout(() => navigate("/admin"), 800);
    } catch (error) {
      showToast(error.message || "Failed to update product", "error");
    }

    setLoading(false);
  };

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-gray-400 animate-pulse">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans max-w-4xl">
      <div className="flex flex-row items-center justify-between gap-2 px-1 pt-1 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-none">Refine Product</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Update item details & imagery</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NAME */}
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="edit-product-name" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-product-name"
                value={product.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Lavender Scented Candle"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm font-medium"
              />
            </div>

            {/* CATEGORY */}
            <div className="space-y-1.5">
              <label htmlFor="edit-product-category" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="edit-product-category"
                value={product.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm font-medium appearance-none"
              >
                <option value="">Select Category</option>
                {product.category && !KNOWN_CATEGORIES.includes(product.category) && (
                  <option value={product.category}>{product.category} (current)</option>
                )}
                <option value="flower">Flower</option>
                <option value="animal">Animal</option>
                <option value="festive">Festive</option>
                <option value="special">Special</option>
                <option value="glassJar">Glass Jar</option>
              </select>
            </div>

            {/* WAX TYPE */}
            <div className="space-y-1.5">
              <label htmlFor="edit-product-wax-type" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Wax Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  id="edit-product-wax-type"
                  value={product.waxType}
                  onChange={(e) => updateField("waxType", e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm font-medium appearance-none"
                >
                  <option value="soy">Soy</option>
                  <option value="gel">Gel</option>
                  <option value="other">Other</option>
                </select>
                {product.waxType === "other" && (
                  <input
                    value={product.waxTypeOther || ""}
                    onChange={(e) => updateField("waxTypeOther", e.target.value)}
                    placeholder="Type..."
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm font-medium"
                  />
                )}
              </div>
            </div>

            {/* WEIGHT */}
            <div className="space-y-1.5">
              <label htmlFor="edit-product-weight" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Weight <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-product-weight"
                  type="text"
                  inputMode="numeric"
                  value={product.weightGrams}
                  onChange={(e) => handleIntegerFieldChange("weightGrams", e.target.value)}
                  onWheel={preventNumberWheelChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm font-medium pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">g</span>
              </div>
            </div>

            {/* BURN TIME */}
            <div className="space-y-1.5">
              <label htmlFor="edit-product-burn-time" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Burn Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-product-burn-time"
                  type="text"
                  value={product.burnTimeHours}
                  onChange={(e) => updateField("burnTimeHours", e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm font-medium pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">hr</span>
              </div>
            </div>

            {/* PRICE */}
            <div className="space-y-1.5">
              <label htmlFor="edit-product-price" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₹</span>
                <input
                  id="edit-product-price"
                  type="text"
                  inputMode="decimal"
                  value={product.price}
                  onChange={(e) => handleDecimalFieldChange("price", e.target.value)}
                  onWheel={preventNumberWheelChange}
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* QUANTITY PACK */}
            <div className="space-y-1.5">
              <label htmlFor="edit-product-quantity-pack" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Quantity Per Pack <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-product-quantity-pack"
                type="text"
                inputMode="numeric"
                value={product.quantityPack}
                onChange={(e) => handleIntegerFieldChange("quantityPack", e.target.value)}
                onWheel={preventNumberWheelChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* IMAGE UPLOAD - MULTI SLOT */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              Product Images (Up to 5)
            </label>
            <div className="flex flex-wrap gap-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="relative w-24 h-24 sm:w-28 sm:h-28 border rounded-2xl flex items-center justify-center bg-gray-50 overflow-hidden shrink-0 border-dashed border-gray-200">
                  {previews[index] ? (
                    <>
                      <img src={previews[index]} className="w-full h-full object-cover" alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm shadow"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition">
                      <span className="text-gray-300 text-2xl">+</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {index === 0 ? "Primary ★" : "Extra"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(index, e)}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-400 font-medium italic">Recommended size: 800x800px. Max 10MB per image.</p>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-gray-200 flex items-center gap-2"
            >
              {loading && <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
