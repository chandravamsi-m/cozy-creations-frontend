// src/pages/admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { db } from "../src/firebase";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "../src/contexts/AuthContext";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  
  // MODAL STATE
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // EDIT STATE
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [savingUser, setSavingUser] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setMsg("");
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (err) {
      console.error("Error loading users:", err);
      setMsg("Failed to load users. Check permissions.");
    }
    setLoading(false);
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

  const toggleAdmin = async (targetUser) => {
    if (confirm(`Are you sure you want to ${targetUser.role === "admin" ? "remove" : "make"} ${targetUser.email} an admin?`)) {
      setUpdatingId(targetUser.id);
      setMsg("");
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

        setMsg(`Updated ${targetUser.email} to ${newRole} ✔`);
      } catch (err) {
        console.error("Error updating role:", err);
        setMsg("Failed to update role. Permission denied?");
      }
      setUpdatingId(null);
    }
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
      alert("User details updated successfully!"); // Simple feedback
    } catch (err) {
      console.error("Error saving user:", err);
      alert("Failed to save changes: " + err.message);
    }
    setSavingUser(false);
  };

  return (
    <div className="p-4 sm:p-5 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">User Management</h2>
        <button 
          onClick={loadUsers} 
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-700"
        >
          Refresh
        </button>
      </div>

      {msg && (
        <div className={`p-3 rounded mb-4 text-sm ${msg.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading users...</p>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-900 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.displayName || u.shippingAddress?.fullName || u.fullName || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span 
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "admin" 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.role || "user"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* HEADER */}
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                {isEditing ? (
                   <input 
                     value={editFormData.displayName}
                     onChange={(e) => handleEditChange("root", "displayName", e.target.value)}
                     className="text-xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-black w-full"
                     placeholder="Display Name"
                   />
                ) : (
                  <h3 className="text-xl font-bold text-gray-900">{selectedUser.displayName || selectedUser.shippingAddress?.fullName || "No Name"}</h3>
                )}
                <p className="text-gray-500 text-sm mt-1">{selectedUser.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-sm bg-black text-white hover:bg-gray-800 px-4 py-1.5 rounded font-medium transition-colors shadow-sm"
                  >
                    Edit Details
                  </button>
                )}
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              {/* BASIC INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">User ID</p>
                  <p className="text-gray-900 font-mono text-xs">{selectedUser.uid}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Role</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedUser.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"
                    }`}>
                      {selectedUser.role || "user"}
                    </span>
                    {selectedUser.email !== currentUser?.email && !isEditing && (
                       <button
                         onClick={() => toggleAdmin(selectedUser)}
                         disabled={updatingId === selectedUser.id}
                         className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                       >
                         {selectedUser.role === "admin" ? "Revoke Admin" : "Grant Admin"}
                       </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SHIPPING ADDRESS */}
              <div className="bg-gray-50 rounded-lg p-4 border relative">
                <h4 className="font-semibold text-gray-900 mb-2">Saved Shipping Address</h4>
                
                {isEditing ? (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs text-gray-500">Full Name</label>
                        <input 
                          value={editFormData.shippingAddress.fullName || ""}
                          onChange={(e) => handleEditChange("address", "fullName", e.target.value)}
                          className="w-full text-sm border p-1.5 rounded"
                          placeholder="Full Name"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs text-gray-500">Phone</label>
                        <input 
                          value={editFormData.shippingAddress.phone || ""}
                          onChange={(e) => handleEditChange("address", "phone", e.target.value)}
                          className="w-full text-sm border p-1.5 rounded"
                          placeholder="Phone Number"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500">Street Address</label>
                        <input 
                          value={editFormData.shippingAddress.street || ""}
                          onChange={(e) => handleEditChange("address", "street", e.target.value)}
                          className="w-full text-sm border p-1.5 rounded"
                          placeholder="Street Address"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">City</label>
                        <input 
                          value={editFormData.shippingAddress.city || ""}
                          onChange={(e) => handleEditChange("address", "city", e.target.value)}
                          className="w-full text-sm border p-1.5 rounded"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">State</label>
                        <input 
                          value={editFormData.shippingAddress.state || ""}
                          onChange={(e) => handleEditChange("address", "state", e.target.value)}
                          className="w-full text-sm border p-1.5 rounded"
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Pincode</label>
                        <input 
                          value={editFormData.shippingAddress.pincode || ""}
                          onChange={(e) => handleEditChange("address", "pincode", e.target.value)}
                          className="w-full text-sm border p-1.5 rounded"
                          placeholder="Pincode"
                        />
                      </div>
                   </div>
                ) : (
                  selectedUser.shippingAddress ? (
                     <div className="text-sm text-gray-700 space-y-1">
                        <p><span className="font-medium">Name:</span> {selectedUser.shippingAddress.fullName}</p>
                        <p><span className="font-medium">Phone:</span> {selectedUser.shippingAddress.phone}</p>
                        <p><span className="font-medium">Address:</span> {selectedUser.shippingAddress.street}</p>
                        <p>{selectedUser.shippingAddress.city}, {selectedUser.shippingAddress.state} - {selectedUser.shippingAddress.pincode}</p>
                     </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No address saved yet.</p>
                  )
                )}
              </div>

              {/* ORDER HISTORY */}
              {!isEditing && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Order History</h4>
                  {loadingOrders ? (
                    <div className="text-center py-4 text-gray-500 text-sm">Loading orders...</div>
                  ) : userOrders.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-700 sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Order ID</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Total</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {userOrders.map(order => (
                            <tr key={order.id} className="bg-white">
                              <td className="px-3 py-2 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                              <td className="px-3 py-2">
                                {order.createdAt?.seconds 
                                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="px-3 py-2 font-medium">₹{order.total}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center">No orders found.</p>
                  )}
                </div>
              )}

            </div>
            
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveUserDetails}
                    disabled={savingUser}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
                  >
                    {savingUser ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
