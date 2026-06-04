// src/pages/admin/AdminPerfumes.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { apiFetch } from "../../lib/api";
import ConfirmModal from "../../components/ConfirmModal";
import Skeleton from "../../components/common/Skeleton";
import { compressToWebpUnderLimit, optimizeCloudinaryUrl } from "../../utils/image";
import { Loader2, Plus, X, Search, ChevronDown, Pencil, Trash2, ToggleLeft, ToggleRight, Package } from "lucide-react";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Default size labels for Attar
const DEFAULT_ATTAR_VARIANTS = [
  { label: "3ml",   price: "", isAvailable: true },
  { label: "6ml",   price: "", isAvailable: true },
  { label: "9ml",   price: "", isAvailable: true },
  { label: "12ml",  price: "", isAvailable: true },
  { label: "25ml",  price: "", isAvailable: true },
  { label: "50ml",  price: "", isAvailable: true },
  { label: "100ml", price: "", isAvailable: true },
];

const EMPTY_FORM = {
  name: "", scentFamily: "", longevityHours: "", isAlcoholFree: false,
  scentNotesTop: "", scentNotesMiddle: "", scentNotesBase: "",
  ingredients: "", altText: "",
};

async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || !data?.secure_url) throw new Error(data?.error?.message || "Upload failed");
  return data.secure_url;
}

function getPriceRange(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const prices = variants.filter(v => v.isAvailable !== false && Number(v.price) > 0).map(v => Number(v.price));
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `₹${min.toLocaleString()}` : `₹${min.toLocaleString()} – ₹${max.toLocaleString()}`;
}

