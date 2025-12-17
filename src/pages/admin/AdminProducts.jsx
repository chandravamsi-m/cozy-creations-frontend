// src/pages/admin/AdminProducts.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { deleteProduct } from "../../api/adminProducts";
import { useNavigate } from "react-router-dom";

export default function AdminProducts() {
  const { idToken } = useAuth();
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  const loadProducts = async () => {
    const snap = await getDocs(collection(db, "products"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setProducts(list);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this product?")) return;

    await deleteProduct(id, idToken);
    loadProducts();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">All Products</h2>

        <button
          onClick={() => navigate("/admin/create")}
          className="px-4 py-2 bg-black text-white rounded"
        >
          + Add Product
        </button>
      </div>

      {products.map((p) => (
        <div
          key={p.id}
          className="border p-3 mb-3 rounded flex justify-between items-center bg-white"
        >
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-gray-500">₹{p.price}</p>
            {!p.isActive && (
              <span className="text-red-500 text-xs">INACTIVE</span>
            )}
          </div>

          <div className="flex gap-3">
            <button
  onClick={() => navigate(`/admin/products/${p.id}/edit`)}
  className="px-3 py-1 bg-blue-600 text-white rounded"
>
  Edit
</button>

            <button
              onClick={() => handleDelete(p.id)}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
