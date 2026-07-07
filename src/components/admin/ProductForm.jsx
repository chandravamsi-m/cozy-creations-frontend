import React from "react";
import { ChevronDown, ImagePlus, Video, X, Play } from "lucide-react";
import {
  coerceAdminNumberInput,
  preventNumberWheelChange,
} from "../../utils/adminNumberInputs";

const ProductForm = ({
  isEdit,
  onSubmit,
  product,
  updateField,
  handleFileChange,
  previews,
  removeImage,
  formLoading,
  handleCloseAddModal,
  handleCloseEditModal,
  // Bulk pricing props
  bulkPricingTiers,
  addTier,
  removeTier,
  updateTier,
  formMsg,
  // Video props
  videoPreviewUrl,
  handleVideoFileChange,
  removeVideo,
}) => {
  const handleIntegerFieldChange = (field, value) => {
    updateField(field, coerceAdminNumberInput(String(product[field] ?? ""), value));
  };

  const handleDecimalFieldChange = (field, value) => {
    updateField(
      field,
      coerceAdminNumberInput(String(product[field] ?? ""), value, { allowDecimal: true })
    );
  };

  const handleTierChange = (index, field, value, { allowDecimal = false } = {}) => {
    if (field === "minQty") {
      updateTier(index, field, value);
      return;
    }

    updateTier(
      index,
      field,
      coerceAdminNumberInput(String(bulkPricingTiers[index]?.[field] ?? ""), value, { allowDecimal })
    );
  };

  return (
  <form onSubmit={onSubmit} className="space-y-4">
    {/* Product Name */}
    <div className="space-y-1">
      <label htmlFor="product-name" className="text-sm font-medium text-gray-800">
        Product Name <span className="text-red-500">*</span>
      </label>
      <input
        id="product-name"
        type="text"
        value={product.name}
        onChange={(e) => updateField("name", e.target.value)}
        placeholder="Product Name"
        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none"
        required
      />
    </div>


    {/* Category */}
    <div className="space-y-1">
      <label htmlFor="product-category" className="text-sm font-medium text-gray-800">
        Category <span className="text-red-500">*</span>
      </label>
      <select
        id="product-category"
        value={product.category}
        onChange={(e) => updateField("category", e.target.value)}
        className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none"
        required
      >
        <option value="">Select Category</option>
        <option value="flower">Flower</option>
        <option value="animal">Animal</option>
        <option value="festive">Festive</option>
        <option value="special">Special</option>
        <option value="glassJar">Glass Jar</option>
      </select>
    </div>

    {/* Row: Wax Type & Specification */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor="product-wax-type" className="text-sm font-medium text-gray-800">
          Wax Type <span className="text-red-500">*</span>
        </label>
        <select
          id="product-wax-type"
          value={product.waxType}
          onChange={(e) => updateField("waxType", e.target.value)}
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
        >
          <option value="soy">Soy</option>
          <option value="gel">Gel</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-1">
        {product.waxType === "other" && (
          <>
            <label className="text-sm font-medium text-gray-800">
              Specify Wax <span className="text-red-500">*</span>
            </label>
            <input
              value={product.waxTypeOther}
              onChange={(e) => updateField("waxTypeOther", e.target.value)}
              placeholder="Specify wax type"
              className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10 text-sm"
              autoFocus={product.waxTypeOther === ""}
            />
          </>
        )}
      </div>
    </div>

    {/* Row: Weight & Qty Pack */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Weight */}
      <div className="space-y-1">
        <label htmlFor="product-weight" className="text-sm font-medium text-gray-800">
          Weight <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="product-weight"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={product.weightGrams}
            onChange={(e) => handleIntegerFieldChange("weightGrams", e.target.value)}
            onWheel={preventNumberWheelChange}
            placeholder="Weight"
            className="border border-gray-300 p-2 pr-12 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">g</span>
        </div>
      </div>

      {/* Qty Pack */}
      <div className="space-y-1">
        <label htmlFor="product-quantity-pack" className="text-sm font-medium text-gray-800">
          Qty Pack <span className="text-red-500">*</span>
        </label>
        <input
          id="product-quantity-pack"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={product.quantityPack}
          onChange={(e) => handleIntegerFieldChange("quantityPack", e.target.value)}
          onWheel={preventNumberWheelChange}
          placeholder="1"
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
          required
        />
      </div>
    </div>

    {/* Row: Price */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      <div className="space-y-1">
        <label htmlFor="product-price" className="text-sm font-medium text-gray-800">
          Price (₹) <span className="text-red-500">*</span>
        </label>
        <input
          id="product-price"
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.]?[0-9]*"
          value={product.price}
          onChange={(e) => handleDecimalFieldChange("price", e.target.value)}
          onWheel={preventNumberWheelChange}
          placeholder="Price"
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
          required
        />
      </div>
    </div>

    {/* Bulk Pricing Section (Optional) */}
    <div className="space-y-3 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-bold text-gray-900">
            Bulk Pricing (Optional)
          </label>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Add tiered pricing for volume discounts (e.g., 10 pcs @ ₹45/pc)
          </p>
        </div>
        <button
          type="button"
          onClick={addTier}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-all whitespace-nowrap shrink-0"
        >
          + Add Tier
        </button>
      </div>

      <div className="space-y-2">
        {bulkPricingTiers.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-400 font-medium">
              No pricing tiers added yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bulkPricingTiers.map((tier, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">Tier {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-600 font-medium block mb-1">
                      Quantity (e.g., 15)
                    </label>
                    <input
                      type="text"
                      value={tier.minQty}
                      onChange={(e) => handleTierChange(index, "minQty", e.target.value)}
                      placeholder="e.g. 15 or 25+"
                      className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-blue-500 outline-none h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-600 font-medium block mb-1">
                      Price per Piece (₹)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      value={tier.pricePerPc}
                      onChange={(e) => handleTierChange(index, "pricePerPc", e.target.value, { allowDecimal: true })}
                      onWheel={preventNumberWheelChange}
                      placeholder="e.g. 54"
                      className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-blue-500 outline-none h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Dimensions */}
    <div className="space-y-1">
      <label htmlFor="product-dimensions" className="text-sm font-medium text-gray-800">
        Dimensions <span className="text-red-500">*</span>
      </label>
      {/* Image Optimization Progress Overlay */}
      {formLoading && formMsg && (
        <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 p-8 bg-white shadow-2xl rounded-3xl border border-gray-100 scale-95 animate-in zoom-in-90 duration-300">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-black rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-lg font-black text-gray-900 tracking-tight">Please Wait</p>
              <p className="text-sm font-semibold text-blue-600 animate-pulse uppercase tracking-wider">{formMsg}</p>
              <p className="text-xs text-gray-400 mt-2">This may take a moment for high-quality images</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-0 border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-black h-10 bg-white">
        <input
          id="product-dimensions"
          type="text"
          value={product.dimensions}
          onChange={(e) => updateField("dimensions", e.target.value)}
          placeholder="e.g. 10x15"
          className="flex-1 p-2 outline-none border-none text-sm h-full"
          required
        />
        <div className="relative h-full">
          <select
            value={product.dimensionUnit}
            onChange={(e) => updateField("dimensionUnit", e.target.value)}
            className="appearance-none bg-gray-50 text-[10px] font-bold uppercase tracking-widest pl-4 pr-10 h-full border-l border-gray-100 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="cm">cm</option>
            <option value="mm">mm</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>

    {/* Customizations */}
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="space-y-1 w-full">
        <label htmlFor="product-custom-fragrance" className="text-sm font-medium text-gray-800">
          Customizable Fragrance
        </label>
        <select
          id="product-custom-fragrance"
          value={product.customizableFragrance}
          onChange={(e) => updateField("customizableFragrance", e.target.value)}
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
        >
          <option value="true">Fragrance: Yes</option>
          <option value="false">Fragrance: No</option>
        </select>
      </div>

      <div className="space-y-1 w-full">
        <label htmlFor="product-custom-color" className="text-sm font-medium text-gray-800">
          Customizable Color
        </label>
        <select
          id="product-custom-color"
          value={product.customizableColor}
          onChange={(e) => updateField("customizableColor", e.target.value)}
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
        >
          <option value="true">Color: Yes</option>
          <option value="false">Color: No</option>
        </select>
      </div>
    </div>

    {/* Image Upload - Multi Slot */}
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-800 block">
        Product Images (Up to 5) {!isEdit && <span className="text-red-500">*</span>}
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {[0, 1, 2, 3, 4].map((index) => {
          const hasPreview = previews && previews[index];
          const isNextAvailableSlot = !hasPreview && (index === 0 || (previews && previews[index - 1]));
          
          if (!hasPreview && !isNextAvailableSlot) return null;

          return (
            <div key={index} className={`relative aspect-square sm:w-24 sm:h-24 md:w-28 md:h-28 border-2 ${hasPreview ? 'border-transparent' : 'border-dashed border-gray-200'} rounded-xl sm:rounded-2xl flex items-center justify-center bg-gray-50 overflow-hidden shrink-0 group hover:border-black/20 transition-all duration-300`}>
              {hasPreview ? (
                <>
                  <img src={previews[index]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors">
                  <ImagePlus className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-black transition-colors mb-1" />
                  <span className="text-[8px] sm:text-[10px] text-gray-400 font-medium tracking-wide text-center px-1">
                    {index === 0 ? "Primary ★" : "Add Extra"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(index, e)}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-1">PNG, JPG up to 5MB per image.</p>
    </div>

    {/* Video Upload — Optional */}
    <div className="space-y-3 pt-4 border-t border-gray-200">
      <div>
        <label className="text-sm font-bold text-gray-900 block">Product Video <span className="text-gray-400 font-medium">(Optional)</span></label>
        <p className="text-[10px] text-gray-400 mt-0.5">Upload a short video so customers can see the product in real life. Max 50MB. Accepted: MP4, MOV, WebM.</p>
      </div>

      {videoPreviewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 group">
          <video
            src={videoPreviewUrl}
            className="w-full max-h-48 object-cover"
            controls
            muted
            playsInline
          />
          <button
            type="button"
            onClick={removeVideo}
            className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Remove video"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="px-3 py-2 bg-white border-t border-gray-100">
            <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5">
              <Play className="w-3 h-3 text-green-600" />
              Video ready to upload
            </p>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-black/30 hover:bg-gray-50 transition-all group">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
            <Video className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
          </div>
          <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">Click to select video</span>
          <span className="text-[10px] text-gray-400">MP4, MOV, WebM — max 50MB</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
            className="hidden"
            onChange={handleVideoFileChange}
          />
        </label>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
          📱 <strong>Tip:</strong> For best compatibility across all browsers, record in <strong>1080p or less standard quality</strong> (not 4K or ProRes) and share the video as MP4 if possible.
        </p>
      </div>
    </div>

    {/* Validation Error Message */}
    {formMsg && (
      <div className="p-3 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300 mb-2">
        <p className="text-xs font-bold text-red-600 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
          {formMsg}
        </p>
      </div>
    )}

    {/* Action Buttons */}
    <div className="flex gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-100 mt-2">
      <button
        type="submit"
        disabled={formLoading}
        className="flex-1 bg-black text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 active:scale-95 shadow-sm flex items-center justify-center min-h-[44px]"
      >
        {formLoading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Update Product" : "Create Product")}
      </button>
      <button
        type="button"
        onClick={isEdit ? handleCloseEditModal : handleCloseAddModal}
        className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center"
      >
        Cancel
      </button>
    </div>
  </form >
  );
};

export default ProductForm;
