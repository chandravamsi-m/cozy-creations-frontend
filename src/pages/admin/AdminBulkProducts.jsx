// src/pages/admin/AdminBulkProducts.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useProducts } from "../../contexts/ProductsContext";
import { updateProduct, deleteProduct, permanentlyDeleteProduct, generateBulkCatalogue } from "../../api/adminProducts";
import ProductForm from "../../components/admin/ProductForm";

// Cloudinary config
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

export default function AdminBulkProducts() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const { products: allProducts, loadProducts } = useProducts();

  const [showEditModal, setShowEditModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
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

  const [bulkPricingTiers, setBulkPricingTiers] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  const scrollToTop = () => {
    setTimeout(() => {
      const scrollable = document.querySelector('main.overflow-y-auto') || document.querySelector('main');
      if (scrollable) {
        scrollable.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  // Filter only bulk products
  const [bulkProducts, setBulkProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  const toCloudinaryThumb = (url) => {
    if (!url || typeof url !== "string") return "";
    if (!url.includes("res.cloudinary.com")) return url;
    if (!url.includes("/image/upload/")) return url;
    const parts = url.split("/image/upload/");
    if (parts.length !== 2) return url;
    return `${parts[0]}/image/upload/w_600,h_450,c_fill,q_auto,f_auto/${parts[1]}`;
  };

  // Load bulk products (products with bulkPricingTiers)
  const refreshLocalProducts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch including inactive products and bypass cache (force=true)
      const all = await loadProducts("", silent, true, true);
      if (all) {
        const filtered = all.filter(p => p.bulkPricingTiers && p.bulkPricingTiers.length > 0);
        setBulkProducts(filtered);
      }
    } catch (error) {
      console.error("Error refreshing bulk products:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refreshLocalProducts();
  }, [loadProducts]);

  const handleOpenEditModal = (p) => {
    setEditingProductId(p.id);
    setProduct({
      name: p.name || "",
      category: p.category || "",
      waxType: p.waxType || "soy",
      waxTypeOther: p.waxTypeOther || "",
      weightGrams: p.weightGrams || "",
      burnTimeHours: p.burnTimeHours || "",
      dimensions: p.dimensions || "",
      dimensionUnit: p.dimensionUnit || "cm",
      price: p.price || "",
      quantityPack: p.quantityPack || "",
      customizableFragrance: p.customizableFragrance !== false,
      customizableColor: p.customizableColor !== false,
      altText: p.altText || "",
      inventory: p.inventory || "",
    });
    setBulkPricingTiers(p.bulkPricingTiers || []);
    setPreview(p.imageUrl || null);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingProductId(null);
    setPreview(null);
  };

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large (max 5MB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const addTier = () => {
    setBulkPricingTiers([...bulkPricingTiers, { minQty: "", pricePerPc: "" }]);
  };

  const removeTier = (index) => {
    setBulkPricingTiers(bulkPricingTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, field, value) => {
    const newTiers = [...bulkPricingTiers];
    newTiers[index][field] = value;
    setBulkPricingTiers(newTiers);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = { ...product, bulkPricingTiers };
      // Check if image changed (preview is base64)
      if (preview && preview.startsWith("data:image")) {
        payload.imageBuffer = preview;
      }

      await updateProduct(editingProductId, payload, idToken);
      showToast("Product updated successfully");
      handleCloseEditModal();
      refreshLocalProducts(true);
    } catch (error) {
      console.error("Update error:", error);
      showToast(error.message || "Failed to update product", "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenerateCatalogue = async () => {
    if (!window.confirm("Generate and download the bulk catalogue PDF?")) return;
    setCatalogueLoading(true);
    try {
      const blob = await generateBulkCatalogue(idToken);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cozy-bulk-catalogue.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Bulk catalogue generated and downloaded!");
    } catch (error) {
      console.error("Bulk Catalogue Generation Error:", error);
      showToast("Failed to generate bulk catalogue", "error");
    } finally {
      setCatalogueLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to deactivate this bulk product?")) return;
    try {
      await deleteProduct(id, idToken);
      showToast("Bulk product deactivated successfully");
      await refreshLocalProducts(true);
      scrollToTop();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleActivate = async (id) => {
    if (!confirm("Activate this product?")) return;
    try {
      await updateProduct(id, { isActive: true }, idToken);
      showToast("Bulk product activated successfully");
      await refreshLocalProducts(true);
      scrollToTop();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm("WARNING: This will PERMANENTLY delete this bulk product. This action cannot be undone. Proceed?")) return;
    try {
      await permanentlyDeleteProduct(id, idToken);
      showToast("Bulk product permanently deleted");
      await refreshLocalProducts(true);
      scrollToTop();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <style>
        {`
          .diagonal-strike {
            position: relative;
            display: inline-block;
          }
          .diagonal-strike::after {
            content: "";
            position: absolute;
            top: 45%;
            left: -2%;
            width: 104%;
            height: 1px;
            background: currentColor;
            transform: rotate(-12deg);
          }
          .star-qty-badge {
            position: absolute;
            top: -12px;
            right: -12px;
            width: 48px;
            height: 48px;
            background-image: url('https://res.cloudinary.com/dumkblp3v/image/upload/v1770800754/Star-badge_ttci0q.svg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 900;
            z-index: 30;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
            padding-bottom: 2px;
            transition: transform 0.3s ease;
          }
        `}
      </style>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-end gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 leading-none">Bulk Products</h2>
          <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400 mb-0.5">
            {loading ? "..." : `${bulkProducts.length} Items`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleGenerateCatalogue}
              disabled={loading || catalogueLoading}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-[10px] sm:text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 h-10"
            >
              {catalogueLoading ? (
                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "📄 Catalogue"}
            </button>
          </div>
        </div>
      </div>

      <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="bg-transparent">

          {bulkProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-12 font-medium">No bulk products yet.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
              {bulkProducts.map((p) => {
                const firstTier = p.bulkPricingTiers && p.bulkPricingTiers.length > 0 ? p.bulkPricingTiers[0] : null;

                return (
                  <div key={p.id} className={`bg-white border border-gray-100 rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300 relative ${p.isActive === false ? "opacity-75 grayscale-[0.3]" : ""}`}>
                    {/* Product Image */}
                    <div className="w-full aspect-[4/3] rounded-xl overflow-visible mb-2 bg-gray-50 relative group">
                      <img
                        src={toCloudinaryThumb(p.imageUrl)}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110 rounded-xl"
                      />

                    </div>

                    {/* Product Info */}
                    <div className="mb-0.5 min-h-[2.8rem] flex flex-col justify-start">
                      <h3 className="font-semibold text-[clamp(14px,4vw,16px)] text-gray-900 leading-[1.2] whitespace-normal mb-1.5">{p.name}</h3>
                      {p.bulkPricingTiers && p.bulkPricingTiers.length > 0 ? (
                        <div className="space-y-0.5">
                          {p.bulkPricingTiers.map((tier, idx) => (
                            <p key={idx} className="text-[11px] flex justify-between items-center bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              <span className="text-gray-700 font-medium">
                                {tier.minQty} Pcs
                              </span>
                              <span className="text-green-700 font-bold">₹{tier.pricePerPc}/pc</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No tiers set</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] sm:text-[10px] text-gray-400 border-y border-gray-50 py-1 mb-1.5">
                      <p className="shrink-0">Cat: <span className="text-gray-900 font-medium uppercase">{p.category}</span></p>
                      <p className="shrink-0">Wax: <span className="text-gray-900 font-medium capitalize">{p.waxType}</span></p>
                      {p.dimensions && <p className="shrink-0">Size: <span className="text-gray-900 font-medium">{p.dimensions}</span></p>}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto pt-1 space-y-1">
                      <div className="flex flex-row gap-1">
                        <button
                          onClick={() => handleOpenEditModal(p)}
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
                        className="w-full border border-red-200 text-red-600 py-1 rounded-lg font-bold text-[9px] uppercase tracking-tight hover:bg-red-50 transition-all"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* EDIT MODAL */}
        {showEditModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseEditModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-xl font-black text-gray-900">
                  Edit Bulk Product
                </h2>
                <button
                  onClick={handleCloseEditModal}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                  aria-label="Close"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-left">
                <ProductForm
                  isEdit={true}
                  onSubmit={handleEditSubmit}
                  product={product}
                  updateField={updateField}
                  handleFileChange={handleFileChange}
                  preview={preview}
                  formLoading={formLoading}
                  handleCloseEditModal={handleCloseEditModal}
                  bulkPricingTiers={bulkPricingTiers}
                  addTier={addTier}
                  removeTier={removeTier}
                  updateTier={updateTier}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
