import React from "react";
import { ChevronDown, ImagePlus } from "lucide-react";

const ProductForm = ({
  isEdit,
  onSubmit,
  product,
  updateField,
  handleFileChange,
  preview,
  formLoading,
  handleCloseAddModal,
  handleCloseEditModal,
  // Bulk pricing props
  bulkPricingTiers,
  addTier,
  removeTier,
  updateTier
}) => (
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

    {/* Row: Weight & Burn Time */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Weight */}
      <div className="space-y-1">
        <label htmlFor="product-weight" className="text-sm font-medium text-gray-800">
          Weight <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="product-weight"
            type="number"
            value={product.weightGrams}
            onChange={(e) => updateField("weightGrams", e.target.value)}
            placeholder="Weight"
            className="border border-gray-300 p-2 pr-12 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">g</span>
        </div>
      </div>

      {/* Burn Time */}
      <div className="space-y-1">
        <label htmlFor="product-burn-time" className="text-sm font-medium text-gray-800">
          Burn Time <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="product-burn-time"
            type="text"
            value={product.burnTimeHours}
            onChange={(e) => updateField("burnTimeHours", e.target.value)}
            placeholder="Burn Time"
            className="border border-gray-300 p-2 pr-12 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">hr</span>
        </div>
      </div>
    </div>

    {/* Row: Quantity Pack & Price */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor="product-quantity-pack" className="text-sm font-medium text-gray-800">
          Qty Pack <span className="text-red-500">*</span>
        </label>
        <input
          id="product-quantity-pack"
          type="number"
          value={product.quantityPack}
          onChange={(e) => updateField("quantityPack", e.target.value)}
          placeholder="1"
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10"
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="product-price" className="text-sm font-medium text-gray-800">
          Price (₹) <span className="text-red-500">*</span>
        </label>
        <input
          id="product-price"
          type="number"
          value={product.price}
          onChange={(e) => updateField("price", e.target.value)}
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
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-all"
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
                      onChange={(e) => updateTier(index, "minQty", e.target.value)}
                      placeholder="e.g. 15"
                      className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-blue-500 outline-none h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-600 font-medium block mb-1">
                      Price per Piece (₹)
                    </label>
                    <input
                      type="number"
                      value={tier.pricePerPc}
                      onChange={(e) => updateTier(index, "pricePerPc", e.target.value)}
                      placeholder="e.g. 54"
                      className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-blue-500 outline-none h-9 text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Row: Dimensions & Inventory (Optional) */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor="product-dimensions" className="text-sm font-medium text-gray-800">
          Dimensions <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <div className="flex items-center gap-0 border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-black h-10 bg-white">
          <input
            id="product-dimensions"
            type="text"
            value={product.dimensions}
            onChange={(e) => updateField("dimensions", e.target.value)}
            placeholder="e.g. 10x15"
            className="flex-1 p-2 outline-none border-none text-sm h-full"
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

      <div className="space-y-1">
        <label htmlFor="product-inventory" className="text-sm font-medium text-gray-800">
          Inventory <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <input
          id="product-inventory"
          type="number"
          value={product.inventory}
          onChange={(e) => updateField("inventory", e.target.value)}
          placeholder="Default 100"
          className="border border-gray-300 p-2 w-full rounded focus:ring-1 focus:ring-black outline-none h-10 text-sm"
        />
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

    {/* Image Upload */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-800 block">
        Product Image {!isEdit && <span className="text-red-500">*</span>}
      </label>

      <div className="relative group">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="product-image-upload"
        />

        <label
          htmlFor="product-image-upload"
          className={`
            relative flex flex-col items-center justify-center w-full min-h-[180px] 
            border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
            ${preview
              ? 'border-transparent bg-gray-100 hover:bg-gray-200'
              : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-black/20 hover:shadow-xl'}
          `}
        >
          {preview ? (
            <div className="w-full h-full absolute inset-0">
              <img
                src={preview}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                alt="Preview"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[2px]">
                <div className="bg-white/90 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-gray-900 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  Change Image
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center border border-gray-100 text-gray-400 group-hover:text-black group-hover:rotate-6 transition-all duration-300">
                <ImagePlus className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">Upload Product Image</p>
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">PNG, JPG up to 5MB</p>
              </div>
            </div>
          )}
        </label>
      </div>
    </div>

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

export default ProductForm;
