// src/pages/admin/AdminCreateProduct.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { createProduct } from "../../api/adminProducts";

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
    price: "",
    quantityPack: "",
    customizableFragrance: true,
    customizableColor: true,
    altText: "",
    inventory: "", // NEW FIELD
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  // IMAGE PREVIEW
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) setPreview(URL.createObjectURL(file));
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
      if (!imageFile) {
        setMsg("Please select a product image.");
        setLoading(false);
        return;
      }

      // 1️⃣ Upload image
      const fileToUpload = await compressToWebpUnderLimit(imageFile, MAX_UPLOAD_BYTES);
      const imageUrl = await uploadToCloudinary(fileToUpload);

      // 2️⃣ Prepare payload
      const { waxTypeOther, ...productWithoutWaxTypeOther } = product;
      const payload = {
        ...productWithoutWaxTypeOther,
        price: Number(product.price),
        weightGrams: Number(product.weightGrams),
        quantityPack: Number(product.quantityPack),
        burnTimeHours: product.burnTimeHours || "",
        waxType: product.waxType === "other" ? (waxTypeOther || "other") : product.waxType,
        customizableFragrance: product.customizableFragrance === "true" || product.customizableFragrance === true,
        customizableColor: product.customizableColor === "true" || product.customizableColor === true,
        inventory: product.inventory ? Number(product.inventory) : 100, // DEFAULT VALUE
        imageUrl,
        thumbnailUrl: imageUrl, // you used imageUrl for thumbnail previously
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
        price: "",
        quantityPack: "",
        customizableFragrance: true,
        customizableColor: true,
        altText: "",
        inventory: "",
      });
      setImageFile(null);
      setPreview(null);

    } catch (err) {
      setMsg("Error: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="p-5 max-w-xl">
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
        <div className="flex gap-3">
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
                type="number"
                value={product.weightGrams}
                onChange={(e) => updateField("weightGrams", e.target.value)}
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
        <div className="flex gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="product-burn-time" className="text-sm font-medium text-gray-800">
              Burn Time <span className="text-red-600">*</span>
            </label>
            <div className="relative w-full">
              <input
                id="product-burn-time"
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
            <label htmlFor="product-price" className="text-sm font-medium text-gray-800">
              Price <span className="text-red-600">*</span>
            </label>
            <input
              id="product-price"
              type="number"
              value={product.price}
              onChange={(e) => updateField("price", e.target.value)}
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
            type="number"
            value={product.quantityPack}
            onChange={(e) => updateField("quantityPack", e.target.value)}
            placeholder="Quantity Pack"
            className="border p-2 w-full rounded"
          />
        </div>

        {/* ROW: Customizations */}
        <div className="flex gap-3">
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

        {/* ALT TEXT */}
        <div className="space-y-1">
          <label htmlFor="product-alt-text" className="text-sm font-medium text-gray-800">
            Alt Text <span className="text-red-600">*</span>
          </label>
          <input
            id="product-alt-text"
            value={product.altText}
            onChange={(e) => updateField("altText", e.target.value)}
            placeholder="Alt Text"
            className="border p-2 w-full rounded"
          />
        </div>

        {/* INVENTORY (NEW FIELD) */}
        <div className="space-y-1">
          <label htmlFor="product-inventory" className="text-sm font-medium text-gray-800">
            Inventory <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            id="product-inventory"
            type="number"
            value={product.inventory}
            onChange={(e) => updateField("inventory", e.target.value)}
            placeholder="Inventory (default 100)"
            className="border p-2 w-full rounded"
          />
        </div>

        {/* IMAGE UPLOAD */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-1">
            Product Image <span className="text-red-600">*</span>
          </label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {preview && (
            <img src={preview} className="w-40 mt-2 rounded border" />
          )}
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}
