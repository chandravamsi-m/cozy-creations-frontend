// src/pages/admin/AdminProducts.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { deleteProduct, updateProduct, permanentlyDeleteProduct, generateCatalogue } from "../../api/adminProducts";
import { useNavigate } from "react-router-dom";

export default function AdminProducts() {
  const { idToken } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const navigate = useNavigate();

  const toCloudinaryThumb = (url) => {
    if (!url || typeof url !== "string") return "";
    // If it's a Cloudinary delivery URL, request an optimized thumbnail for faster scrolling.
    // This avoids downloading large originals on the list page.
    if (!url.includes("res.cloudinary.com")) return url;
    if (!url.includes("/image/upload/")) return url;
    const parts = url.split("/image/upload/");
    if (parts.length !== 2) return url;
    // Higher quality thumbnails for the admin view
    return `${parts[0]}/image/upload/w_600,h_450,c_fill,q_auto,f_auto/${parts[1]}`;
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(list);
    } catch (error) {
      console.error("Error loading products:", error);
      // Set empty array on error so UI shows "no products" message
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this product?")) return;

    await deleteProduct(id, idToken);
    loadProducts();
  };

  const handleActivate = async (id) => {
    if (!window.confirm("Activate this product?")) return;

    await updateProduct(id, { isActive: true }, idToken);
    loadProducts();
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold">All Products</h2>
          <p className="text-sm text-gray-500">
            {loading ? "Loading products..." : `${products.length} product(s)`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleGenerateCatalogue}
            disabled={loading || catalogueLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {catalogueLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>📄 Generate Catalogue</>
            )}
          </button>
          <button
            onClick={() => navigate("/admin/create")}
            className="px-4 py-2 bg-black text-white rounded"
          >
            + Add Product
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
            onClick={() => navigate("/admin/create")}
            className="mt-4 px-4 py-2 bg-black text-white rounded"
          >
            + Add Product
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((p) => {
          const img = toCloudinaryThumb(p.thumbnailUrl || p.imageUrl || "");
          return (
            <div
              key={p.id}
              className="border rounded bg-white overflow-hidden flex flex-col h-full"
            >
              <div className="w-full aspect-[4/3] bg-gray-100">
                {img ? (
                  <img
                    src={img}
                    alt={p.altText || p.name || "Product image"}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                    No image
                  </div>
                )}
              </div>

              <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-5 line-clamp-2 min-h-[2.5rem]">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">₹{p.price}</p>
                  </div>
                  {!p.isActive && (
                    <span className="shrink-0 text-red-600 text-xs font-semibold border border-red-200 bg-red-50 px-2 py-0.5 rounded">
                      INACTIVE
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1 min-h-[2.5rem]">
                  {p.category && <span>Category: {p.category}</span>}
                  {p.waxType && <span>Wax: {p.waxType}</span>}
                  {p.dimensions && <span>Size: {p.dimensions}</span>}
                  {typeof p.inventory !== "undefined" && (
                    <span>Inventory: {p.inventory}</span>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                    className="flex-1 min-w-[60px] whitespace-nowrap px-2 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>

                  {p.isActive === false ? (
                    <button
                      onClick={() => handleActivate(p.id)}
                      className="flex-1 min-w-[80px] whitespace-nowrap px-2 py-1.5 text-xs sm:text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                    >
                      Activate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex-1 min-w-[80px] whitespace-nowrap px-2 py-1.5 text-xs sm:text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                    >
                      Deactivate
                    </button>
                  )}

                  <button
                    onClick={() => handlePermanentDelete(p.id)}
                    className="w-full mt-1 px-2 py-1.5 text-xs sm:text-sm border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors font-medium"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
