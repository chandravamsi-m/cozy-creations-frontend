import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { updateProduct } from "../../api/adminProducts";

// You can override these via Vite env vars:
// - VITE_CLOUDINARY_CLOUD_NAME
// - VITE_CLOUDINARY_UPLOAD_PRESET
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dlrtaxlcl";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "cozy_unsigned";
// Cloudinary (free tier / many presets) commonly enforce a 10MB upload limit.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

const KNOWN_CATEGORIES = ["flower", "animal", "festive", "special", "glassJar"];
const KNOWN_WAX_TYPES = ["soy", "gel"];

export default function AdminEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { idToken } = useAuth();

  const [product, setProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch product from Firestore
  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "products", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setMsg("Product not found");
        return;
      }

      const data = snap.data();
      const initialWaxType = data.waxType || "soy";
      const isKnownWaxType = KNOWN_WAX_TYPES.includes(initialWaxType);
      setProduct({
        name: data.name || "",
        category: data.category || "",
        price: data.price || 0,
        weightGrams: data.weightGrams || 0,
        waxType: isKnownWaxType ? initialWaxType : "other",
        waxTypeOther: isKnownWaxType ? "" : initialWaxType,
        quantityPack: data.quantityPack || 1,
        burnTimeHours: data.burnTimeHours || "",
        customizableFragrance: data.customizableFragrance ?? true,
        customizableColor: data.customizableColor ?? true,
        altText: data.altText || "",
        inventory: data.inventory ?? 0, // ⭐ include inventory
        imageUrl: data.imageUrl,
      });

      setPreview(data.imageUrl); // show existing image
    };

    load();
  }, [id]);

  // Update field
  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  // Image change handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  // Compress/convert image to WebP by reducing dimensions (keep quality high).
  // This keeps uploads under Cloudinary's file size limits without changing the rest of the flow.
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

      const quality = 0.95; // keep quality high; reduce dimensions first
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

      throw new Error("Image is still too large after compression. Please use a smaller image.");
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  // Upload to Cloudinary
  const uploadToCloudinary = async (file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      { method: "POST", body: form }
    );

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

    if (!data?.secure_url) throw new Error("Cloudinary upload failed: missing secure_url");

    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      let imageUrl = product.imageUrl;

      // Upload new image only if selected
      if (imageFile) {
        const fileToUpload = await compressToWebpUnderLimit(imageFile, MAX_UPLOAD_BYTES);
        imageUrl = await uploadToCloudinary(fileToUpload);
      }

      const payload = {
        // Don't persist helper-only UI fields like waxTypeOther
        ...(() => {
          const { waxTypeOther, ...rest } = product;
          return rest;
        })(),
        price: Number(product.price),
        weightGrams: Number(product.weightGrams),
        quantityPack: Number(product.quantityPack),
        inventory: Number(product.inventory),
        waxType: product.waxType === "other" ? (product.waxTypeOther || "other") : product.waxType,
        imageUrl,
      };

      await updateProduct(id, payload, idToken);

      setMsg("Product updated ✔");
      setTimeout(() => navigate("/admin"), 800);
    } catch (err) {
      setMsg("Error: " + err.message);
    }

    setLoading(false);
  };

  if (!product) return <p className="p-4">Loading product...</p>;

  return (
    <div className="p-4 sm:p-5 max-w-xl">
      <h2 className="text-xl font-semibold mb-3">Edit Product</h2>

      {msg && <p className="my-2">{msg}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="edit-product-name" className="text-sm font-medium text-gray-800">
            Product Name <span className="text-red-600">*</span>
          </label>
          <input
            id="edit-product-name"
            value={product.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Product Name"
            className="border p-2 w-full rounded"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-product-category" className="text-sm font-medium text-gray-800">
            Category <span className="text-red-600">*</span>
          </label>
          <select
            id="edit-product-category"
            value={product.category}
            onChange={(e) => updateField("category", e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="">Select Category</option>
            {/* Preserve any existing category value not in our known list */}
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

        {/* ROW 1 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="edit-product-wax-type" className="text-sm font-medium text-gray-800">
              Wax Type <span className="text-red-600">*</span>
            </label>
            <select
              id="edit-product-wax-type"
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
                value={product.waxTypeOther || ""}
                onChange={(e) => updateField("waxTypeOther", e.target.value)}
                placeholder="Enter wax type"
                className="border p-2 w-full rounded"
              />
            )}
          </div>

          <div className="space-y-1 w-full">
            <label htmlFor="edit-product-weight" className="text-sm font-medium text-gray-800">
              Weight <span className="text-red-600">*</span>
            </label>
            <div className="relative w-full">
              <input
                id="edit-product-weight"
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="edit-product-burn-time" className="text-sm font-medium text-gray-800">
              Burn Time <span className="text-red-600">*</span>
            </label>
            <div className="relative w-full">
              <input
                id="edit-product-burn-time"
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
            <label htmlFor="edit-product-price" className="text-sm font-medium text-gray-800">
              Price <span className="text-red-600">*</span>
            </label>
            <input
              id="edit-product-price"
              type="number"
              value={product.price}
              onChange={(e) => updateField("price", e.target.value)}
              placeholder="Price"
              className="border p-2 w-full rounded"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-product-quantity-pack" className="text-sm font-medium text-gray-800">
            Quantity Per Pack <span className="text-red-600">*</span>
          </label>
          <input
            id="edit-product-quantity-pack"
            type="number"
            value={product.quantityPack}
            onChange={(e) => updateField("quantityPack", e.target.value)}
            placeholder="Quantity Per Pack"
            className="border p-2 w-full rounded"
          />
        </div>

        {/* ROW: Customizations */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="edit-product-custom-fragrance" className="text-sm font-medium text-gray-800">
              Customizable Fragrance
            </label>
            <select
              id="edit-product-custom-fragrance"
              value={product.customizableFragrance}
              onChange={(e) => updateField("customizableFragrance", e.target.value)}
              className="border p-2 w-full rounded"
            >
              <option value="true">Fragrance: Yes</option>
              <option value="false">Fragrance: No</option>
            </select>
          </div>

          <div className="space-y-1 w-full">
            <label htmlFor="edit-product-custom-color" className="text-sm font-medium text-gray-800">
              Customizable Color
            </label>
            <select
              id="edit-product-custom-color"
              value={product.customizableColor}
              onChange={(e) => updateField("customizableColor", e.target.value)}
              className="border p-2 w-full rounded"
            >
              <option value="true">Color: Yes</option>
              <option value="false">Color: No</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-product-alt-text" className="text-sm font-medium text-gray-800">
            Alt Text <span className="text-red-600">*</span>
          </label>
          <input
            id="edit-product-alt-text"
            value={product.altText}
            onChange={(e) => updateField("altText", e.target.value)}
            placeholder="Alt Text"
            className="border p-2 w-full rounded"
          />
        </div>

        {/* ⭐ INVENTORY FIELD */}
        <div className="space-y-1">
          <label htmlFor="edit-product-inventory" className="text-sm font-medium text-gray-800">
            Inventory <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            id="edit-product-inventory"
            type="number"
            value={product.inventory}
            onChange={(e) => updateField("inventory", e.target.value)}
            placeholder="Inventory"
            className="border p-2 w-full rounded"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-1">
            Product Image <span className="text-red-600">*</span>
          </label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {preview && (
            <img src={preview} className="w-32 mt-2 rounded border" />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