export default function AdminPerfumes() {
  const { idToken } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [variants, setVariants] = useState(DEFAULT_ATTAR_VARIANTS.map(v => ({ ...v })));
  const [imageFiles, setImageFiles] = useState([null, null, null, null, null]);
  const [previews, setPreviews] = useState([null, null, null, null, null]);
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { }, type: "default", confirmText: "Confirm" });
  const closeConfirm = () => setConfirmModal(p => ({ ...p, isOpen: false }));

  const SORT_OPTIONS = [
    { value: "featured", label: "Featured", shortLabel: "Featured" },
    { value: "name-asc", label: "Name: A to Z", shortLabel: "A → Z" },
    { value: "name-desc", label: "Name: Z to A", shortLabel: "Z → A" },
  ];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/perfumes", { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load Attar", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (idToken) fetchItems(); }, [idToken]);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest("[data-sort-menu]")) setShowSortMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = React.useMemo(() => {
    let r = [...items];
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      r = r.filter(p => p.name?.toLowerCase().includes(t) || p.scentFamily?.toLowerCase().includes(t));
    }
    switch (sortBy) {
      case "name-asc": r.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
      case "name-desc": r.sort((a, b) => (b.name || "").localeCompare(a.name || "")); break;
      default: break;
    }
    return r;
  }, [items, searchTerm, sortBy]);

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setVariants(DEFAULT_ATTAR_VARIANTS.map(v => ({ ...v })));
    setImageFiles([null, null, null, null, null]);
    setPreviews([null, null, null, null, null]);
    setFormMsg("");
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || "",
      scentFamily: item.scentFamily || "",
      longevityHours: String(item.longevityHours ?? ""),
      isAlcoholFree: !!item.isAlcoholFree,
      scentNotesTop: item.scentNotes?.top || "",
      scentNotesMiddle: item.scentNotes?.middle || "",
      scentNotesBase: item.scentNotes?.base || "",
      ingredients: item.ingredients || "",
      altText: item.altText || "",
    });
    if (Array.isArray(item.variants) && item.variants.length > 0) {
      setVariants(item.variants.map(v => ({
        label: v.label || "",
        price: String(v.price ?? ""),
        isAvailable: v.isAvailable !== false,
      })));
    } else {
      setVariants(DEFAULT_ATTAR_VARIANTS.map(v => ({ ...v })));
    }
    const p = [null, null, null, null, null];
    if (Array.isArray(item.images) && item.images.length > 0) item.images.slice(0, 5).forEach((u, i) => p[i] = u);
    else if (item.imageUrl) p[0] = item.imageUrl;
    setPreviews(p);
    setImageFiles([null, null, null, null, null]);
    setFormMsg("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setFormMsg(""); };

  const handleFileChange = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const nf = [...imageFiles]; nf[index] = file; setImageFiles(nf);
    const np = [...previews]; np[index] = URL.createObjectURL(file); setPreviews(np);
  };

  const removeImage = (index) => {
    const nf = [...imageFiles]; nf.splice(index, 1); nf.push(null); setImageFiles(nf);
    const np = [...previews];
    if (np[index]?.startsWith("blob:")) URL.revokeObjectURL(np[index]);
    np.splice(index, 1); np.push(null); setPreviews(np);
  };

  const updateVariant = (idx, field, value) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const addCustomVariant = () => {
    setVariants(prev => [...prev, { label: "", price: "", weightGrams: "", isAvailable: true }]);
  };

  const removeVariant = (idx) => {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { setFormMsg("Name is required."); return; }
    const hasImage = previews.some(p => p !== null);
    if (!hasImage) { setFormMsg("At least one image is required."); return; }
    const validVariants = variants.filter(v => v.label.trim() && String(v.price).trim() !== "" && Number(v.price) >= 0);
    if (validVariants.length === 0) { setFormMsg("At least one variant with a label is required."); return; }

    setFormLoading(true);
    setFormMsg("");
    try {
      const uploadedUrls = await Promise.all(previews.map(async (p, i) => {
        if (!p) return null;
        const file = imageFiles[i];
        if (file) return uploadToCloudinary(await compressToWebpUnderLimit(file, MAX_UPLOAD_BYTES));
        return p;
      }));
      const finalImages = uploadedUrls.filter(u => u !== null);
      const imageUrl = finalImages[0];

      const payload = {
        name: formData.name,
        scentFamily: formData.scentFamily,
        longevityHours: Number(formData.longevityHours) || 0,
        isAlcoholFree: !!formData.isAlcoholFree,
        scentNotes: {
          top: formData.scentNotesTop,
          middle: formData.scentNotesMiddle,
          base: formData.scentNotesBase,
        },
        ingredients: formData.ingredients,
        altText: formData.altText || formData.name,
        imageUrl, thumbnailUrl: imageUrl, images: finalImages,
        variants: validVariants.map(v => ({
          label: v.label.trim(),
          price: Number(v.price) || 0,
          isAvailable: true,
        })),
      };

      if (editingId) {
        await apiFetch(`/admin/perfumes/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ product: payload }) });
        showToast("Updated successfully!");
      } else {
        await apiFetch("/admin/perfumes", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ product: payload }) });
        showToast("Created successfully!");
      }
      closeModal();
      fetchItems();
    } catch (err) {
      setFormMsg("Error: " + err.message);
      showToast("Operation failed", "error");
    }
    setFormLoading(false);
  };

  const handleDeactivate = (id) => {
    setConfirmModal({ isOpen: true, title: "Deactivate", message: "Deactivate this product? It will no longer be visible to customers.", type: "danger", confirmText: "Deactivate", onConfirm: async () => { try { await apiFetch(`/admin/perfumes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${idToken}` } }); showToast("Deactivated"); fetchItems(); } catch { showToast("Failed", "error"); } } });
  };

  const handleActivate = (id) => {
    setConfirmModal({ isOpen: true, title: "Activate", message: "Activate this product?", type: "success", confirmText: "Activate", onConfirm: async () => { try { await apiFetch(`/admin/perfumes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ product: { isActive: true } }) }); showToast("Activated"); fetchItems(); } catch { showToast("Failed", "error"); } } });
  };

  const handlePermanentDelete = (id) => {
    setConfirmModal({ isOpen: true, title: "Permanent Delete", message: "PERMANENTLY delete this product? This cannot be undone.", type: "danger", confirmText: "Delete Permanently", onConfirm: async () => { try { await apiFetch(`/admin/perfumes/${id}/permanent`, { method: "DELETE", headers: { Authorization: `Bearer ${idToken}` } }); showToast("Deleted permanently"); fetchItems(); } catch { showToast("Failed", "error"); } } });
  };

  const f = (field) => formData[field] ?? "";
  const sf = (field, val) => setFormData(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pt-1 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl">🌹</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Attar (Perfumes)</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {loading ? "..." : `${filtered.length} ${filtered.length === 1 ? "Item" : "Items"} found`}
            </p>
          </div>
        </div>
        <button onClick={openAdd} className="flex-1 sm:flex-none px-5 py-2.5 bg-black text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-all active:scale-95 h-10 flex items-center justify-center gap-2 shadow-lg shadow-gray-200">
          <Plus className="w-4 h-4" /><span>New Attar</span>
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-row gap-2 mb-6">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input type="text" placeholder="Search by name, scent family..." className="block w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-400 transition-all shadow-sm h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-purple-500 transition-colors"><X className="h-4 w-4" /></button>}
        </div>
        <div className="relative w-[150px]" data-sort-menu>
          <button onClick={() => setShowSortMenu(!showSortMenu)} className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none transition-all shadow-sm h-10 text-gray-700">
            <span className="truncate">{SORT_OPTIONS.find(o => o.value === sortBy)?.shortLabel}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 ml-1.5 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] py-1 overflow-hidden">
              {SORT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => { setSortBy(o.value); setShowSortMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === o.value ? "bg-purple-50 text-purple-600 font-bold" : "text-gray-600 hover:bg-gray-50"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} height="260px" borderRadius="16px" className="w-full" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="border rounded bg-white p-8 text-center">
          <div className="text-4xl mb-3">🌹</div>
          <p className="font-medium text-gray-900">{searchTerm ? "No items match your search" : "No Attar yet"}</p>
          <p className="text-sm text-gray-500 mt-1">{searchTerm ? "Try adjusting your search" : "Add your first Attar to get started."}</p>
          {!searchTerm && <button onClick={openAdd} className="mt-4 px-4 py-2 bg-black text-white rounded-xl flex items-center gap-2 mx-auto text-sm font-bold"><Plus className="w-4 h-4" /> Add Attar</button>}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {filtered.map(item => {
            const priceRange = getPriceRange(item.variants);
            const variantCount = Array.isArray(item.variants) ? item.variants.filter(v => v.isAvailable !== false).length : 0;
            return (
              <div key={item.id} className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all group ${item.isActive === false ? "border-red-100 opacity-70" : "border-transparent"}`}>
                <div className="aspect-square bg-gray-50 overflow-hidden relative">
                  {item.imageUrl ? (
                    <img src={optimizeCloudinaryUrl(item.imageUrl, { width: 400 })} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200 text-5xl">🌹</div>
                  )}
                  {item.isActive === false && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Inactive</div>
                  )}
                  {variantCount > 0 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Package className="w-2.5 h-2.5" />{variantCount} sizes
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.scentFamily && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">{item.scentFamily}</span>}
                    {item.isAlcoholFree && <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium">Alcohol Free</span>}
                    {item.longevityHours > 0 && <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">~{item.longevityHours}H</span>}
                  </div>
                  <p className="font-black text-gray-900 text-sm">{priceRange || "No pricing set"}</p>
                  <div className="flex gap-1.5 pt-1 border-t border-gray-100">
                    <button onClick={() => openEdit(item)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-bold text-gray-700 transition-colors">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => item.isActive === false ? handleActivate(item.id) : handleDeactivate(item.id)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${item.isActive === false ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"}`}>
                      {item.isActive === false ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                      {item.isActive === false ? "Activate" : "Deactivate"}
                    </button>
                    <button onClick={() => handlePermanentDelete(item.id)} className="w-8 flex items-center justify-center py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-black text-gray-900">{editingId ? "Edit Attar" : "Add New Attar"}</h2>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic fields */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-800">Product Name <span className="text-red-500">*</span></label>
                  <input required type="text" value={f("name")} onChange={e => sf("name", e.target.value)} placeholder="e.g. Rose Attar" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-800">Scent Family</label>
                    <input type="text" value={f("scentFamily")} onChange={e => sf("scentFamily", e.target.value)} placeholder="e.g. Floral, Woody, Oud" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-800">Longevity (hours)</label>
                    <input type="number" min="0" value={f("longevityHours")} onChange={e => sf("longevityHours", e.target.value)} placeholder="e.g. 8" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10" />
                  </div>
                </div>

                <div className="flex items-center pt-2 pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isAlcoholFree} onChange={e => sf("isAlcoholFree", e.target.checked)} className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black" />
                    <span className="text-sm font-medium text-gray-800">Alcohol Free (Pure Attar)</span>
                  </label>
                </div>

                {/* Fragrance Notes */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-sm font-medium text-gray-800">Fragrance Notes (Optional)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-medium">Top Note</label>
                      <input type="text" value={f("scentNotesTop")} onChange={e => sf("scentNotesTop", e.target.value)} placeholder="e.g. Rose" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-medium">Middle Note</label>
                      <input type="text" value={f("scentNotesMiddle")} onChange={e => sf("scentNotesMiddle", e.target.value)} placeholder="e.g. Jasmine" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-medium">Base Note</label>
                      <input type="text" value={f("scentNotesBase")} onChange={e => sf("scentNotesBase", e.target.value)} placeholder="e.g. Musk" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-9 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-800">Ingredients</label>
                  <textarea value={f("ingredients")} onChange={e => sf("ingredients", e.target.value)} placeholder="Pure rose essential oil, natural carrier oil..." rows={2} className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none min-h-[80px] resize-none" />
                </div>

                {/* Variants Editor */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-bold text-gray-900">Volume Variants & Pricing</label>
                      <p className="text-[10px] text-gray-500 mt-0.5">Set price for each volume. Leave price empty to disable.</p>
                    </div>
                    <button type="button" onClick={addCustomVariant} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-black transition-all shrink-0">
                      + Add Size
                    </button>
                  </div>

                  <div className="space-y-2">
                    {variants.length === 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400 font-medium">No sizes added yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {variants.map((v, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-gray-700">Size {idx + 1}</span>
                              <button type="button" onClick={() => removeVariant(idx)} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove</button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-gray-600 font-medium block mb-1">Volume</label>
                                <input type="text" value={v.label} onChange={e => updateVariant(idx, "label", e.target.value)} placeholder="e.g. 6ml" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-9 text-sm" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-600 font-medium block mb-1">Price (₹)</label>
                                <input type="number" min="0" value={v.price} onChange={e => updateVariant(idx, "price", e.target.value)} placeholder="0" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-9 text-sm" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {formMsg && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300 mb-2">
                    <p className="text-xs font-bold text-red-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                      {formMsg}
                    </p>
                  </div>
                )}

                {/* Images */}
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium text-gray-800 block">Product Images (Up to 5) {!editingId && <span className="text-red-500">*</span>}</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                    {[0, 1, 2, 3, 4].map(i => {
                      const hasPreview = previews && previews[i];
                      const isNextAvailableSlot = !hasPreview && (i === 0 || (previews && previews[i - 1]));
                      if (!hasPreview && !isNextAvailableSlot) return null;
                      return (
                        <div key={i} className={`relative aspect-square sm:w-24 sm:h-24 md:w-28 md:h-28 border-2 ${hasPreview ? 'border-transparent' : 'border-dashed border-gray-200'} rounded-xl sm:rounded-2xl flex items-center justify-center bg-gray-50 overflow-hidden shrink-0 group hover:border-black/20 transition-all duration-300`}>
                          {hasPreview ? (
                            <>
                              <img src={previews[i]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm shadow opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                            </>
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                              <span className="text-[10px] text-gray-400 font-medium tracking-wide text-center px-1">
                                {i === 0 ? "Primary ★" : "Add Extra"}
                              </span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(i, e)} />
                            </label>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-1">PNG, JPG up to 5MB per image.</p>
                </div>

                <div className="flex gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-100 mt-2">
                  <button type="submit" disabled={formLoading} className="flex-1 bg-black text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 active:scale-95 shadow-sm flex items-center justify-center min-h-[44px]">
                    {formLoading ? (editingId ? "Saving..." : "Creating...") : (editingId ? "Update Product" : "Create Product")}
                  </button>
                  <button type="button" onClick={closeModal} className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirm} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} confirmText={confirmModal.confirmText} />
    </div>
  );
}
