// src/pages/admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { deleteUser, createUser } from "../../api/adminUsers";
import ConfirmModal from "../../components/ConfirmModal";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const scrollToTop = () => {
    setTimeout(() => {
      const scrollable = document.querySelector('main.overflow-y-auto') || document.querySelector('main');
      if (scrollable) {
        scrollable.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  // MODAL STATE
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // EDIT STATE
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [savingUser, setSavingUser] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "user"
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "default",
    confirmText: "Confirm"
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const loadUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (err) {
      console.error("Error loading users:", err);
      showToast("Failed to load users", "error");
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // LOAD USER ORDERS WHEN SELECTED
  useEffect(() => {
    if (!selectedUser?.uid) {
      setUserOrders([]);
      setIsEditing(false); // Reset edit mode on close/change
      return;
    }

    const fetchUserOrders = async () => {
      setLoadingOrders(true);
      try {
        const q = query(collection(db, "orders"), where("userId", "==", selectedUser.uid));
        const snap = await getDocs(q);
        const orders = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const tA = a.createdAt?.seconds || 0;
            const tB = b.createdAt?.seconds || 0;
            return tB - tA;
          });

        setUserOrders(orders);
      } catch (err) {
        console.error("Error fetching user orders:", err);
      }
      setLoadingOrders(false);
    };

    fetchUserOrders();

    // Initialize form data
    setEditFormData({
      displayName: selectedUser.displayName || "",
      shippingAddress: selectedUser.shippingAddress || {
        fullName: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
      }
    });
  }, [selectedUser]);

  const toggleAdmin = (targetUser) => {
    const action = targetUser.role === "admin" ? "remove" : "make";
    setConfirmModal({
      isOpen: true,
      title: "Change User Role",
      message: `Are you sure you want to ${action} ${targetUser.email} an admin?`,
      type: "default",
      confirmText: targetUser.role === "admin" ? "Remove Admin" : "Make Admin",
      onConfirm: async () => {
        setUpdatingId(targetUser.id);
        try {
          const newRole = targetUser.role === "admin" ? "user" : "admin";
          const ref = doc(db, "users", targetUser.id);

          await updateDoc(ref, { role: newRole });

          // Update local list
          setUsers((prev) =>
            prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
          );

          // Update modal if open
          if (selectedUser?.id === targetUser.id) {
            setSelectedUser(prev => ({ ...prev, role: newRole }));
          }

          showToast(`User role updated to ${newRole}`);
          scrollToTop();
        } catch (err) {
          console.error("Error updating role:", err);
          showToast("Failed to update role", "error");
        }
        setUpdatingId(null);
      }
    });
  };

  const handleEditChange = (section, field, value) => {
    if (section === "root") {
      setEditFormData(prev => ({ ...prev, [field]: value }));
    } else if (section === "address") {
      setEditFormData(prev => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [field]: value
        }
      }));
    }
  };

  const saveUserDetails = async () => {
    setSavingUser(true);
    try {
      const ref = doc(db, "users", selectedUser.id);
      await updateDoc(ref, {
        displayName: editFormData.displayName,
        shippingAddress: editFormData.shippingAddress
      });

      // Update local state
      setSelectedUser(prev => ({
        ...prev,
        displayName: editFormData.displayName,
        shippingAddress: editFormData.shippingAddress
      }));
      setUsers(prev =>
        prev.map(u => u.id === selectedUser.id ? {
          ...u,
          displayName: editFormData.displayName,
          shippingAddress: editFormData.shippingAddress
        } : u)
      );

      setIsEditing(false);
      showToast("User details updated successfully!");
      scrollToTop();
    } catch (err) {
      console.error("Error saving user:", err);
      showToast("Failed to save changes", "error");
    }
    setSavingUser(false);
  };

  const handleDeleteUser = (targetUser) => {
    if (targetUser.uid === currentUser?.uid) {
      showToast("You cannot delete yourself", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Permanent Delete User",
      message: `WARNING: This will PERMANENTLY delete the account for ${targetUser.email}. This cannot be undone. Proceed?`,
      type: "danger",
      confirmText: "Delete User",
      onConfirm: async () => {
        setUpdatingId(targetUser.id);
        try {
          const idToken = await currentUser.getIdToken();
          await deleteUser(targetUser.uid, idToken);

          showToast(`User deleted successfully`);
          setSelectedUser(null);
          loadUsers(true);
          scrollToTop();
        } catch (err) {
          console.error("Error deleting user:", err);
          showToast("Failed to delete user", "error");
        }
        setUpdatingId(null);
      }
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const idToken = await currentUser.getIdToken();
      await createUser(createFormData, idToken);
      showToast("User created successfully!");
      setShowCreateModal(false);
      setCreateFormData({ email: "", password: "", displayName: "", role: "user" });
      loadUsers(true);
      scrollToTop();
    } catch (err) {
      console.error("Error creating user:", err);
      showToast(err.message || "Failed to create user", "error");
    }
    setCreatingUser(false);
  };

  return (
    <div className="p-4 sm:p-5 relative">
      <div className="flex flex-row justify-between items-center gap-2 mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 truncate">User Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="shrink-0 text-[11px] sm:text-sm bg-black text-white hover:bg-gray-800 px-3 sm:px-4 py-1.5 rounded-lg font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap"
        >
          + Add User
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-10">Loading users...</p>
      ) : (
        <>
          {/* MOBILE CARD VIEW */}
          <div className="grid md:hidden grid-cols-1 gap-4">
            {users.map((u) => (
              <div key={u.id} className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">
                      {u.displayName || u.shippingAddress?.fullName || u.fullName || "No Name"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === "admin"
                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                  >
                    {u.role || "user"}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedUser(u)}
                  className="w-full text-center text-sm font-semibold text-white bg-black hover:bg-gray-800 py-2.5 rounded-lg transition-colors"
                >
                  Manage
                </button>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto bg-white border rounded-xl shadow-sm">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-gray-900 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Email</th>
                  <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Name</th>
                  <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Role</th>
                  <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {u.displayName || u.shippingAddress?.fullName || u.fullName || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {u.role || "user"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="text-xs font-bold text-blue-600 hover:text-white border border-blue-600 hover:bg-blue-600 px-4 py-2 rounded-lg transition-all"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
            {/* HEADER */}
            <div className="p-4 sm:p-6 border-b flex justify-between items-start sticky top-0 bg-white z-10">
              <div className="flex-1 min-w-0 mr-4">
                {isEditing ? (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Edit Display Name</label>
                    <input
                      value={editFormData.displayName}
                      onChange={(e) => handleEditChange("root", "displayName", e.target.value)}
                      className="text-lg sm:text-xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none w-full bg-blue-50/30 px-2 py-1 rounded-t"
                      placeholder="Display Name"
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 truncate">
                      {selectedUser.displayName || selectedUser.shippingAddress?.fullName || "No Name"}
                    </h3>
                    <p className="text-gray-500 text-sm truncate">{selectedUser.email}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs sm:text-sm bg-black text-white hover:bg-gray-800 px-3 sm:px-4 py-2 rounded-lg font-bold transition-transform active:scale-95 shadow-lg"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 p-2 rounded-full transition-colors"
                >
                  <span className="text-xl leading-none">✕</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-8 flex-1">
              {/* BASIC INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">User ID</p>
                  <p className="text-gray-900 font-mono text-xs break-all">{selectedUser.uid}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Account Role</p>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${selectedUser.role === "admin"
                      ? "bg-purple-100 text-purple-700 border-purple-200"
                      : "bg-white text-gray-600 border-gray-200"
                      }`}>
                      {selectedUser.role || "user"}
                    </span>
                    {selectedUser.email !== currentUser?.email && !isEditing && (
                      <button
                        onClick={() => toggleAdmin(selectedUser)}
                        disabled={updatingId === selectedUser.id}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {selectedUser.role === "admin" ? "Demote" : "Promote to Admin"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SHIPPING ADDRESS */}
              <div className="bg-white rounded-2xl p-5 border-2 border-gray-100 shadow-sm relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 bg-yellow-400 rounded-full"></div>
                  <h4 className="font-bold text-gray-900 uppercase text-sm tracking-tight">Shipping Address</h4>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Full Name</label>
                      <input
                        value={editFormData.shippingAddress.fullName || ""}
                        onChange={(e) => handleEditChange("address", "fullName", e.target.value)}
                        className="w-full text-sm border-2 border-gray-100 p-2.5 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Phone</label>
                      <input
                        value={editFormData.shippingAddress.phone || ""}
                        onChange={(e) => handleEditChange("address", "phone", e.target.value)}
                        className="w-full text-sm border-2 border-gray-100 p-2.5 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                        placeholder="Phone Number"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Street Address</label>
                      <input
                        value={editFormData.shippingAddress.street || ""}
                        onChange={(e) => handleEditChange("address", "street", e.target.value)}
                        className="w-full text-sm border-2 border-gray-100 p-2.5 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                        placeholder="Street Address"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">City</label>
                      <input
                        value={editFormData.shippingAddress.city || ""}
                        onChange={(e) => handleEditChange("address", "city", e.target.value)}
                        className="w-full text-sm border-2 border-gray-100 p-2.5 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                        placeholder="City"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">State</label>
                        <input
                          value={editFormData.shippingAddress.state || ""}
                          onChange={(e) => handleEditChange("address", "state", e.target.value)}
                          className="w-full text-sm border-2 border-gray-100 p-2.5 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Pincode</label>
                        <input
                          value={editFormData.shippingAddress.pincode || ""}
                          onChange={(e) => handleEditChange("address", "pincode", e.target.value)}
                          className="w-full text-sm border-2 border-gray-100 p-2.5 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                          placeholder="Pincode"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  selectedUser.shippingAddress ? (
                    <div className="text-sm text-gray-800 space-y-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold min-w-[60px] text-gray-400 text-xs">NAME</span>
                        <span className="font-medium">{selectedUser.shippingAddress.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold min-w-[60px] text-gray-400 text-xs">PHONE</span>
                        <span className="font-medium">{selectedUser.shippingAddress.phone}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold min-w-[60px] text-gray-400 text-xs">ADDRESS</span>
                        <div className="font-medium">
                          <p>{selectedUser.shippingAddress.street}</p>
                          <p>{selectedUser.shippingAddress.city}, {selectedUser.shippingAddress.state} - {selectedUser.shippingAddress.pincode}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic bg-gray-50 border border-dashed rounded-xl p-6 text-center">
                      No shipping address saved in profile.
                    </div>
                  )
                )}
              </div>

              {/* ORDER HISTORY */}
              {!isEditing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                    <h4 className="font-bold text-gray-900 uppercase text-sm tracking-tight">Order History</h4>
                  </div>

                  {loadingOrders ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto"></div>
                      <p className="mt-2 text-xs font-bold text-gray-400">LOADING ORDERS</p>
                    </div>
                  ) : userOrders.length > 0 ? (
                    <div className="space-y-3">
                      {userOrders.map(order => (
                        <div key={order.id} className="bg-white border text-sm rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-300 transition-colors shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-400 text-[10px]">
                              #{order.id.slice(-4).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-gray-900">₹{order.total}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">
                                {order.createdAt?.seconds
                                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : "DATE UNKNOWN"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-100' :
                              order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-yellow-50 text-yellow-700 border-yellow-100'
                              }`}>
                              {order.status}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                              →
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 font-bold bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-100">
                      NO ORDERS FOUND FOR THIS USER
                    </div>
                  )}
                </div>
              )}

              {/* DANGER ZONE */}
              {!isEditing && selectedUser.uid !== currentUser?.uid && (
                <div className="pt-6 border-t border-red-100">
                  <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">⚠️</span>
                      <h4 className="font-bold text-red-700 uppercase text-xs tracking-wider">Danger Zone</h4>
                    </div>
                    <p className="text-xs text-red-600 mb-4 opacity-80">
                      Deleting this user will permanently remove their account and all profile data. This action is irreversible.
                    </p>
                    <button
                      onClick={() => handleDeleteUser(selectedUser)}
                      disabled={updatingId === selectedUser.id}
                      className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {updatingId === selectedUser.id ? "DELETING..." : "PERMANENTLY DELETE USER"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t bg-gray-50 sticky bottom-0 z-10 sm:rounded-b-2xl flex flex-col sm:flex-row justify-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="order-2 sm:order-1 px-6 py-3 text-gray-500 hover:text-gray-800 text-sm font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveUserDetails}
                    disabled={savingUser}
                    className="order-1 sm:order-2 px-8 py-3 bg-black text-white rounded-xl hover:bg-gray-800 text-sm font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {savingUser ? "Saving Changes..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full sm:w-auto px-8 py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-bold uppercase tracking-wider transition-all active:scale-95"
                >
                  Close Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-2 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Display Name</label>
                <input
                  type="text"
                  required
                  value={createFormData.displayName}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Role</label>
                <select
                  value={createFormData.role}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-black focus:outline-none bg-gray-50/50"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 text-gray-500 font-bold uppercase tracking-wider hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}
