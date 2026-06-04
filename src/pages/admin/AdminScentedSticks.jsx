// src/pages/admin/AdminScentedSticks.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { apiFetch } from "../../lib/api";
import ConfirmModal from "../../components/ConfirmModal";
import Skeleton from "../../components/common/Skeleton";
import { compressToWebpUnderLimit, optimizeCloudinaryUrl } from "../../utils/image";
import { Loader2, Plus, X, Search, ChevronDown, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EMPTY_FORM = {
  name: "", category: "", price: "", weightGrams: "",
  stickCount: "", burnTimeMinutes: "", scentFamily: "",
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

export default function AdminScentedSticks() {
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
  const [bulkTiers, setBulkTiers] = useState([]);
  const [imageFiles, setImageFiles] = useState([null, null, null, null, null]);
  const [previews, setPreviews] = useState([null, null, null, null, null]);
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { }, type: "default", confirmText: "Confirm" });
  const closeConfirm = () => setConfirmModal(p => ({ ...p, isOpen: false }));

  const SORT_OPTIONS = [
    { value: "featured", label: "Featured", shortLabel: "Featured" },
    { value: "price-low", label: "Price: Low to High", shortLabel: "Low → High" },
    { value: "price-high", label: "Price: High to Low", shortLabel: "High → Low" },
    { value: "name-asc", label: "Name: A to Z", shortLabel: "A → Z" },
    { value: "name-desc", label: "Name: Z to A", shortLabel: "Z → A" },
  ];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/scented-sticks", { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load scented sticks", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (idToken) fetchItems(); }, [idToken]);

  // Close sort menu on outside click
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest("[data-sort-menu]")) setShowSortMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = React.useMemo(() => {
    let r = [...items];
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      r = r.filter(p => p.name?.toLowerCase().includes(t) || p.scentFamily?.toLowerCase().includes(t) || p.category?.toLowerCase().includes(t));
    }
    switch (sortBy) {
      case "price-low": r.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
      case "price-high": r.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
      case "name-asc": r.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
      case "name-desc": r.sort((a, b) => (b.name || "").localeCompare(a.name || "")); break;
      default: break;
    }
    return r;
  }, [items, searchTerm, sortBy]);

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setBulkTiers([]);
    setImageFiles([null, null, null, null, null]);
    setPreviews([null, null, null, null, null]);
    setFormMsg("");
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || "", category: item.category || "",
      price: String(item.price ?? ""), weightGrams: String(item.weightGrams ?? ""),
      stickCount: String(item.stickCount ?? ""), burnTimeMinutes: String(item.burnTimeMinutes ?? ""),
      scentFamily: item.scentFamily || "", ingredients: item.ingredients || "", altText: item.altText || "",
    });
    setBulkTiers((item.bulkPricingTiers || []).map(t => ({ minQty: String(t.minQty ?? ""), pricePerPc: String(t.pricePerPc ?? "") })));
    const p = [null, null, null, null, null];
    if (Array.isArray(item.images) && item.images.length > 0) item.images.slice(0, 5).forEach((u, i) => p[i] = u);
    else if (item.imageUrl) p[0] = item.imageUrl;
    setPreviews(p);
    setImageFiles([null, null, null, null, null]);
    setFormMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormMsg("");
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { setFormMsg("Name is required."); return; }
    if (!formData.price || Number(formData.price) <= 0) { setFormMsg("Valid price is required."); return; }
    const hasImage = previews.some(p => p !== null);
    if (!hasImage) { setFormMsg("At least one image is required."); return; }

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
        ...formData,
        price: Number(formData.price) || 0,
        weightGrams: Number(formData.weightGrams) || 0,
        stickCount: Number(formData.stickCount) || 0,
        burnTimeMinutes: Number(formData.burnTimeMinutes) || 0,
        imageUrl, thumbnailUrl: imageUrl, images: finalImages,
        altText: formData.altText || formData.name,
        bulkPricingTiers: bulkTiers.filter(t => t.minQty && Number(t.pricePerPc) > 0).map(t => ({ minQty: String(t.minQty), pricePerPc: Number(t.pricePerPc) })),
      };

      if (editingId) {
        await apiFetch(`/admin/scented-sticks/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ product: payload }) });
        showToast("Updated successfully!");
      } else {
        await apiFetch("/admin/scented-sticks", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ product: payload }) });
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
    setConfirmModal({ isOpen: true, title: "Deactivate", message: "Deactivate this product? It will no longer be visible to customers.", type: "danger", confirmText: "Deactivate", onConfirm: async () => { try { await apiFetch(`/admin/scented-sticks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${idToken}` } }); showToast("Deactivated"); fetchItems(); } catch { showToast("Failed", "error"); } } });
  };

  const handleActivate = (id) => {
    setConfirmModal({ isOpen: true, title: "Activate", message: "Activate this product?", type: "success", confirmText: "Activate", onConfirm: async () => { try { await apiFetch(`/admin/scented-sticks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ product: { isActive: true } }) }); showToast("Activated"); fetchItems(); } catch { showToast("Failed", "error"); } } });
  };

  const handlePermanentDelete = (id) => {
    setConfirmModal({ isOpen: true, title: "Permanent Delete", message: "PERMANENTLY delete this product? This cannot be undone.", type: "danger", confirmText: "Delete Permanently", onConfirm: async () => { try { await apiFetch(`/admin/scented-sticks/${id}/permanent`, { method: "DELETE", headers: { Authorization: `Bearer ${idToken}` } }); showToast("Deleted permanently"); fetchItems(); } catch { showToast("Failed", "error"); } } });
  };

  const f = (field) => formData[field] ?? "";
  const sf = (field, val) => setFormData(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pt-1 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl">🌸</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Agarbatti (Scented Sticks)</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {loading ? "..." : `${filtered.length} ${filtered.length === 1 ? "Item" : "Items"} found`}
            </p>
          </div>
        </div>
        <button onClick={openAdd} className="flex-1 sm:flex-none px-5 py-2.5 bg-black text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-all active:scale-95 h-10 flex items-center justify-center gap-2 shadow-lg shadow-gray-200">
          <Plus className="w-4 h-4" /><span>New Agarbatti</span>
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-row gap-2 mb-6">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input type="text" placeholder="Search by name, scent, category..." className="block w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-400 transition-all shadow-sm h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-rose-500 transition-colors"><X className="h-4 w-4" /></button>}
        </div>
        <div className="relative w-[150px]" data-sort-menu>
          <button onClick={() => setShowSortMenu(!showSortMenu)} className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none transition-all shadow-sm h-10 text-gray-700">
            <span className="truncate">{SORT_OPTIONS.find(o => o.value === sortBy)?.shortLabel}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 ml-1.5 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] py-1 overflow-hidden">
              {SORT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => { setSortBy(o.value); setShowSortMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === o.value ? "bg-rose-50 text-rose-600 font-bold" : "text-gray-600 hover:bg-gray-50"}`}>
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
          <div className="text-4xl mb-3">🌸</div>
          <p className="font-medium text-gray-900">{searchTerm ? "No items match your search" : "No scented sticks yet"}</p>
          <p className="text-sm text-gray-500 mt-1">{searchTerm ? "Try adjusting your search" : "Add your first agarbatti to get started."}</p>
          {!searchTerm && <button onClick={openAdd} className="mt-4 px-4 py-2 bg-black text-white rounded-xl flex items-center gap-2 mx-auto text-sm font-bold"><Plus className="w-4 h-4" /> Add Agarbatti</button>}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {filtered.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all group ${item.isActive === false ? "border-red-100 opacity-70" : "border-transparent"}`}>
              <div className="aspect-square bg-gray-50 overflow-hidden relative">
                {item.imageUrl ? (
                  <img src={optimizeCloudinaryUrl(item.imageUrl, { width: 400 })} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200 text-5xl">🌸</div>
                )}
                {item.isActive === false && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Inactive</div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <p className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</p>
                <div className="flex flex-wrap gap-1">
                  {item.scentFamily && <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">{item.scentFamily}</span>}
                  {item.stickCount > 0 && <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{item.stickCount} sticks</span>}
                  {item.burnTimeMinutes > 0 && <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">~{item.burnTimeMinutes}min</span>}
                </div>
                <p className="font-black text-gray-900 text-sm">₹{Number(item.price).toLocaleString()}</p>
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
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? "Edit Agarbatti" : "New Agarbatti"}</h3>
              <button onClick={closeModal} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Images */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Images (up to 5)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 overflow-hidden relative group cursor-pointer bg-gray-50 hover:border-rose-400 transition-colors">
                      {previews[i] ? (
                        <>
                          <img src={previews[i]} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5 text-white" /></button>
                          {i === 0 && <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded">MAIN</span>}
                        </>
                      ) : (
                        <label className="w-full h-full flex items-center justify-center cursor-pointer text-gray-300 text-2xl">+<input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(i, e)} /></label>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Product Name *</label>
                  <input required type="text" value={f("name")} onChange={e => sf("name", e.target.value)} placeholder="e.g. Rose Agarbatti" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Category</label>
                  <input type="text" value={f("category")} onChange={e => sf("category", e.target.value)} placeholder="e.g. floral, woody" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Scent Family</label>
                  <input type="text" value={f("scentFamily")} onChange={e => sf("scentFamily", e.target.value)} placeholder="e.g. Rose, Jasmine" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Price (₹) *</label>
                  <input required type="number" min="1" value={f("price")} onChange={e => sf("price", e.target.value)} placeholder="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Weight (g)</label>
                  <input type="number" min="0" value={f("weightGrams")} onChange={e => sf("weightGrams", e.target.value)} placeholder="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Stick Count</label>
                  <input type="number" min="0" value={f("stickCount")} onChange={e => sf("stickCount", e.target.value)} placeholder="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Burn Time (min)</label>
                  <input type="number" min="0" value={f("burnTimeMinutes")} onChange={e => sf("burnTimeMinutes", e.target.value)} placeholder="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Ingredients</label>
                  <textarea value={f("ingredients")} onChange={e => sf("ingredients", e.target.value)} placeholder="Natural bamboo sticks, essential oils..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none" />
                </div>
              </div>

              {/* Bulk Pricing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Bulk Pricing Tiers</label>
                  <button type="button" onClick={() => setBulkTiers(p => [...p, { minQty: "", pricePerPc: "" }])} className="text-xs font-bold text-rose-600 hover:underline">+ Add Tier</button>
                </div>
                {bulkTiers.map((tier, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <input type="text" placeholder="Min Qty" value={tier.minQty} onChange={e => { const t = [...bulkTiers]; t[idx].minQty = e.target.value; setBulkTiers(t); }} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <input type="number" placeholder="Price/pc" value={tier.pricePerPc} onChange={e => { const t = [...bulkTiers]; t[idx].pricePerPc = e.target.value; setBulkTiers(t); }} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <button type="button" onClick={() => setBulkTiers(bulkTiers.filter((_, i) => i !== idx))} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>

              {formMsg && <p className="text-red-500 text-sm font-medium">{formMsg}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {formLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editingId ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirm} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} confirmText={confirmModal.confirmText} />
    </div>
  );
}
