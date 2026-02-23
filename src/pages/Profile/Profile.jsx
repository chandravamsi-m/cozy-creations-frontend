// src/pages/Profile/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { updateUserProfile } from "../../api/userProfile";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import UserSidebar from "../../components/UserSidebar";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function Profile() {
  const { user, changeUserPassword, getErrorMessage } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  // Detect if the user signed in with Google (no email/password credential)
  const isGoogleUser = user?.providerData?.some((p) => p.providerId === "google.com");

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

  const handleChangePassword = async () => {
    setPwError("");
    const { current, next, confirm } = pwForm;

    if (!current) { setPwError("Please enter your current password."); return; }
    if (next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (next !== confirm) { setPwError("New passwords do not match."); return; }
    if (current === next) { setPwError("New password must be different from the current one."); return; }

    setPwSaving(true);
    try {
      await changeUserPassword(current, next);
      showToast("Password changed successfully! 🔒");
      setPwForm({ current: "", next: "", confirm: "" });
      setShowPasswordSection(false);
    } catch (err) {
      const msg = getErrorMessage ? getErrorMessage(err) : (err.message || "Failed to change password.");
      setPwError(msg);
    } finally {
      setPwSaving(false);
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
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 font-serif text-gray-900">Personal Profile</h1>
              <p className="text-sm sm:text-base text-gray-500 font-medium font-serif">Manage your basic details and contact info.</p>
            </div>

            <div className="bg-white rounded-[24px] p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-accent/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />

              <div className="flex justify-between items-start gap-4 mb-8 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">Account Information</h3>
                  <p className="text-xs text-gray-400 font-medium">Update your name and primary contact details.</p>
                </div>
                {/* Desktop Buttons */}
                <div className="hidden sm:flex gap-2">
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
                      className="px-6 py-2.5 bg-yellow-accent text-black font-bold rounded-xl text-xs shadow-lg shadow-yellow-accent/10 hover:scale-105 transition-all active:scale-95"
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

              {/* Mobile Buttons */}
              <div className="sm:hidden mt-8 relative z-10">
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-bold rounded-2xl text-sm active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateProfile}
                      disabled={saving}
                      className="flex-[2] py-3.5 bg-yellow-accent text-black font-bold rounded-2xl text-sm shadow-lg shadow-yellow-accent/10 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3.5 bg-yellow-accent text-black font-bold rounded-2xl text-sm shadow-lg shadow-yellow-accent/10 active:scale-95 transition-all"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* SECURITY SECTION */}
            <div className="mt-6 bg-white rounded-[24px] p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-50 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-accent/10 grid place-items-center shrink-0 border border-yellow-accent/10">
                    <Lock className="w-5 h-5 text-gray-900" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">Security</h3>
                    <p className="text-xs text-gray-400 font-medium">Manage your account password.</p>
                  </div>
                </div>
                {!isGoogleUser && !showPasswordSection && (
                  <button
                    onClick={() => { setShowPasswordSection(true); setPwError(""); setPwForm({ current: "", next: "", confirm: "" }); }}
                    className="hidden sm:block px-6 py-2.5 bg-yellow-accent text-black font-bold rounded-xl text-xs shadow-lg shadow-yellow-accent/10 hover:scale-105 transition-all active:scale-95"
                  >
                    Change Password
                  </button>
                )}
              </div>

              {/* Google User Info */}
              {isGoogleUser && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 mt-0.5 shrink-0" alt="Google" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Signed in with Google</p>
                    <p className="text-xs text-gray-500 mt-0.5">Your password is managed by Google. To change it, visit your <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Account settings</a>.</p>
                  </div>
                </div>
              )}

              {/* Change Password Form */}
              {!isGoogleUser && !showPasswordSection && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-500">Your password is set. You can change it anytime.</p>
                  <button
                    onClick={() => { setShowPasswordSection(true); setPwError(""); setPwForm({ current: "", next: "", confirm: "" }); }}
                    className="sm:hidden w-full py-3.5 bg-yellow-accent text-black font-bold rounded-2xl text-sm shadow-lg shadow-yellow-accent/10 active:scale-95 transition-all"
                  >
                    Change Password
                  </button>
                </div>
              )}

              {!isGoogleUser && showPasswordSection && (
                <div className="space-y-4 max-w-md">
                  {pwError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{pwError}</div>
                  )}

                  {/* Current Password */}
                  {[{ key: "current", label: "Current Password" }, { key: "next", label: "New Password" }, { key: "confirm", label: "Confirm New Password" }].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
                      <div className="relative">
                        <input
                          type={pwShow[key] ? "text" : "password"}
                          value={pwForm[key]}
                          onChange={(e) => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                          placeholder="••••••••"
                          className="w-full text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-yellow-accent/40 focus:border-yellow-accent/40 placeholder:text-gray-300 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setPwShow(p => ({ ...p, [key]: !p[key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={pwShow[key] ? "Hide" : "Show"}
                        >
                          {pwShow[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setShowPasswordSection(false); setPwError(""); }}
                      className="px-5 py-2.5 bg-gray-50 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-100 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={pwSaving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-yellow-accent text-black font-bold rounded-xl text-xs shadow-lg shadow-yellow-accent/10 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {pwSaving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
