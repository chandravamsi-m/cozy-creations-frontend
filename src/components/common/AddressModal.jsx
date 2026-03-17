import React, { useState, useEffect } from 'react';
import { INDIAN_STATES } from '../../utils/constants';
import { X } from 'lucide-react';

export default function AddressModal({
  isOpen,
  onClose,
  onSave,
  address = null,
  loading = false,
  showTypeSelect = true
}) {
  const [formData, setFormData] = useState({
    fullName: address?.fullName || "",
    phone: address?.phone || "",
    type: address?.type || "Home",
    street: address?.street || "",
    city: address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
  });

  useEffect(() => {
    if (address) {
      setFormData({
        fullName: address.fullName || "",
        phone: address.phone || "",
        type: address.type || "Home",
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
      });
    } else {
      setFormData({
        fullName: "",
        phone: "",
        type: "Home",
        street: "",
        city: "",
        state: "",
        pincode: "",
      });
    }
  }, [address, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4 font-montserrat" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-b border-gray-100">
          <h2 id="address-modal-title" className="font-bold text-gray-900 text-sm">{address ? "Edit Address" : "Add New Address"}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close address form">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {showTypeSelect && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Address Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-3 pr-8 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
              >
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) setFormData(p => ({ ...p, phone: val }));
                }}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Street Address</label>
            <textarea
              value={formData.street}
              onChange={(e) => setFormData(p => ({ ...p, street: e.target.value }))}
              required
              rows={2}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent resize-none"
              placeholder="House No, Building, Street, Landmark"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
                placeholder="e.g. Hyderabad"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">State</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-3 pr-8 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
              >
                <option value="" disabled>Select State</option>
                {INDIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pincode</label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 6) setFormData(p => ({ ...p, pincode: val }));
              }}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
              placeholder="500001"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-50 text-gray-600 font-bold rounded-2xl text-[11px] hover:bg-gray-100 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-2.5 bg-yellow-accent text-black font-bold rounded-2xl text-[11px] hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? "Saving..." : address ? "Apply Changes" : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
