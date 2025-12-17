// src/pages/admin/AdminCreateProduct.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { createProduct } from "../../api/adminProducts";

const CLOUD_NAME = "dlrtaxlcl";
const UPLOAD_PRESET = "cozy_unsigned";

export default function AdminCreateProduct() {
  const { idToken } = useAuth();

  const [product, setProduct] = useState({
    name: "",
    category: "",
    waxType: "soy",
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

  // CLOUDINARY UPLOAD
  const uploadToCloudinary = async (file) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json();

    if (!data.secure_url) throw new Error("Image upload failed");
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
      const imageUrl = await uploadToCloudinary(imageFile);

      // 2️⃣ Prepare payload
      const payload = {
        ...product,
        price: Number(product.price),
        weightGrams: Number(product.weightGrams),
        quantityPack: Number(product.quantityPack),
        burnTimeHours: product.burnTimeHours || "",
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
        <input
          value={product.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Product Name"
          className="border p-2 w-full"
        />

        {/* CATEGORY */}
        <select
          value={product.category}
          onChange={(e) => updateField("category", e.target.value)}
          className="border p-2 w-full"
        >
          <option value="">Select Category</option>
          <option value="flower">Flower</option>
          <option value="animal">Animal</option>
          <option value="festive">Festive</option>
          <option value="special">Special</option>
          <option value="glassJar">Glass Jar</option>
        </select>

        {/* ROW 1 */}
        <div className="flex gap-3">
          <select
            value={product.waxType}
            onChange={(e) => updateField("waxType", e.target.value)}
            className="border p-2 w-full"
          >
            <option value="soy">Soy</option>
            <option value="gel">Gel</option>
          </select>

          <input
            type="number"
            value={product.weightGrams}
            onChange={(e) => updateField("weightGrams", e.target.value)}
            placeholder="Weight (grams)"
            className="border p-2 w-full"
          />
        </div>

        {/* ROW 2 */}
        <div className="flex gap-3">
          <input
            value={product.burnTimeHours}
            onChange={(e) => updateField("burnTimeHours", e.target.value)}
            placeholder="Burn Time (hours)"
            className="border p-2 w-full"
          />

          <input
            type="number"
            value={product.price}
            onChange={(e) => updateField("price", e.target.value)}
            placeholder="Price"
            className="border p-2 w-full"
          />
        </div>

        {/* Quantity Pack */}
        <input
          type="number"
          value={product.quantityPack}
          onChange={(e) => updateField("quantityPack", e.target.value)}
          placeholder="Quantity Pack"
          className="border p-2 w-full"
        />

        {/* ROW: Customizations */}
        <div className="flex gap-3">
          <select
            value={product.customizableFragrance}
            onChange={(e) => updateField("customizableFragrance", e.target.value)}
            className="border p-2 w-full"
          >
            <option value="true">Fragrance: Yes</option>
            <option value="false">Fragrance: No</option>
          </select>

          <select
            value={product.customizableColor}
            onChange={(e) => updateField("customizableColor", e.target.value)}
            className="border p-2 w-full"
          >
            <option value="true">Color: Yes</option>
            <option value="false">Color: No</option>
          </select>
        </div>

        {/* ALT TEXT */}
        <input
          value={product.altText}
          onChange={(e) => updateField("altText", e.target.value)}
          placeholder="Alt Text"
          className="border p-2 w-full"
        />

        {/* INVENTORY (NEW FIELD) */}
        <input
          type="number"
          value={product.inventory}
          onChange={(e) => updateField("inventory", e.target.value)}
          placeholder="Inventory (default 100)"
          className="border p-2 w-full"
        />

        {/* IMAGE UPLOAD */}
        <div>
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
