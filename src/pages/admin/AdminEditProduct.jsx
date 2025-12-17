import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { updateProduct } from "../../api/adminProducts";

const CLOUD_NAME = "dlrtaxlcl";
const UPLOAD_PRESET = "cozy_unsigned";

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
      setProduct({
        name: data.name || "",
        category: data.category || "",
        price: data.price || 0,
        weightGrams: data.weightGrams || 0,
        waxType: data.waxType || "soy",
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

  // Upload to Cloudinary
  const uploadToCloudinary = async (file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      { method: "POST", body: form }
    );

    const data = await res.json();
    if (!data.secure_url) throw new Error("Cloudinary upload failed");

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
        imageUrl = await uploadToCloudinary(imageFile);
      }

      const payload = {
        ...product,
        price: Number(product.price),
        weightGrams: Number(product.weightGrams),
        quantityPack: Number(product.quantityPack),
        inventory: Number(product.inventory),
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
    <div className="p-4 max-w-lg">
      <h2 className="text-xl font-semibold mb-3">Edit Product</h2>

      {msg && <p className="my-2">{msg}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={product.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Product Name"
          className="border p-2 w-full"
        />

        <input
          value={product.category}
          onChange={(e) => updateField("category", e.target.value)}
          placeholder="Category (flower, animal, etc)"
          className="border p-2 w-full"
        />

        <input
          type="number"
          value={product.price}
          onChange={(e) => updateField("price", e.target.value)}
          placeholder="Price"
          className="border p-2 w-full"
        />

        <input
          type="number"
          value={product.weightGrams}
          onChange={(e) => updateField("weightGrams", e.target.value)}
          placeholder="Weight (grams)"
          className="border p-2 w-full"
        />

        <input
          type="number"
          value={product.quantityPack}
          onChange={(e) => updateField("quantityPack", e.target.value)}
          placeholder="Quantity Per Pack"
          className="border p-2 w-full"
        />

        <input
          value={product.burnTimeHours}
          onChange={(e) => updateField("burnTimeHours", e.target.value)}
          placeholder="Burn Time (hours)"
          className="border p-2 w-full"
        />

        <input
          value={product.altText}
          onChange={(e) => updateField("altText", e.target.value)}
          placeholder="Alt Text"
          className="border p-2 w-full"
        />

        {/* ⭐ INVENTORY FIELD */}
        <input
          type="number"
          value={product.inventory}
          onChange={(e) => updateField("inventory", e.target.value)}
          placeholder="Inventory"
          className="border p-2 w-full"
        />

        {/* Image Upload */}
        <div>
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
