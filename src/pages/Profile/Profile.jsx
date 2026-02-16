// src/pages/Profile/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { updateUserProfile } from "../../api/userProfile";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import UserSidebar from "../../components/UserSidebar";

export default function Profile() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    address: {
      fullName: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      pincode: "",
    },
  });

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setFormData({
          displayName: data.displayName || "",
          email: user.email || "",
          phone: data.phone || "",
          address: data.shippingAddress || {
            fullName: "",
            phone: "",
            street: "",
            city: "",
            state: "",
            pincode: "",
          },
        });
      } else {
        setFormData(prev => ({ ...prev, email: user.email || "" }));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      showToast("Failed to load profile data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        phone: formData.phone,
        // We don't update shippingAddress here as that's handled in Saved Addresses
      });
      showToast("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Failed to update profile", "error");
    } finally {
      setSaving(false);
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
          <UserSidebar userData={formData} />

          {/* Main Content */}
          <div className="flex-1 w-full scale-in">
            <div className="mb-4">
              <h1 className="text-4xl font-bold mb-2 font-serif">Personal Profile</h1>
              <p className="text-gray-500 font-medium font-serif">Manage your basic details and contact info.</p>
            </div>

            <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-gray-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-accent/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />

              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">Account Information</h3>
                  <p className="text-xs text-gray-400 font-medium">Update your name and primary contact details.</p>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2.5 bg-gray-50 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-100 transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateProfile}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-yellow-accent text-black font-bold rounded-xl text-xs shadow-lg shadow-yellow-accent/10 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl text-xs shadow-lg hover:scale-105 transition-all active:scale-95"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-10 relative z-10">
                <div className="space-y-1.5 border-b border-gray-50 pb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full text-base font-bold text-gray-900 bg-gray-50 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-yellow-accent placeholder:text-gray-300"
                      placeholder="Set your name"
                    />
                  ) : (
                    <p className="text-base font-bold text-gray-900">{formData.displayName || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-1.5 border-b border-gray-50 pb-3 font-serif">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-base font-bold text-gray-500">{formData.email}</p>
                </div>

                <div className="space-y-1.5 border-b border-gray-50 pb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full text-base font-bold text-gray-900 bg-gray-50 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-yellow-accent placeholder:text-gray-300"
                      placeholder="+91 00000 00000"
                    />
                  ) : (
                    <p className="text-base font-bold text-gray-900">{formData.phone || "Not provided"}</p>
                  )}
                </div>

                <div className="space-y-1.5 border-b border-gray-50 pb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Default Shipping City</p>
                  <p className="text-base font-bold text-gray-900">
                    {formData.address.city ? `${formData.address.city}, ${formData.address.state}` : "No default address"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
