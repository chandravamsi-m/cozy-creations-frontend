import React, { useState, useEffect, useMemo } from 'react';
import { INDIAN_STATES } from '../../utils/constants';
import { X, Info } from 'lucide-react';

const InputLabel = ({ label, required, error, isVisible }) => (
  <div className="flex justify-between items-center ml-1">
    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {isVisible && (
      <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight animate-in fade-in slide-in-from-right-1 duration-200">{error}</span>
    )}
  </div>
);

const getFullInputClass = (hasError) => {
  return `w-full bg-gray-50/50 border ${hasError ? "border-red-200" : "border-gray-100"} rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-yellow-accent/50 focus:border-yellow-accent/50 transition-all duration-200 outline-none`;
};

const PhoneInput = ({ field, label, error, isErrorVisible, value, onChange, onBlur }) => (
  <div className="space-y-1.5">
    <InputLabel label={label} required={field === "phone"} error={error} isVisible={isErrorVisible} />
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none border-r border-gray-100/80 pr-3 transition-colors group-focus-within:border-yellow-accent/30">
        <span className="text-[11px] font-black text-gray-600">+91</span>
      </div>
      <input
        type="tel"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={getFullInputClass(isErrorVisible) + " pl-14 shadow-sm shadow-black/[0.02]"}
        placeholder="00000 00000"
      />
    </div>
  </div>
);

