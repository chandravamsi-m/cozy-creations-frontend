import React, { useState } from "react";
import {
  X, ChevronLeft, ChevronRight, Pencil, Trash2
} from "lucide-react";
import { optimizeCloudinaryUrl } from "../../utils/image";
import { getEffectiveDiscount } from "../../utils/offerUtils";

export default function AdminProductQuickView({ 
  product, 
  activeOffers,
  onClose, 
  onEdit, 
  onToggleStatus, 
  onPermanentDelete 
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!product) return null;

  const galleryImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map(url => optimizeCloudinaryUrl(url, { width: 800 }))
    : [optimizeCloudinaryUrl(product.imageUrl || product.image, { width: 800 })].filter(Boolean);

  const isBulk = product.bulkPricingTiers && product.bulkPricingTiers.length > 0;

  const DataRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-semibold text-gray-900">{value || "N/A"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 font-sans">
      {/* Backdrop with immediate blur and fast fade */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container with standardized entrance */}
      <div className="relative bg-white w-full max-w-5xl md:h-[600px] max-h-[90vh] rounded-[32px] shadow-2xl animate-in zoom-in-95 fade-in duration-300 flex flex-col overflow-hidden">
        
        {/* Close Button - Stationary */}
        <button 
          onClick={onClose}
          className="absolute top-2.5 right-2.5 md:top-3 md:right-3 z-50 w-6 h-6 md:w-7 md:h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all text-gray-500 hover:text-gray-900"
        >
          <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>

        {/* Scrollable Wrapper */}
        <div className="w-full h-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar">
          {/* LEFT: Image Section */}
          <div className="w-full md:w-1/2 h-64 sm:h-80 md:h-full bg-[#F8F8F5] relative flex flex-col border-r border-gray-100 shrink-0">
            <div className="relative flex-1 overflow-hidden">
              <img 
                src={galleryImages[activeIndex]} 
                alt={product.name}
                onError={(e) => {
                  const original = Array.isArray(product.images) && product.images.length > activeIndex 
                    ? product.images[activeIndex] 
                    : (product.imageUrl || product.image);
                  if (e.target.src !== original && original) {
                    e.target.src = original;
                  }
                }}
                className="w-full h-full object-cover transition-transform duration-500"
              />
              
              {galleryImages.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(prev => prev === 0 ? galleryImages.length - 1 : prev - 1);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 md:w-10 md:h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md text-gray-800 hover:bg-white transition-all z-20 cursor-pointer active:scale-90"
                  >
                    <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(prev => prev === galleryImages.length - 1 ? 0 : prev + 1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 md:w-10 md:h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md text-gray-800 hover:bg-white transition-all z-20 cursor-pointer active:scale-90"
                  >
                    <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                  </button>

                  {/* Pagination Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-black/10 backdrop-blur-sm px-2 py-1 rounded-full">
                    {galleryImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIndex(i)}
                        className={`h-1 rounded-full transition-all duration-300 ${activeIndex === i ? "w-3 bg-white" : "w-1 bg-white/40"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Content Section */}
          <div className="w-full md:w-1/2 flex flex-col h-auto md:h-full bg-white md:overflow-y-auto md:custom-scrollbar">
          <div className="p-6 space-y-4">
            
            {/* Header */}
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">
                {product.category} Collection
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-2 tracking-tight">{product.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  ID: {product.id}
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border ${
                  product.isActive !== false ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-700 border-orange-100"
                }`}>
                  {product.isActive !== false ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Premium Price Row (Label on left, Heavy Value on right) */}
            <div className="py-3 border-y border-gray-50 flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                {product.price != null ? "Unit Price" : "Price Range"}
              </span>
              <div className="text-xl sm:text-2xl font-black text-gray-900 italic tracking-tight text-right flex flex-col items-end justify-center min-w-0">
                {product.price != null ? (
                  (() => {
                    const d = activeOffers ? getEffectiveDiscount(product, activeOffers, product.price) : null;
                    if (d?.hasDiscount) {
                      return (
                        <div className="flex flex-col items-end">
                          <span className="text-xs sm:text-sm text-gray-400 line-through leading-none mb-1">₹{Number(product.price).toLocaleString()}</span>
                          <span className="text-green-600 leading-none">₹{d.discountedPrice.toLocaleString()}</span>
                        </div>
                      );
                    }
                    return `₹${Number(product.price).toLocaleString()}`;
                  })()
                ) : (
                  (() => {
                    const variants = product.variants || product.sizes;
                    if (!Array.isArray(variants) || variants.length === 0) return "N/A";
                    const prices = variants.filter(v => v.isAvailable !== false && Number(v.price) > 0).map(v => Number(v.price));
                    if (prices.length === 0) return "N/A";
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    
                    const minD = activeOffers ? getEffectiveDiscount(product, activeOffers, min) : null;
                    const maxD = activeOffers ? getEffectiveDiscount(product, activeOffers, max) : null;
                    
                    if (minD?.hasDiscount || maxD?.hasDiscount) {
                      const finalMin = minD?.hasDiscount ? minD.discountedPrice : min;
                      const finalMax = maxD?.hasDiscount ? maxD.discountedPrice : max;
                      return (
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] sm:text-sm text-gray-400 line-through leading-none mb-1 truncate max-w-full">
                            {min === max ? `₹${min.toLocaleString()}` : `₹${min.toLocaleString()} – ₹${max.toLocaleString()}`}
                          </span>
                          <span className="text-green-600 leading-none truncate max-w-full">
                            {min === max ? `₹${finalMin.toLocaleString()}` : `₹${finalMin.toLocaleString()} – ₹${finalMax.toLocaleString()}`}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <span className="truncate max-w-full">
                        {min === max ? `₹${min.toLocaleString()}` : `₹${min.toLocaleString()} – ₹${max.toLocaleString()}`}
                      </span>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Specifications */}
            <section>
              <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Product Details</h4>
              <div className="bg-white border border-gray-100 rounded-lg px-3 py-0.5 divide-y divide-gray-50">
                {product.waxType && <DataRow label="Wax Type" value={product.waxType} />}
                {product.weightGrams && <DataRow label="Weight" value={`${product.weightGrams}g`} />}
                {product.burnTimeHours && <DataRow label="Burn Time" value={`${product.burnTimeHours}h`} />}
                {product.dimensions && <DataRow label="Dimensions" value={product.dimensions} />}
                {product.quantityPack && <DataRow label="Pack Size" value={product.quantityPack} />}
                
                {/* Perfumes */}
                {product.family && <DataRow label="Family" value={product.family} />}
                {product.scentFamily && <DataRow label="Scent Family" value={product.scentFamily} />}
                {product.topNotes && <DataRow label="Top Notes" value={product.topNotes} />}
                {product.middleNotes && <DataRow label="Middle Notes" value={product.middleNotes} />}
                {product.baseNotes && <DataRow label="Base Notes" value={product.baseNotes} />}
                {product.scentNotes?.top && <DataRow label="Top Notes" value={product.scentNotes.top} />}
                {product.scentNotes?.middle && <DataRow label="Middle Notes" value={product.scentNotes.middle} />}
                {product.scentNotes?.base && <DataRow label="Base Notes" value={product.scentNotes.base} />}
                {product.longevity && <DataRow label="Longevity" value={product.longevity} />}
                {product.longevityHours && <DataRow label="Longevity" value={`~${product.longevityHours}h`} />}
                {product.volumeMl && <DataRow label="Volume" value={`${product.volumeMl}ml`} />}
                {product.gender && <DataRow label="Gender" value={product.gender} />}
                {product.alcoholFree !== undefined && <DataRow label="Alcohol Free" value={product.alcoholFree ? "Yes" : "No"} />}
                {product.isAlcoholFree !== undefined && <DataRow label="Alcohol Free" value={product.isAlcoholFree ? "Yes" : "No"} />}

                {/* Scented Sticks */}
                {product.fragranceType && <DataRow label="Fragrance Type" value={product.fragranceType} />}
                {product.stickLength && <DataRow label="Stick Length" value={`${product.stickLength} inch`} />}
                {product.burningTime && <DataRow label="Burning Time" value={`${product.burningTime} mins`} />}
                {product.sticksPerBox && <DataRow label="Sticks / Box" value={product.sticksPerBox} />}
                {product.handRolled !== undefined && <DataRow label="Hand Rolled" value={product.handRolled ? "Yes" : "No"} />}

              </div>
            </section>

            {/* Variants / Sizes */}
            {(product.sizes?.length > 0 || product.variants?.length > 0) && (
              <section className="mt-4">
                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Available Variants</h4>
                <div className="flex flex-col gap-1.5">
                  {(product.sizes || product.variants).map((variant, idx) => {
                    const vd = variant.price && activeOffers ? getEffectiveDiscount(product, activeOffers, variant.price) : null;
                    return (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-500">
                          {variant.weight || variant.volume || variant.label}
                          {variant.isAvailable === false && " (Out of Stock)"}
                        </span>
                        <span className={`text-[10px] font-black ${variant.isAvailable === false ? 'text-gray-400 line-through' : 'text-emerald-700'}`}>
                          {vd?.hasDiscount ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-gray-400 line-through">₹{variant.price}</span>
                              <span className="text-green-600">₹{vd.discountedPrice}</span>
                            </span>
                          ) : (
                            `₹${variant.price}`
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Bulk Pricing */}
            {isBulk && (
              <section>
                <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.15em] mb-2">Bulk Pricing Tiers</h4>
                <div className="flex flex-col gap-1.5">
                  {product.bulkPricingTiers.map((tier, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-[9px] font-bold text-gray-500">{tier.minQty}</span>
                      <span className="text-[10px] font-black text-emerald-700">₹{tier.pricePerPc}/pc</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Action Buttons */}
            <div className="pt-3 mt-auto border-t border-gray-50 flex items-center gap-2">
              <button
                onClick={() => { onEdit(product.id); onClose(); }}
                className="flex-1 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Edit
              </button>

              <button
                onClick={() => onToggleStatus(product.id)}
                className={`flex-1 border py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                  product.isActive !== false ? "bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200"
                }`}
              >
                {product.isActive !== false ? "Deactivate" : "Activate"}
              </button>

              <button
                onClick={() => { onPermanentDelete(product.id); onClose(); }}
                className="flex-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                title="Delete Product"
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
  );
}
