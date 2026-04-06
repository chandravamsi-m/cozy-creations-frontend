import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { updateProduct } from "../../api/adminProducts";
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
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
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

      setPreview(data.imageUrl || null);
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
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
      let imageUrl = product.imageUrl;

      if (imageFile) {
        const fileToUpload = await compressToWebpUnderLimit(imageFile, MAX_UPLOAD_BYTES);
        imageUrl = await uploadToCloudinary(fileToUpload);
      }

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

  if (!product) return <p className="p-4">Loading product...</p>;

  return (
    <div className="p-4 sm:p-5 max-w-xl">
      <h2 className="text-xl font-semibold mb-3">Edit Product</h2>

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

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="edit-product-burn-time" className="text-sm font-medium text-gray-800">
              Burn Time <span className="text-red-600">*</span>
            </label>
            <div className="relative w-full">
              <input
                id="edit-product-burn-time"
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
            <label htmlFor="edit-product-dimensions" className="text-sm font-medium text-gray-800">
              Dimensions (Optional)
            </label>
            <div className="relative w-full">
              <input
                id="edit-product-dimensions"
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

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1 w-full">
            <label htmlFor="edit-product-price" className="text-sm font-medium text-gray-800">
              Price <span className="text-red-600">*</span>
            </label>
            <input
              id="edit-product-price"
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

        <div className="space-y-1">
          <label htmlFor="edit-product-quantity-pack" className="text-sm font-medium text-gray-800">
            Quantity Per Pack <span className="text-red-600">*</span>
          </label>
          <input
            id="edit-product-quantity-pack"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={product.quantityPack}
            onChange={(e) => handleIntegerFieldChange("quantityPack", e.target.value)}
            onWheel={preventNumberWheelChange}
            placeholder="Quantity Per Pack"
            className="border p-2 w-full rounded"
          />
        </div>

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

        <div>
          <label className="text-sm font-medium text-gray-800 block mb-1">
            Product Image <span className="text-red-600">*</span>
          </label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {preview && (
            <img src={preview} className="w-32 mt-2 rounded border" alt="Preview" />
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
