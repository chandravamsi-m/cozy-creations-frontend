// src/pages/admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { deleteUser, createUser, updateUser } from "../../api/adminUsers";
import ConfirmModal from "../../components/ConfirmModal";
import { 
  Plus, X, Search as SearchIcon, ChevronDown as DownIcon, 
  User, ShieldCheck, 
  Trash2, Edit2, ShieldAlert, Calendar, 
  Clock, CheckCircle2, UserCheck,
  Eye, EyeOff
} from "lucide-react";

/**
 * ADMIN USERS MANAGEMENT DASHBOARD
 * Overhauled to Modal-based Edit Workflow
 */
export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  // -- State --
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  // -- Filtering & UI --
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRoleFilter, setActiveRoleFilter] = useState("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  
  // -- Edit & Create --
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    email: "", password: "", confirmPassword: "", displayName: "", role: "user"
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [showP1, setShowP1] = useState(false);
  const [showP2, setShowP2] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    displayName: "", password: "", role: "user"
  });
  const [savingUser, setSavingUser] = useState(false);
  const [showEditP, setShowEditP] = useState(false);
  
  // -- Confirm Modal --
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: "", message: "", onConfirm: () => { }, type: "default", confirmText: "Confirm"
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  // -- Helpers --
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.split(" ");
    return parts.length > 1 
      ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  const getAvatarStyle = (name) => {
    const palettes = [
      "bg-slate-100 text-slate-600",
      "bg-blue-50 text-blue-600",
      "bg-gray-100 text-gray-600",
      "bg-stone-100 text-stone-600",
      "bg-indigo-50 text-indigo-600",
      "bg-emerald-50 text-emerald-600"
    ];
    const idx = (name || "").length % palettes.length;
    return palettes[idx];
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "Never";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const loadUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (err) {
      console.error("Error loading users:", err);
      showToast("Failed to load user database", "error");
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = users.filter((u) => {
    const nameStr = (u.displayName || u.email || "").toLowerCase();
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = nameStr.includes(searchLow) || u.email.toLowerCase().includes(searchLow);
    const matchesRole = activeRoleFilter === "all" || (u.role || "user") === activeRoleFilter;
    return matchesSearch && matchesRole;
  });

  const handleEditInit = (user) => {
    setEditingUser(user);
    setEditFormData({
      displayName: user.displayName || "",
      password: "",
      role: user.role || "user"
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      const idToken = await currentUser.getIdToken();
      const updatePayload = {
        displayName: editFormData.displayName,
        role: editFormData.role
      };
      if (editFormData.password.trim()) {
        updatePayload.password = editFormData.password.trim();
      }
      
      await updateUser(editingUser.id, updatePayload, idToken);
      
      showToast("Profile updated successfully");
      setShowEditModal(false);
      loadUsers(true);
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    }
    setSavingUser(false);
  };

  const handleDeleteUser = (targetUser) => {
    if (targetUser.uid === currentUser?.uid) return showToast("Cannot delete yourself", "error");
    setConfirmModal({
      isOpen: true,
      title: "Delete User Account",
      message: `Permanently remove ${targetUser.email}? This cannot be undone.`,
      type: "danger",
      confirmText: "Delete Account",
      onConfirm: async () => {
        setUpdatingId(targetUser.id);
        try {
          const idToken = await currentUser.getIdToken();
          await deleteUser(targetUser.uid || targetUser.id, idToken);
          showToast("Account deleted");
          loadUsers(true);
        } catch (err) {
          console.error("Error removing user:", err);
          showToast("Error removing user", "error");
        }
        setUpdatingId(null);
      }
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (createFormData.password !== createFormData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    setCreatingUser(true);
    try {
      const idToken = await currentUser.getIdToken();
      await createUser(createFormData, idToken);
      showToast("User created");
      setShowCreateModal(false);
      setCreateFormData({ email: "", password: "", confirmPassword: "", displayName: "", role: "user" });
      loadUsers(true);
    } catch (err) { showToast(err.message || "Failed to create user", "error"); }
    setCreatingUser(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 min-h-screen bg-white">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">User Directory</h1>
          <p className="text-sm font-medium text-gray-500">Manage customer accounts and administrative access</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add New User
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
        <div className="w-full md:max-w-md flex items-center bg-gray-50/50 border border-gray-200 rounded-xl focus-within:border-indigo-500 transition-all overflow-hidden h-11">
          <SearchIcon className="ml-4 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none px-3 py-2 text-sm font-medium focus:outline-none placeholder:text-gray-400" />
        </div>
        <div className="relative w-full md:w-auto">
          <button onClick={() => setStatusDropdownOpen(!statusDropdownOpen)} className="w-full md:w-44 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-between gap-2 hover:border-gray-400 transition-all text-sm font-medium text-gray-700 h-11">
            <span className="truncate capitalize">{activeRoleFilter === 'all' ? 'All Roles' : `${activeRoleFilter}s`}</span>
            <DownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {statusDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-full md:w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1">
                {['all', 'user', 'admin'].map(r => (
                  <button key={r} onClick={() => { setActiveRoleFilter(r); setStatusDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 flex items-center justify-between capitalize ${activeRoleFilter === r ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-600'}`}>{r}{activeRoleFilter === r && <CheckCircle2 className="w-3.5 h-3.5" />}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <p className="text-sm font-medium text-gray-500">Syncing user directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-24 text-center">
            <User className="w-12 h-12 text-gray-100 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">No matches identified</h3>
            <p className="text-xs font-medium text-gray-400">Refine your search or filters</p>
          </div>
        ) : (
          <div className="hidden lg:block bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                  <th className="px-6 py-4">User Identity</th>
                  <th className="px-6 py-4">Account Level</th>
                  <th className="px-6 py-4">Active Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${getAvatarStyle(u.displayName || u.email)} flex items-center justify-center font-bold text-xs ring-1 ring-white shadow-sm`}>{getInitials(u.displayName || u.email)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.displayName || "Anonymous"}</p>
                          <p className="text-[10px] text-gray-400 font-medium truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-white text-gray-500 border-gray-100'}`}>{u.role || 'user'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-300" />
                        {formatRelativeTime(u.updatedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditInit(u)} className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 rounded-lg transition-all shadow-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteUser(u)} className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-100 rounded-lg transition-all shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => { setShowCreateModal(false); setShowP1(false); setShowP2(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none">New Account</h3>
                <p className="text-[11px] font-medium text-slate-400 mt-1.5 uppercase tracking-wider">Fill details to register</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); setShowP1(false); setShowP2(false); }} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100 transition-all"><X className="w-4.5 h-4.5"/></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input type="text" required value={createFormData.displayName} onChange={e => setCreateFormData(p => ({ ...p, displayName: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none bg-white transition-all shadow-sm" placeholder="John Doe"/>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                <input type="email" required value={createFormData.email} onChange={e => setCreateFormData(p => ({ ...p, email: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none bg-white transition-all shadow-sm" placeholder="john@example.com"/>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                <div className="relative group">
                  <input type={showP1 ? "text" : "password"} required minLength={6} value={createFormData.password} onChange={e => setCreateFormData(p => ({ ...p, password: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none bg-white transition-all shadow-sm pr-11" placeholder="••••••••"/>
                  <button type="button" onClick={() => setShowP1(!showP1)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors p-1">{showP1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Confirm Password</label>
                <div className="relative group">
                  <input type={showP2 ? "text" : "password"} required value={createFormData.confirmPassword} onChange={e => setCreateFormData(p => ({ ...p, confirmPassword: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none bg-white transition-all shadow-sm pr-11" placeholder="••••••••"/>
                  <button type="button" onClick={() => setShowP2(!showP2)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors p-1">{showP2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Access Privileges</label>
                <div className="relative group">
                  <select value={createFormData.role} onChange={e => setCreateFormData(p => ({ ...p, role: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none bg-white transition-all shadow-sm appearance-none cursor-pointer">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <DownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={creatingUser} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-900 shadow-lg shadow-indigo-100 hover:shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50">{creatingUser ? "Processing..." : "Register User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => { setShowEditModal(false); setShowEditP(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Modify Profile</h3>
                <p className="text-[11px] font-medium text-slate-400 mt-1.5 uppercase tracking-wider">Update user details</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setShowEditP(false); }} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100 transition-all"><X className="w-4.5 h-4.5"/></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ID Identifier (Email)</label>
                <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-400 shadow-inner select-all cursor-not-allowed">{editingUser.email}</div>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input type="text" required value={editFormData.displayName} onChange={e => setEditFormData(p => ({ ...p, displayName: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none bg-white transition-all shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Reset Password</label>
                <div className="relative group">
                  <input type={showEditP ? "text" : "password"} value={editFormData.password} onChange={e => setEditFormData(p => ({ ...p, password: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none bg-white transition-all shadow-sm pr-11" placeholder="Leave blank to maintain current"/>
                  <button type="button" onClick={() => setShowEditP(!showEditP)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors p-1">{showEditP ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Access Privileges</label>
                <div className="relative group">
                  <select value={editFormData.role} onChange={e => setEditFormData(p => ({ ...p, role: e.target.value }))} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none bg-white transition-all shadow-sm appearance-none cursor-pointer">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <DownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={savingUser} className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-100 hover:shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50">{savingUser ? "Propagating..." : "Apply Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirm} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} confirmText={confirmModal.confirmText} />
    </div>
  );
}