export default function AddressModal({
  isOpen,
  onClose,
  onSave,
  address = null,
  loading = false,
  showTypeSelect = true
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    altPhone: "",
    addressType: "Home",
    houseNo: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (address) {
      setFormData({
        fullName: address.fullName || "",
        phone: address.phone || "",
        altPhone: address.altPhone || "",
        addressType: address.addressType || address.type || "Home",
        houseNo: address.houseNo || "",
        area: address.area || address.street || "", // Heuristic migration: put street in area
        landmark: address.landmark || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        isDefault: address.isDefault || false,
      });
    } else {
      setFormData({
        fullName: "",
        phone: "",
        altPhone: "",
        addressType: "Home",
        houseNo: "",
        area: "",
        landmark: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: false,
      });
    }
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
  }, [address, isOpen]);

  // Real-time validation
  const validate = (data) => {
    let newErrors = {};
    if (!data.fullName) newErrors.fullName = "Required";
    if (!data.phone) newErrors.phone = "Required";
    else if (data.phone.length !== 10) newErrors.phone = "Must be 10 digits";
    
    if (data.altPhone && data.altPhone.length !== 10) newErrors.altPhone = "Must be 10 digits";
    
    if (!data.houseNo) newErrors.houseNo = "Required";
    if (!data.area) newErrors.area = "Required";
    if (!data.city) newErrors.city = "Required";
    if (!data.state) newErrors.state = "Required";
    if (!data.pincode) newErrors.pincode = "Required";
    else if (data.pincode.length !== 6) newErrors.pincode = "Must be 6 digits";

    return newErrors;
  };

  useEffect(() => {
    const newErrors = validate(formData);
    setErrors(newErrors);
  }, [formData]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleNumericInput = (field, val, maxLen) => {
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length <= maxLen) {
      setFormData(prev => ({ ...prev, [field]: cleaned }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    if (!isValid) return;

    // Construct the formatted street string for backward compatibility/Shiprocket
    const street = `${formData.houseNo}, ${formData.area}${formData.landmark ? `, ${formData.landmark}` : ""}`;
    
    onSave({
      ...formData,
      street, // preserve this for legacy components/backend
      type: formData.addressType, // preserve this for old components
    });
  };

  if (!isOpen) return null;

  const isErrorVisible = (field) => {
    return errors[field] && (submitAttempted || (touched[field] && formData[field]));
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4 font-montserrat" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <div>
            <h2 className="font-black text-gray-900 text-sm">{address ? "Update Delivery Location" : "Add New Address"}</h2>
            {!address && <p className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Enter shipping details for accurate delivery</p>}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white w-8 h-8 rounded-full flex items-center justify-center border border-gray-100 shadow-sm" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
          
          {/* 1. CONTACT INFO GROUP */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <InputLabel label="Full Name" required error={errors.fullName} isVisible={isErrorVisible("fullName")} />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                onBlur={() => handleBlur("fullName")}
                className={getFullInputClass(isErrorVisible("fullName"))}
                placeholder="Receiver's name"
              />
            </div>
            
            <PhoneInput 
              field="phone" 
              label="Mobile Number" 
              error={errors.phone} 
              isErrorVisible={isErrorVisible("phone")} 
              value={formData.phone}
              onChange={(e) => handleNumericInput("phone", e.target.value, 10)}
              onBlur={() => handleBlur("phone")}
            />
            
            <PhoneInput 
              field="altPhone" 
              label="Alternate Number (Optional)" 
              error={errors.altPhone} 
              isErrorVisible={isErrorVisible("altPhone")} 
              value={formData.altPhone}
              onChange={(e) => handleNumericInput("altPhone", e.target.value, 10)}
              onBlur={() => handleBlur("altPhone")}
            />
          </div>

          {/* 2. ADDRESS INFO GROUP */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <InputLabel label="Address Type" required error={errors.addressType} isVisible={isErrorVisible("addressType")} />
              <select
                value={formData.addressType}
                onChange={(e) => setFormData(p => ({ ...p, addressType: e.target.value }))}
                onBlur={() => handleBlur("addressType")}
                className={getFullInputClass(isErrorVisible("addressType")) + " appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat cursor-pointer"}
              >
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <InputLabel label="House No / Flat / Building" required error={errors.houseNo} isVisible={isErrorVisible("houseNo")} />
              <input
                type="text"
                value={formData.houseNo}
                onChange={(e) => setFormData(p => ({ ...p, houseNo: e.target.value }))}
                onBlur={() => handleBlur("houseNo")}
                className={getFullInputClass(isErrorVisible("houseNo"))}
                placeholder="Street, apartment"
              />
            </div>

            <div className="space-y-1.5">
              <InputLabel label="Area / Locality" required error={errors.area} isVisible={isErrorVisible("area")} />
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData(p => ({ ...p, area: e.target.value }))}
                onBlur={() => handleBlur("area")}
                className={getFullInputClass(isErrorVisible("area"))}
                placeholder="Local area"
              />
            </div>

            <div className="space-y-1.5">
              <InputLabel label="Landmark (Optional)" isVisible={false} />
              <input
                type="text"
                value={formData.landmark}
                onChange={(e) => setFormData(p => ({ ...p, landmark: e.target.value }))}
                className={getFullInputClass(false)}
                placeholder="Nearby place"
              />
            </div>
          </div>

          {/* 3. LOCATION INFO GROUP */}
          <div className="space-y-4 pt-2 pb-2">
            <div className="space-y-1.5">
              <InputLabel label="Pincode" required error={errors.pincode} isVisible={isErrorVisible("pincode")} />
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => handleNumericInput("pincode", e.target.value, 6)}
                onBlur={() => handleBlur("pincode")}
                className={getFullInputClass(isErrorVisible("pincode"))}
                placeholder="6-digit PIN"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <InputLabel label="City" required error={errors.city} isVisible={isErrorVisible("city")} />
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                  onBlur={() => handleBlur("city")}
                  className={getFullInputClass(isErrorVisible("city"))}
                  placeholder="e.g. Hyderabad"
                />
              </div>
              <div className="space-y-1.5">
                <InputLabel label="State" required error={errors.state} isVisible={isErrorVisible("state")} />
                <div className="relative">
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))}
                    onBlur={() => handleBlur("state")}
                    className={getFullInputClass(isErrorVisible("state")) + " appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat cursor-pointer"}
                  >
                    <option value="" disabled>Select State</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-gray-100 text-gray-500 font-black rounded-2xl text-[10px] hover:bg-gray-200 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isValid}
              className={`flex-[2] py-3.5 font-black rounded-2xl text-[10px] transition-all uppercase tracking-widest shadow-lg shadow-yellow-400/20 active:scale-95 ${
                isValid 
                  ? "bg-yellow-accent text-black hover:scale-[1.02] hover:brightness-105" 
                  : "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
              }`}
            >
              {loading ? "Processing..." : address ? "Apply Changes" : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
