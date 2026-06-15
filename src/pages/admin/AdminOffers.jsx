// src/pages/admin/AdminOffers.jsx
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { db } from "../../firebase";
import Skeleton from "../../components/common/Skeleton";
import ConfirmModal from "../../components/ConfirmModal";
import { collection, getDocs } from "firebase/firestore";
import { 
  Plus, 
  Trash2, 
  Edit,
  Loader2,
  X,
  Save,
  Gift,
  Image as ImageIcon,
  Check,
  ChevronDown,
  Megaphone,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import {
  coerceAdminNumberInput,
  getStableAdminNumberValue,
  parseAdminNumber,
} from "../../utils/adminNumberInputs";
import { compressToWebpUnderLimit, optimizeCloudinaryUrl } from "../../utils/image";

const CATEGORIES = [
  { id: 'flower', label: 'FLOWER' },
  { id: 'animal', label: 'ANIMAL' },
  { id: 'festive', label: 'FESTIVE' },
  { id: 'glassJar', label: 'GLASS JAR' },
  { id: 'special', label: 'SPECIAL' },
  { id: 'scented-sticks', label: 'SCENTED STICKS' },
  { id: 'perfumes', label: 'PERFUMES' }
];

// Memoized Product Item for the Targeting Grid to ensure smooth selection
const ProductTargetingItem = memo(({ product, isSelected, onToggle }) => {
  // Use ultra-low resolution thumbnail for targeting grid to minimize data/reads
  const thumbUrl = useMemo(() => 
    optimizeCloudinaryUrl(product.imageUrl, { width: 64, height: 64, crop: 'fill' }), 
    [product.imageUrl]
  );

  return (
    <div 
      onClick={() => onToggle(product.id)}
      className="flex items-center gap-3 cursor-pointer group py-1 select-none"
    >
      <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-200 group-hover:border-gray-400 bg-white'}`}>
        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
      </div>
      
      {product.imageUrl && (
        <div className="w-7 h-7 rounded-md overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
          <img 
            src={thumbUrl} 
            className="w-full h-full object-cover" 
            alt="" 
            loading="lazy"
          />
        </div>
      )}
      
      <p className={`text-[11px] font-bold tracking-tight truncate leading-tight ${isSelected ? 'text-gray-900' : 'text-gray-500'} group-hover:text-gray-900 transition-colors`}>
        {product.name}
      </p>
    </div>
  );
});

export default function AdminOffers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // ── Announcement Strip State ─────────────────────────────────────────────────
  const [strip, setStrip] = useState({ isActive: false, messages: [] });
  const [stripLoading, setStripLoading] = useState(true);
  const [stripSaving, setStripSaving] = useState(false);
  const [stripHasChanges, setStripHasChanges] = useState(false);

  const fetchStrip = useCallback(async () => {
    try {
      setStripLoading(true);
      const res = await apiFetch("/settings/public");
      const data = await res.json();
      setStrip(data.announcementStrip || { isActive: false, messages: [] });
    } catch {
      // silently default
    } finally {
      setStripLoading(false);
    }
  }, []);

  useEffect(() => { fetchStrip(); }, [fetchStrip]);

  const handleStripToggle = () => {
    setStrip(prev => ({ ...prev, isActive: !prev.isActive }));
    setStripHasChanges(true);
  };

  const handleStripMessageChange = (id, value) => {
    setStrip(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.id === id ? { ...m, text: value } : m),
    }));
    setStripHasChanges(true);
  };

  const handleStripAddMessage = () => {
    const newMsg = { id: `msg_${Date.now()}`, text: '' };
    setStrip(prev => ({ ...prev, messages: [...prev.messages, newMsg] }));
    setStripHasChanges(true);
  };

  const handleStripRemoveMessage = (id) => {
    setStrip(prev => ({ ...prev, messages: prev.messages.filter(m => m.id !== id) }));
    setStripHasChanges(true);
  };

  const handleStripSave = async () => {
    try {
      setStripSaving(true);
      const token = await user.getIdToken();
      const res = await apiFetch("/admin/settings/announcement-strip", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(strip),
      });
      if (!res.ok) throw new Error();
      showToast("Announcement strip saved!");
      setStripHasChanges(false);
      await fetchStrip();
    } catch {
      showToast("Failed to save strip", "error");
    } finally {
      setStripSaving(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Offers State ─────────────────────────────────────────────────────────────
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  const [activeTab, setActiveTab] = useState('ALL');

  // Confirmation state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "default",
    confirmText: "Confirm"
  });

  const openConfirm = (config) => setConfirmModal({ ...config, isOpen: true });
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const initialFormState = {
    name: "",
    isActive: false,
    discountType: "percentage",
    discountValue: "",
    applicableToAll: true,
    applicableCategories: [],
    applicableProducts: [],
    hasDiscount: true,
    hasBanner: true,
    offerHeading: "",
    offerText: "",
    bannerImageUrl: ""
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const res = await apiFetch("/admin/offers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOffers(data.offers || []);
      setHasChanges(false);
    } catch (err) {
      showToast("Could not load offers", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const [productsSnap, scentedSticksSnap, perfumesSnap] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "scented-sticks")),
        getDocs(collection(db, "perfumes"))
      ]);

      const mapProduct = (doc, defaultCategory) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          category: defaultCategory || data.category,
          imageUrl: data.imageUrl || (data.images && data.images[0]) || "",
          price: data.price || (data.variants && data.variants.length > 0 ? data.variants[0].price : 0),
          isActive: data.isActive
        };
      };

      const productList = [
        ...productsSnap.docs.map(doc => mapProduct(doc, null)),
        ...scentedSticksSnap.docs.map(doc => mapProduct(doc, "scented-sticks")),
        ...perfumesSnap.docs.map(doc => mapProduct(doc, "perfumes"))
      ];

      setProducts(productList);
    } catch (err) {
      console.error("Failed to load products for targeting grid", err);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ ...initialFormState, isActive: false });
    setBannerPreview(null);
    setPendingFile(null);
    setActiveTab('ALL');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (offer) => {
    setEditingId(offer.id);
    setFormData({
      ...offer,
      discountValue: getStableAdminNumberValue(offer.discountValue ?? "")
    });
    setBannerPreview(offer.bannerImageUrl);
    setPendingFile(null);
    setActiveTab('ALL');
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast("Please enter an offer name", "error");
    if (!formData.offerHeading?.trim()) return showToast("Please enter a banner title", "error");
    if (!formData.offerText?.trim()) return showToast("Please enter a banner description", "error");
    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) return showToast("Please enter a valid discount value", "error");
    if (!formData.bannerImageUrl && !pendingFile) return showToast("Please select a banner image", "error");
    if (!formData.applicableToAll && (!formData.applicableProducts || formData.applicableProducts.length === 0)) return showToast("Please select at least one product", "error");

    try {
      setSaving(true);
      let finalUrl = formData.bannerImageUrl;

      if (pendingFile) {
        const opt = await compressToWebpUnderLimit(pendingFile, 5 * 1024 * 1024);
        const fd = new FormData();
        fd.append("file", opt);
        fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
        const resData = await res.json();
        finalUrl = resData.secure_url;
      }

      const token = await user.getIdToken();
      const isNew = !editingId;
      
      const validProductIds = new Set(products.map(p => p.id));
      const sanitizedApplicableProducts = (formData.applicableProducts || []).filter(id => validProductIds.has(id));

      const res = await apiFetch(isNew ? "/admin/offers" : `/admin/offers/${editingId}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          ...formData, 
          bannerImageUrl: finalUrl, 
          discountValue: parseAdminNumber(formData.discountValue),
          applicableProducts: sanitizedApplicableProducts,
          applicableCategories: [],
          hasBanner: true, 
          hasDiscount: true 
        }),
      });

      if (!res.ok) throw new Error();
      showToast(isNew ? "Offer created!" : "Offer updated!");
      setIsModalOpen(false);
      fetchOffers();
    } catch (err) {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (id) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o));
    setHasChanges(true);
  };

  const handleGlobalSave = async () => {
    try {
      setGlobalSaving(true);
      const token = await user.getIdToken();
      
      const promises = offers.map(offer => 
        apiFetch(`/admin/offers/${offer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...offer }),
        })
      );

      await Promise.all(promises);
      showToast("All changes saved!");
      setHasChanges(false);
    } catch (err) {
      showToast("Failed to save changes", "error");
    } finally {
      setGlobalSaving(false);
    }
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete Offer?",
      message: "Are you sure you want to remove this offer? This action cannot be undone.",
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          const token = await user.getIdToken();
          await apiFetch(`/admin/offers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          showToast("Offer deleted successfully");
          fetchOffers();
        } catch (err) {
          showToast("Could not delete offer", "error");
        }
      }
    });
  };

  const toggleCategoryFilter = useCallback((catId) => {
    const productsInCat = products.filter(p => p.category === catId).map(p => p.id);
    if (productsInCat.length === 0) return;

    setFormData(f => {
      const currentSelected = new Set(f.applicableProducts || []);
      const isSelected = productsInCat.every(id => currentSelected.has(id));
      
      if (!isSelected) {
        productsInCat.forEach(id => currentSelected.add(id));
      } else {
        productsInCat.forEach(id => currentSelected.delete(id));
      }
      return { ...f, applicableProducts: Array.from(currentSelected) };
    });
  }, [products]);

  const toggleProduct = useCallback((productId) => {
    setFormData(prev => {
      const cur = prev.applicableProducts || [];
      const isSelected = cur.includes(productId);
      return {
        ...prev,
        applicableProducts: isSelected 
          ? cur.filter(id => id !== productId) 
          : [...cur, productId]
      };
    });
  }, []);

  // Filtered products for individual selection grid
  const gridProducts = useMemo(() => {
    if (activeTab === 'ALL') return products;
    return products.filter(p => p.category === activeTab);
  }, [products, activeTab]);

  // Dynamically compute which categories are fully selected
  const selectedCategories = useMemo(() => {
    const selectedIds = new Set(formData.applicableProducts || []);
    return CATEGORIES.filter(cat => {
      const productsInCat = products.filter(p => p.category === cat.id);
      if (productsInCat.length === 0) return false;
      return productsInCat.every(p => selectedIds.has(p.id));
    }).map(c => c.id);
  }, [formData.applicableProducts, products]);

  if (loading) return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pt-1 mb-6">
        <div className="flex items-center gap-3">
          <Skeleton width="40px" height="40px" borderRadius="12px" />
          <div className="flex flex-col gap-2">
            <Skeleton width="150px" height="24px" borderRadius="4px" />
            <Skeleton width="200px" height="12px" borderRadius="4px" />
          </div>
        </div>
        <Skeleton width="120px" height="40px" borderRadius="12px" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        <Skeleton height="350px" borderRadius="16px" />
        <Skeleton height="350px" borderRadius="16px" />
        <Skeleton height="350px" borderRadius="16px" />
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20 space-y-0">

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — MANAGE OFFERS (EXISTING UI — UNCHANGED)
      ════════════════════════════════════════════════════════════════════════ */}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pt-1 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 leading-tight">Manage Offers</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Set up sales and banners for your store
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={handleGlobalSave}
            disabled={!hasChanges || globalSaving}
            className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all h-10 ${hasChanges ? 'bg-black text-white shadow-lg shadow-gray-200 hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            {globalSaving ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        
        {offers.map(offer => (
          <div key={offer.id} className="bg-white border border-gray-200 rounded-[16px] overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all h-full group relative">
            
            {/* Offer Name Pill */}
            <div className="absolute top-3 left-3 z-10">
              <span className="bg-white/95 backdrop-blur-sm text-gray-900 px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm border border-gray-100/50">
                {offer.name}
              </span>
            </div>

            {/* Image */}
            <div className="aspect-[16/10] bg-gray-50 flex-shrink-0 relative overflow-hidden">
              <img src={offer.bannerImageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex-1 space-y-3">
                {/* Title & Toggle Row */}
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-bold text-gray-900 text-[14px] leading-tight line-clamp-2">
                    {offer.offerHeading || "Untitled Banner"}
                  </h3>
                  
                  {/* Live Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${offer.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {offer.isActive ? 'Live' : 'Off'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={offer.isActive} 
                        onChange={() => handleToggleActive(offer.id)}
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-focus:outline-none transition-all duration-300 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-300 peer-checked:after:translate-x-4 shadow-inner"></div>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">
                  {offer.offerText || "No description provided"}
                </p>

                {/* Discount Badge */}
                <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100/50">
                  {offer.discountValue}{offer.discountType === 'percentage' ? '%' : '₹'} Off
                </div>
              </div>
              
              {/* Divider & Actions */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => handleOpenEdit(offer)} className="flex-1 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5">
                  <Edit className="w-3.5 h-3.5 text-gray-500" /> <span>Edit Offer</span>
                </button>
                <button onClick={() => handleDelete(offer.id)} className="w-[38px] h-[38px] bg-white border border-red-100 hover:bg-red-50 text-red-500 rounded-xl transition-all flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Placeholder Card */}
        <div 
          onClick={handleOpenAdd}
          className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[16px] flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all group aspect-[16/10] sm:aspect-auto sm:h-full min-h-[250px] sm:min-h-[300px] w-full"
        >
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4">
            <Plus className="w-5 h-5 text-gray-400 group-hover:text-black" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-900">Add New Offer</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — ANNOUNCEMENT STRIP
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="mb-0" style={{ marginTop: '44px' }}>
        {/* Section Header */}
        <div className="flex items-center gap-3 px-1 pt-1 mb-5">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 leading-tight">Announcement Strip</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Thin text strip shown at top of homepage hero
            </p>
          </div>
        </div>

        {stripLoading ? (
          <Skeleton height="160px" borderRadius="16px" />
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">

            {/* Toggle row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Show strip on homepage</p>
                <p className="text-xs text-gray-400 mt-0.5">Appears above the navbar while hero is in view</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={strip.isActive}
                  onChange={handleStripToggle}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-focus:outline-none transition-all duration-300 relative after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all after:duration-300 peer-checked:after:translate-x-5 shadow-inner" />
              </label>
            </div>

            {/* Messages list */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Messages</p>
              {strip.messages.length === 0 && (
                <p className="text-xs text-gray-400 italic py-2">No messages yet. Add one below.</p>
              )}
              {strip.messages.map((msg, idx) => (
                <div key={msg.id} className="flex items-center gap-2 group">
                  <span className="text-xs text-gray-300 font-bold w-5 text-right shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={msg.text}
                    onChange={e => handleStripMessageChange(msg.id, e.target.value)}
                    placeholder="e.g. 🎉 Free shipping on orders above ₹999!"
                    maxLength={200}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300 bg-gray-50 focus:bg-white"
                  />
                  <button
                    onClick={() => handleStripRemoveMessage(msg.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                    title="Remove message"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
              <button
                onClick={handleStripAddMessage}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 border border-dashed border-gray-200 hover:border-gray-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Message
              </button>
              <button
                onClick={handleStripSave}
                disabled={!stripHasChanges || stripSaving}
                className={`ml-auto flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  stripHasChanges && !stripSaving
                    ? 'bg-black hover:bg-gray-800 text-white shadow-lg shadow-gray-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {stripSaving ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Save className="w-3.5 h-3.5" />}
                Save Strip
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleSaveModal} className="relative bg-white w-full max-w-[800px] max-h-[95vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-300" onClick={e => e.stopPropagation()}>
            
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">{editingId ? 'Edit Offer' : 'Add New Offer'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar bg-white">
              
              {/* Row: Name and Banner Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-6">
                   <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-800">Offer Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="e.g. Festive Offer" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none transition-all" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">Discount <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        value={formData.discountValue} 
                        onChange={e => setFormData(p => ({...p, discountValue: coerceAdminNumberInput(String(p.discountValue), e.target.value)}))} 
                        placeholder="e.g. 20"
                        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-800">Type <span className="text-red-500">*</span></label>
                      <select required value={formData.discountType} onChange={e => setFormData(p => ({...p, discountType: e.target.value}))} className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none transition-all h-[42px] cursor-pointer">
                        <option value="percentage">%</option>
                        <option value="fixed">₹</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-800">Banner Title <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.offerHeading} onChange={e => setFormData(p => ({...p, offerHeading: e.target.value}))} placeholder="Festive Sale" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-800">Banner Description <span className="text-red-500">*</span></label>
                    <textarea required value={formData.offerText} onChange={e => setFormData(p => ({...p, offerText: e.target.value}))} placeholder="e.g. Sale on all items" className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none transition-all text-sm h-20 resize-none" />
                  </div>
                </div>

                <div className="flex flex-col h-full">
                  <label className="text-sm font-medium text-gray-800 mb-1.5">Banner Image <span className="text-red-500">*</span></label>
                  <div className="relative flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden group min-h-[200px]">
                    <div className="absolute inset-0">
                      {bannerPreview || formData.bannerImageUrl ? (
                        <img src={bannerPreview || formData.bannerImageUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full text-gray-400 text-xs flex flex-col items-center justify-center gap-2 text-center px-4">
                          <ImageIcon className="w-6 h-6" />
                          Recommended size 1200x400
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <span className="bg-white text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase shadow-sm">Change Image</span>
                      <input type="file" className="hidden" accept="image/*" onChange={e => {
                        const f = e.target.files[0];
                        if (f) { setPendingFile(f); setBannerPreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  </div>
                </div>
              </div>

              {/* TARGETING SECTION */}
              <div className="space-y-6 pt-8 border-t border-gray-100">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-800">Apply Discount To <span className="text-red-500">*</span></label>
                  
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({...p, applicableToAll: true}))}
                      className={`flex-1 max-w-[180px] h-11 rounded-[10px] border transition-all flex items-center justify-center font-medium text-sm ${formData.applicableToAll ? 'border-blue-600 text-blue-600 shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                    >
                      All Products
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({...p, applicableToAll: false}))}
                      className={`flex-1 max-w-[180px] h-11 rounded-[10px] border transition-all flex items-center justify-center font-medium text-sm ${!formData.applicableToAll ? 'border-blue-600 text-blue-600 shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                    >
                      Specific Products
                    </button>
                  </div>
                </div>

                {!formData.applicableToAll && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-400 space-y-8">
                    
                    {/* Category Bulk Selection Pills */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-sm font-medium text-gray-800">Select Entire Category</label>
                        {/* <span className="text-[11px] text-gray-500">Toggling a category will automatically select or deselect all products in that collection below.</span> */}
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategoryFilter(cat.id)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${selectedCategories.includes(cat.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100/50' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Individual Products Selection */}
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-gray-100 pb-3 sm:pb-2">
                        <label className="text-sm font-medium text-gray-800 leading-tight">Select Individual Products</label>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                          {(formData.applicableProducts || []).filter(id => products.some(p => p.id === id)).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setFormData(f => ({ ...f, applicableProducts: [] }))}
                              className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors whitespace-nowrap"
                            >
                              Clear All
                            </button>
                          )}
                          <div className="bg-blue-50 text-blue-600 px-2.5 py-1 sm:px-2 sm:py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            {(formData.applicableProducts || []).filter(id => products.some(p => p.id === id)).length} SELECTED
                          </div>
                        </div>
                      </div>

                      {/* Mobile Dropdown for Category Filter */}
                      <div className="block sm:hidden relative">
                        <select
                          value={activeTab}
                          onChange={(e) => setActiveTab(e.target.value)}
                          className="w-full appearance-none bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 outline-none focus:ring-1 focus:ring-black transition-all cursor-pointer pr-10"
                        >
                          <option value="ALL">ALL PRODUCTS</option>
                          {CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Desktop Tabs for Category Filter */}
                      <div className="hidden sm:flex border border-gray-100 rounded-lg p-0.5 bg-gray-50/30 w-fit gap-0.5">
                        {['ALL', ...CATEGORIES.map(c => c.id)].map(tabId => (
                          <button
                            key={tabId}
                            type="button"
                            onClick={() => setActiveTab(tabId)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === tabId ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            {tabId === 'ALL' ? 'ALL' : CATEGORIES.find(c => c.id === tabId)?.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>

                      {/* Product Grid - 3 Columns (Always visible, responsive) */}
                      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                            {gridProducts.length > 0 ? (
                              gridProducts.map(p => (
                                <ProductTargetingItem 
                                  key={p.id} 
                                  product={p} 
                                  isSelected={formData.applicableProducts?.includes(p.id)} 
                                  onToggle={toggleProduct}
                                />
                              ))
                            ) : (
                              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-40 italic text-xs">
                                No products in this category
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 flex justify-end gap-2.5 sm:gap-3 bg-white shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="bg-black text-white px-6 sm:px-8 py-2 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95 shadow-sm">
                {saving ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Offer</span>
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />

    </div>
  );
}
