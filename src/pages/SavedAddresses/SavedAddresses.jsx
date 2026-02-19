// src/pages/SavedAddresses/SavedAddresses.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useToast } from "../../contexts/ToastContext";
import UserSidebar from "../../components/UserSidebar";

const MAX_ADDRESSES = 5;

export default function SavedAddresses() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({ displayName: "", email: "" });
  const [addresses, setAddresses] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null); // null means adding
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData({
          displayName: data.displayName || "",
          email: user.email || "",
        });

        // Multi-address support: look for 'addresses' array, fallback to 'shippingAddress'
        if (data.addresses && Array.isArray(data.addresses)) {
          setAddresses(data.addresses);
        } else if (data.shippingAddress) {
          // Initialize addresses array with the legacy single shippingAddress
          const initialAddress = {
            id: "default-legacy",
            type: "Home",
            tag: "Primary Residence",
            isDefault: true,
            ...data.shippingAddress
          };
          setAddresses([initialAddress]);
          // Sync it back as an array for future-proofing
          await updateDoc(userRef, { addresses: [initialAddress] });
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load addresses", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));

      const defaultAddr = updatedAddresses.find(a => a.id === addressId);
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        addresses: updatedAddresses,
        shippingAddress: defaultAddr // Keep in sync for checkout
      });

      setAddresses(updatedAddresses);
      showToast("Default address updated!");
    } catch (err) {
      console.error(err);
      showToast("Failed to update default address", "error");
    }
  };

  const handleRemoveAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to remove this address?")) return;

    try {
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      const userRef = doc(db, "users", user.uid);

      // If we removed the default address and there are others left, make the first one default
      if (addresses.find(a => a.id === addressId)?.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }

      const newDefault = updatedAddresses.find(a => a.isDefault) || null;

      await updateDoc(userRef, {
        addresses: updatedAddresses,
        shippingAddress: newDefault
      });

      setAddresses(updatedAddresses);
      showToast("Address removed successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to remove address", "error");
    }
  };

  const handleSaveAddress = async (formData) => {
    setModalLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      let updatedAddresses = [];

      if (currentAddress) {
        // Edit existing
        updatedAddresses = addresses.map(addr =>
          addr.id === currentAddress.id ? { ...addr, ...formData } : addr
        );
      } else {
        // Add new
        if (addresses.length >= MAX_ADDRESSES) {
          showToast(`Maximum limit of ${MAX_ADDRESSES} addresses reached.`, "error");
          setModalLoading(false);
          return;
        }
        const newAddress = {
          ...formData,
          id: Date.now().toString(),
          isDefault: addresses.length === 0 // Make default if first address
        };
        updatedAddresses = [...addresses, newAddress];
      }

      const defaultAddr = updatedAddresses.find(a => a.isDefault) || null;

      await updateDoc(userRef, {
        addresses: updatedAddresses,
        shippingAddress: defaultAddr
      });

      setAddresses(updatedAddresses);
      showToast(currentAddress ? "Address updated!" : "New address added!");
      setIsModalOpen(false);
      setCurrentAddress(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to save address", "error");
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-20 pb-12 px-4 sm:px-6 lg:px-8 font-montserrat text-[#191816]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Reusable Sticky Sidebar */}
          <UserSidebar userData={userData} />

          {/* Main Content */}
          <div className="flex-1 w-full scale-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2 font-serif">Saved Addresses</h1>
                <p className="text-gray-500 font-medium font-serif">Manage your delivery locations for faster checkout.</p>
              </div>
              <button
                onClick={() => {
                  setCurrentAddress(null);
                  setIsModalOpen(true);
                }}
                disabled={addresses.length >= MAX_ADDRESSES}
                className={`flex items-center gap-2 px-3 py-2 font-bold rounded-lg shadow-lg transition-all active:scale-95 text-xs ${addresses.length >= MAX_ADDRESSES
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-yellow-accent text-black shadow-yellow-accent/20 hover:scale-105"
                  }`}
              >
                <span className="text-lg">+</span>
                Add New Address
              </button>
            </div>

            <div className="bg-white rounded-[24px] p-2 shadow-sm border border-gray-50">
              {/* Address Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => !addr.isDefault && handleSetDefault(addr.id)}
                    className={`relative p-4 rounded-3xl border-2 transition-all group cursor-pointer ${addr.isDefault ? "border-yellow-accent bg-[#FFFDF5]" : "border-gray-50 bg-white hover:border-gray-200 hover:shadow-md"
                      }`}
                  >
                    {addr.isDefault && (
                      <span className="absolute top-4 right-4 bg-yellow-accent/20 text-yellow-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                        Default
                      </span>
                    )}

                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-lg border border-gray-50 group-hover:scale-110 transition-transform">
                        {addr.type === "Home" ? "🏠" : addr.type === "Office" ? "💼" : "📍"}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{addr.type}</h3>
                      </div>
                    </div>

                    <div className="space-y-0.5 mb-2">
                      <p className="font-bold text-gray-900 text-[13px]">{addr.fullName}</p>
                      <p className="text-gray-500 text-[13px] leading-relaxed">{addr.street}</p>
                      <p className="text-gray-500 text-[13px] leading-relaxed">
                        {addr.city}{addr.state ? `, ${addr.state}` : ""} - {addr.pincode}
                      </p>
                      <p className="text-gray-400 text-[12px] pt-1">{addr.country || "India"}</p>
                    </div>

                    <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setCurrentAddress(addr);
                          setIsModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-gray-900 hover:text-yellow-600 transition-colors"
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => handleRemoveAddress(addr.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors"
                      >
                        🗑 Remove
                      </button>
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-auto hover:text-gray-900 transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Another Placeholder */}
                {addresses.length < MAX_ADDRESSES && (
                  <button
                    onClick={() => {
                      setCurrentAddress(null);
                      setIsModalOpen(true);
                    }}
                    className="border-2 border-dashed border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-yellow-accent/50 hover:bg-gray-50/50 transition-all min-h-[160px] group"
                  >
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 text-xl group-hover:bg-yellow-accent group-hover:text-black transition-colors">
                      +
                    </div>
                    <p className="text-sm font-bold text-gray-400 group-hover:text-gray-900 transition-colors">Add Another Address</p>
                  </button>
                )}
              </div>

              {/* Bottom Banner - Scaled Down */}
              <div className="relative rounded-2xl overflow-hidden h-24 group">
                <img
                  src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000"
                  alt="Coverage"
                  className="w-full h-full object-cover grayscale opacity-20 group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent flex flex-col justify-center px-6">
                  <p className="text-[9px] font-black text-yellow-600 uppercase tracking-[0.2em] mb-0.5">Active Coverage</p>
                  <h4 className="text-[15px] font-bold text-gray-900">Standard delivery available for all locations.</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {
        isModalOpen && (
          <AddressModal
            address={currentAddress}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveAddress}
            loading={modalLoading}
          />
        )
      }
    </div >
  );
}

function AddressModal({ address, onClose, onSave, loading }) {
  const [formData, setFormData] = useState({
    type: address?.type || "Home",
    fullName: address?.fullName || "",
    phone: address?.phone || "",
    street: address?.street || "",
    city: address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 font-montserrat">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{address ? "Edit Address" : "Add New Address"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Address Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
            >
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</label>
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
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
              placeholder="9876543210"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Address Line</label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData(p => ({ ...p, street: e.target.value }))}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
              placeholder="House No, Street, Landmark"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
                placeholder="e.g. Mumbai"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
                placeholder="e.g. Maharashtra"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pincode</label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) => setFormData(p => ({ ...p, pincode: e.target.value }))}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-yellow-accent"
              placeholder="400001"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-50 text-gray-600 font-bold rounded-2xl text-xs hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 bg-yellow-accent text-black font-bold rounded-2xl text-xs hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Saving..." : address ? "Apply Changes" : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
