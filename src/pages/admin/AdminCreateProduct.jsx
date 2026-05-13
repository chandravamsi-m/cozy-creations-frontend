// src/pages/admin/AdminCreateProduct.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { createProduct } from "../../api/adminProducts";
import {
  coerceAdminNumberInput,
  parseAdminNumber,
  preventNumberWheelChange,
} from "../../utils/adminNumberInputs";

// You can override these via Vite env vars:
// - VITE_CLOUDINARY_CLOUD_NAME
// - VITE_CLOUDINARY_UPLOAD_PRESET
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
// Cloudinary (free tier / many presets) commonly enforce a 10MB upload limit.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

export default function AdminCreateProduct() {
  const { idToken } = useAuth();

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

  const [imageFiles, setImageFiles] = useState([null, null, null, null, null]);
  const [previews, setPreviews] = useState([null, null, null, null, null]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleIntegerFieldChange = (field, value) => {
    updateField(field, coerceAdminNumberInput(String(product[field] ?? ""), value));
  };

  const handleDecimalFieldChange = (field, value) => {
    updateField(field, coerceAdminNumberInput(String(product[field] ?? ""), value, { allowDecimal: true }));
  };

  // IMAGE PREVIEW
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
    newFiles[index] = null;
    setImageFiles(newFiles);

    const newPreviews = [...previews];
    if (newPreviews[index]) URL.revokeObjectURL(newPreviews[index]);
    newPreviews[index] = null;
    setPreviews(newPreviews);
  };

  // Compress/convert image to WebP by reducing dimensions (keep quality high).
  // This avoids Cloudinary 10MB limits without showing pre-validation errors.
  const compressToWebpUnderLimit = async (file, maxBytes = MAX_UPLOAD_BYTES) => {
    // If already small enough and is an image, we still convert to webp (per request).
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

      const quality = 0.95; // keep quality high; we primarily reduce dimensions
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

        // Reduce dimensions further (not quality) to lower size.
        scale *= 0.85;
      }

      // If still too big after attempts, return best-effort WebP (last attempt)
      // but signal failure so we can show a clear message.
      throw new Error(
        `Image is still too large after compression. Please use a smaller image.`
      );
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  // CLOUDINARY UPLOAD
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
      // ignore JSON parse failure; we'll throw a generic error below
    }

    if (!res.ok) {
      const cloudinaryMsg =
        data?.error?.message ||
        data?.message ||
        `Upload failed (HTTP ${res.status})`;
      throw new Error(cloudinaryMsg);
    }

    if (!data?.secure_url) throw new Error("Image upload failed: missing secure_url from Cloudinary");
    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (!imageFiles[0]) {
        setMsg("Please select a primary product image (Slot 1).");
        setLoading(false);
        return;
      }

      // 1️⃣ Upload all selected images in parallel
      const uploadPromises = imageFiles.map(async (file, index) => {
        if (!file) return null;
        const fileToUpload = await compressToWebpUnderLimit(file, MAX_UPLOAD_BYTES);
        return await uploadToCloudinary(fileToUpload);
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const finalImages = uploadedUrls.filter(url => url !== null);
      const imageUrl = finalImages[0];

      // 2️⃣ Prepare payload
      const { waxTypeOther, ...productWithoutWaxTypeOther } = product;
      const payload = {
        ...productWithoutWaxTypeOther,
        price: parseAdminNumber(product.price),
        weightGrams: parseAdminNumber(product.weightGrams),
        quantityPack: parseAdminNumber(product.quantityPack),
        burnTimeHours: product.burnTimeHours || "",
        dimensions: product.dimensions ? `${product.dimensions.replace(/\s*(cm|mm)$/i, "")}${product.dimensionUnit || "cm"}` : "",
        waxType: product.waxType === "other" ? (waxTypeOther || "other") : product.waxType,
        customizableFragrance: product.customizableFragrance === "true" || product.customizableFragrance === true,
        customizableColor: product.customizableColor === "true" || product.customizableColor === true,
        imageUrl,
        thumbnailUrl: imageUrl,
        images: finalImages,
        altText: product.name, // Auto-set from product name
      };

      // 3️⃣ Send to backend
      await createProduct(payload, idToken);

      setMsg("Product created successfully ✔");

      // Reset form
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
      });
      setImageFiles([null, null, null, null, null]);
      setPreviews([null, null, null, null, null]);

    } catch (err) {
      setMsg("Error: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-5 max-w-xl">
      <h2 className="text-xl font-semibold mb-4">Add New Product</h2>

      {msg && <p className="mb-3">{msg}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* NAME */}
        <div className="space-y-1">
          <label htmlFor="product-name" className="text-sm font-medium text-gray-800">
            Product Name <span className="text-red-600">*</span>
          </label>
          <input
            id="product-name"
            value={product.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Product Name"
            className="border p-2 w-full rounded"
          />
        </div>

        {/* CATEGORY */}
        <div className="space-y-1">
          <label htmlFor="product-category" className="text-sm font-medium text-gray-800">
            Category <span className="text-red-600">*</span>
          </label>
          <select
            id="product-category"
            value={product.category}
            onChange={(e) => updateField("category", e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="">Select Category</option>
            <option value="flower">Flower</option>
            <option value="animal">Animal</option>
            <option value="festive">Festive</option>
            <option value="special">Special</option>
            <option value="glassJar">Glass Jar</option>
          </select>
        </div>

        {/* ROW 1 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="product-wax-type" className="text-sm font-medium text-gray-800">
              Wax Type <span className="text-red-600">*</span>
            </label>
            <select
              id="product-wax-type"
              value={product.waxType}
              onChange={(e) => updateField("waxType", e.target.value)}
              className="border p-2 w-full rounded"
            >
              <option value="soy">Soy</option>
              <option value="gel">Gel</option>
              <option value="other">Other</option>
            </select>
            {product.waxType === "other" && (
              <input
                value={product.waxTypeOther}
                onChange={(e) => updateField("waxTypeOther", e.target.value)}
                placeholder="Enter wax type"
                className="border p-2 w-full rounded"
              />
            )}
          </div>

          <div className="space-y-1 w-full">
            <label htmlFor="product-weight" className="text-sm font-medium text-gray-800">
              Weight <span className="text-red-600">*</span>
            </label>
            <div className="relative w-full">
              <input
                id="product-weight"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={product.weightGrams}
                onChange={(e) => handleIntegerFieldChange("weightGrams", e.target.value)}
                onWheel={preventNumberWheelChange}
                placeholder="Weight"
                className="border p-2 pr-12 w-full rounded"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                g
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="product-burn-time" className="text-sm font-medium text-gray-800">
              Burn Time <span className="text-red-600">*</span>
            </label>
            <div className="relative w-full">
              <input
                id="product-burn-time"
                type="text"
                value={product.burnTimeHours}
                onChange={(e) => updateField("burnTimeHours", e.target.value)}
                placeholder="Burn Time"
                className="border p-2 pr-14 w-full rounded"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                hr
              </span>
            </div>
          </div>

          <div className="space-y-1 w-full">
            <label htmlFor="product-dimensions" className="text-sm font-medium text-gray-800">
              Dimensions (Optional)
            </label>
            <div className="relative w-full">
              <input
                id="product-dimensions"
                type="text"
                value={product.dimensions}
                onChange={(e) => updateField("dimensions", e.target.value)}
                placeholder="e.g., 6x10"
                className="border p-2 pr-16 w-full rounded"
              />
              <select
                value={product.dimensionUnit}
                onChange={(e) => updateField("dimensionUnit", e.target.value)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-sm text-gray-600 bg-gray-50 border-l border-gray-200 h-[calc(100%-8px)] px-1 rounded-r focus:outline-none"
              >
                <option value="cm">cm</option>
                <option value="mm">mm</option>
              </select>
            </div>
          </div>
        </div>

        {/* ROW 3 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="product-price" className="text-sm font-medium text-gray-800">
              Price <span className="text-red-600">*</span>
            </label>
            <input
              id="product-price"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.]?[0-9]*"
              value={product.price}
              onChange={(e) => handleDecimalFieldChange("price", e.target.value)}
              onWheel={preventNumberWheelChange}
              placeholder="Price"
              className="border p-2 w-full rounded"
            />
          </div>
        </div>

        {/* Quantity Pack */}
        <div className="space-y-1">
          <label htmlFor="product-quantity-pack" className="text-sm font-medium text-gray-800">
            Quantity Pack <span className="text-red-600">*</span>
          </label>
          <input
            id="product-quantity-pack"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={product.quantityPack}
            onChange={(e) => handleIntegerFieldChange("quantityPack", e.target.value)}
            onWheel={preventNumberWheelChange}
            placeholder="Quantity Pack"
            className="border p-2 w-full rounded"
          />
        </div>

        {/* ROW: Customizations */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="product-custom-fragrance" className="text-sm font-medium text-gray-800">
              Customizable Fragrance
            </label>
            <select
              id="product-custom-fragrance"
              value={product.customizableFragrance}
              onChange={(e) => updateField("customizableFragrance", e.target.value)}
              className="border p-2 w-full rounded"
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
              className="border p-2 w-full rounded"
            >
              <option value="true">Color: Yes</option>
              <option value="false">Color: No</option>
            </select>
          </div>
        </div>
        
        {/* IMAGE UPLOAD - MULTI SLOT */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2">
            Product Images (Up to 5) <span className="text-red-600">*</span>
          </label>
          <div className="flex flex-wrap gap-4">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="relative w-24 h-24 border rounded flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                {previews[index] ? (
                  <>
                    <img src={previews[index]} className="w-full h-full object-cover" alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition">
                    <span className="text-gray-400 text-2xl">+</span>
                    <span className="text-[10px] text-gray-500 font-medium">
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
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50 mt-4"
        >
          {loading ? "Creating..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}
