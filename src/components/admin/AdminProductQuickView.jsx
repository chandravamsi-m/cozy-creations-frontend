import React, { useState } from "react";
import {
  X, ChevronLeft, ChevronRight
} from "lucide-react";
import { optimizeCloudinaryUrl } from "../../utils/image";

export default function AdminProductQuickView({ 
  product, 
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 font-sans animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-5xl md:h-[600px] max-h-[90vh] rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden">
        
        {/* Close Button - Stationary */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-50 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all text-gray-500 hover:text-gray-900"
        >
          <X className="w-4 h-4" />
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md text-gray-800 hover:bg-white transition-all z-20 cursor-pointer active:scale-90"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(prev => prev === galleryImages.length - 1 ? 0 : prev + 1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md text-gray-800 hover:bg-white transition-all z-20 cursor-pointer active:scale-90"
                  >
                    <ChevronRight className="w-6 h-6" />
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
            <div className="py-3 border-y border-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unit Price</span>
              <span className="text-2xl font-black text-gray-900 italic tracking-tight">₹{product.price.toLocaleString()}</span>
            </div>

            {/* Specifications */}
            <section>
              <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Product Details</h4>
              <div className="bg-white border border-gray-100 rounded-lg px-3 py-0.5 divide-y divide-gray-50">
                <DataRow label="Wax Type" value={product.waxType} />
                <DataRow label="Weight" value={`${product.weightGrams}g`} />
                <DataRow label="Burn Time" value={`${product.burnTimeHours}h`} />
                <DataRow label="Dimensions" value={product.dimensions} />
                <DataRow label="Pack Size" value={product.quantityPack} />
              </div>
            </section>

            {/* Bulk Pricing */}
            {isBulk && (
              <section>
                <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.15em] mb-2">Bulk Pricing Tiers</h4>
                <div className="flex flex-col gap-1.5">
                  {product.bulkPricingTiers.map((tier, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-[9px] font-bold text-gray-500">{tier.minQty}+ UNITS</span>
                      <span className="text-[10px] font-black text-emerald-700">₹{tier.pricePerPc}/pc</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col xs:flex-row gap-2">
              <button 
                onClick={() => { onEdit(product.id); onClose(); }}
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-widest text-[9px] transition-all active:scale-95 shadow-sm"
              >
                Edit
              </button>
              <button 
                onClick={() => onToggleStatus(product.id)}
                className={`flex-1 h-9 rounded-lg font-bold uppercase tracking-widest text-[9px] transition-all active:scale-95 text-white shadow-sm ${
                  product.isActive !== false ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {product.isActive !== false ? "Deactivate" : "Activate"}
              </button>
              <button 
                onClick={() => { onPermanentDelete(product.id); onClose(); }}
                className="flex-1 h-9 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg font-bold uppercase tracking-widest text-[9px] transition-all active:scale-95"
              >
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
