// src/pages/SavedAddresses/SavedAddresses.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useToast } from "../../contexts/ToastContext";
import UserSidebar from "../../components/UserSidebar";
import ConfirmModal from "../../components/ConfirmModal";
import AddressModal from "../../components/common/AddressModal";
import { Home, Briefcase, MapPin, Pencil, Trash2, Plus } from "lucide-react";

const MAX_ADDRESSES = 10;

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

  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);

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

  const handleRemoveAddress = (addressId) => {
    setAddressToDelete(addressId);
    setIsDeleteModalOpen(true);
  };

  const confirmRemoveAddress = async () => {
    if (!addressToDelete) return;

    try {
      const updatedAddresses = addresses.filter(addr => addr.id !== addressToDelete);
      const userRef = doc(db, "users", user.uid);

      // If we removed the default address and there are others left, make the first one default
      if (addresses.find(a => a.id === addressToDelete)?.isDefault && updatedAddresses.length > 0) {
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
    } finally {
      setAddressToDelete(null);
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
    <div className="min-h-screen bg-[#F8F9FA] pt-20 lg:pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-montserrat text-[#191816]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start">
          {/* Reusable Sticky Sidebar */}
          <UserSidebar userData={userData} />

          {/* Main Content */}
          <div className="flex-1 w-full scale-in">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4">
              <div className="lg:block hidden">
                <h1 className="text-4xl font-bold mb-2 font-serif">Saved Addresses</h1>
                <p className="text-gray-500 font-medium font-serif">Manage your delivery locations for faster checkout.</p>
              </div>
              <button
                onClick={() => {
                  setCurrentAddress(null);
                  setIsModalOpen(true);
                }}
                disabled={addresses.length >= MAX_ADDRESSES}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 font-bold rounded-lg shadow-lg transition-all active:scale-95 text-[10px] sm:text-xs ${addresses.length >= MAX_ADDRESSES
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-yellow-accent text-black shadow-yellow-accent/20 hover:scale-105"
                  }`}
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                Add New Address
              </button>
            </div>

            <div className="bg-transparent sm:bg-white rounded-none sm:rounded-[24px] p-0 sm:p-2 shadow-none sm:shadow-sm border-none sm:border border-gray-50">
              {/* Address Grid - 2 columns even on mobile */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => !addr.isDefault && handleSetDefault(addr.id)}
                    className={`relative p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 transition-all group cursor-pointer ${addr.isDefault ? "border-yellow-accent bg-[#FFFDF5]" : "border-gray-50 bg-white hover:border-gray-200 hover:shadow-md"
                      }`}
                  >
                    {addr.isDefault && (
                      <span className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-yellow-accent/20 text-yellow-700 text-[7px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-widest">
                        Default
                      </span>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center border border-gray-50 group-hover:scale-110 transition-transform">
                        {addr.type === "Home" ? (
                          <Home className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        ) : addr.type === "Office" ? (
                          <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        ) : (
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-[11px] sm:text-sm">{addr.addressType || addr.type}</h3>
                      </div>
                    </div>

                    <div className="space-y-0.5 mb-2 overflow-hidden">
                      <p className="font-bold text-gray-900 text-[11px] sm:text-[13px] truncate">{addr.fullName}</p>
                      {addr.houseNo ? (
                        <>
                          <p className="text-gray-500 text-[10px] sm:text-[13px] leading-tight sm:leading-relaxed line-clamp-1">
                            {addr.houseNo}, {addr.area}
                          </p>
                          {addr.landmark && (
                            <p className="text-gray-400 text-[9px] sm:text-[11px] italic truncate">
                              Near {addr.landmark}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 text-[10px] sm:text-[13px] leading-tight sm:leading-relaxed line-clamp-2">
                          {addr.street}
                        </p>
                      )}
                      <p className="text-gray-500 text-[10px] sm:text-[13px] leading-tight sm:leading-relaxed line-clamp-1">
                        {addr.city}{addr.state ? `, ${addr.state}` : ""}
                      </p>
                      <p className="text-gray-400 text-[10px] sm:text-[12px] font-medium">{addr.pincode}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentAddress(addr);
                          setIsModalOpen(true);
                        }}
                        className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-gray-900 hover:text-yellow-600 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAddress(addr.id);
                        }}
                        className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-[7px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest ml-auto hover:text-gray-900 transition-colors hidden sm:block"
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
                    className="border-2 border-dashed border-gray-100 rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-3 hover:border-yellow-accent/50 hover:bg-gray-50/50 transition-all min-h-[140px] sm:min-h-[160px] group"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-yellow-accent group-hover:text-black transition-colors">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <p className="text-[11px] sm:text-sm font-bold text-gray-400 group-hover:text-gray-900 transition-colors text-center">Add Address</p>
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

      {
        isModalOpen && (
          <AddressModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveAddress}
            address={currentAddress}
            loading={modalLoading}
            showTypeSelect={true}
          />
        )
      }

      {/* Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmRemoveAddress}
        title="Remove Address"
        message="Are you sure you want to remove this address? This action cannot be undone."
        confirmText="Remove Address"
        type="danger"
      />
    </div >
  );
}
