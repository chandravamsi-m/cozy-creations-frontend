// src/pages/admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { createPortal } from "react-dom";
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
  Eye, EyeOff,
  RefreshCw as RefreshIcon
} from "lucide-react";
import Skeleton from "../../components/common/Skeleton";

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
    <div className="space-y-4 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div className="flex items-end gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-none">Users</h2>
          <p className="text-[10px] font-medium text-gray-400 mb-0.5">Control Panel</p>
        </div>
        
        <button 
           onClick={() => setShowCreateModal(true)} 
           className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New User
        </button>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-row items-center justify-between gap-2 lg:gap-6 py-2 px-1 border-y border-gray-100 bg-gray-50/10">
        
        <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all overflow-hidden h-10 lg:max-w-xl">
          <div className="pl-4 text-gray-400 shrink-0">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="flex-1 bg-transparent border-none px-3 py-2 text-sm focus:outline-none placeholder:text-gray-400" 
          />
          <div className="mr-1.5 p-1.5 lg:px-6 lg:py-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 text-[10px] font-black">
             Search
          </div>
        </div>

        <div className="relative shrink-0">
          <button 
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="px-3 lg:px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center gap-2 lg:gap-3 hover:border-gray-400 transition-all text-[11px] lg:text-sm font-bold text-gray-700 h-10"
          >
            <span className="text-[10px] text-gray-400 font-bold">Role:</span>
            <span className="truncate max-w-[60px] sm:max-w-[120px]">
               {activeRoleFilter === 'all' ? 'All Roles' : activeRoleFilter}
            </span>
            <DownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {statusDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-[180px] bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {['all', 'user', 'admin'].map(r => (
                  <button 
                    key={r} 
                    onClick={() => { setActiveRoleFilter(r); setStatusDropdownOpen(false); }} 
                    className={`w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-gray-50 flex items-center justify-between group transition-colors ${activeRoleFilter === r ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="min-h-[500px]">
        {loading ? (
           <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
             {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton width="40px" height="40px" borderRadius="10px" />
                    <div className="space-y-2">
                       <Skeleton width="120px" height="14px" />
                       <Skeleton width="180px" height="10px" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-between">
                     <Skeleton width="60px" height="20px" borderRadius="8px" />
                     <Skeleton width="40px" height="40px" borderRadius="full" />
                  </div>
                </div>
             ))}
           </div>
        ) : filteredUsers.length === 0 ? (
           <div className="bg-white border border-gray-100 rounded-2xl p-24 text-center">
              <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">No user records identified</p>
           </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (< lg) */}
            <div className="lg:hidden space-y-3">
              {filteredUsers.map(u => (
                <div key={u.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${getAvatarStyle(u.displayName || u.email)} flex items-center justify-center font-bold text-xs shadow-sm`}>
                        {getInitials(u.displayName || u.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-gray-900 truncate tracking-tight">{u.displayName || "Anonymous"}</p>
                        <p className="text-[9px] text-gray-400 font-medium truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border shadow-sm ${u.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                      {u.role || 'user'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 font-medium uppercase tracking-tight mb-0.5">Last Active</span>
                      <span className="text-[10px] font-bold text-gray-600">{formatRelativeTime(u.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditInit(u)} className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95 shadow-sm">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(u)} className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW (>= lg) */}
            <div className="hidden lg:block bg-white border rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-5 text-[10px] font-bold text-gray-400 tracking-[0.15em] border-r border-gray-100/50">User Identity</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-gray-400 tracking-[0.15em] border-r border-gray-100/50">Account Level</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-gray-400 tracking-[0.15em] border-r border-gray-100/50">Last Active</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-gray-400 tracking-[0.15em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-blue-50/30 transition-all cursor-pointer group hover:scale-[1.002] duration-200">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${getAvatarStyle(u.displayName || u.email)} flex items-center justify-center font-bold text-xs shadow-sm`}>{getInitials(u.displayName || u.email)}</div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tight">{u.displayName || "Anonymous"}</p>
                            <p className="text-[9px] text-gray-400 font-medium truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 border-l border-gray-50/10">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm ${u.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{u.role || 'user'}</span>
                      </td>
                      <td className="px-6 py-3.5 border-l border-gray-50/10">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-600">{formatRelativeTime(u.updatedAt)}</span>
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Active status</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right w-[120px]">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditInit(u)} className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95 shadow-sm"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteUser(u)} className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => { setShowCreateModal(false); setShowP1(false); setShowP2(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-none">New Account</h3>
                <p className="text-[10px] font-medium text-gray-400 mt-1.5">Fill details to register</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); setShowP1(false); setShowP2(false); }} className="p-2 -mr-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-900 transition-all"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Full Name</label>
                <input type="text" required value={createFormData.displayName} onChange={e => setCreateFormData(p => ({ ...p, displayName: e.target.value }))} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-blue-500 transition-all outline-none bg-white" placeholder="John Doe"/>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Email Address</label>
                <input type="email" required value={createFormData.email} onChange={e => setCreateFormData(p => ({ ...p, email: e.target.value }))} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-blue-500 transition-all outline-none bg-white" placeholder="john@example.com"/>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Password</label>
                <div className="relative group">
                  <input type={showP1 ? "text" : "password"} required minLength={6} value={createFormData.password} onChange={e => setCreateFormData(p => ({ ...p, password: e.target.value }))} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-blue-500 transition-all outline-none bg-white pr-11" placeholder="••••••••"/>
                  <button type="button" onClick={() => setShowP1(!showP1)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors p-1">{showP1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Confirm Password</label>
                <div className="relative group">
                  <input type={showP2 ? "text" : "password"} required value={createFormData.confirmPassword} onChange={e => setCreateFormData(p => ({ ...p, confirmPassword: e.target.value }))} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-blue-500 transition-all outline-none bg-white pr-11" placeholder="••••••••"/>
                  <button type="button" onClick={() => setShowP2(!showP2)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors p-1">{showP2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Access Privileges</label>
                <div className="relative group">
                  <select value={createFormData.role} onChange={e => setCreateFormData(p => ({ ...p, role: e.target.value }))} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold focus:border-blue-500 outline-none bg-white transition-all appearance-none cursor-pointer">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <DownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={creatingUser} className="w-full py-3.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50">{creatingUser ? "Processing..." : "Register User"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT MODAL */}
      {showEditModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => { setShowEditModal(false); setShowEditP(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Modify Profile</h3>
                <p className="text-[10px] font-medium text-gray-400 mt-1.5">Update user details</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setShowEditP(false); }} className="p-2 -mr-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-900 transition-all"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Email Address</label>
                <div className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-400 select-all cursor-not-allowed text-ellipsis overflow-hidden">{editingUser.email}</div>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Full Name</label>
                <input type="text" required value={editFormData.displayName} onChange={e => setEditFormData(p => ({ ...p, displayName: e.target.value }))} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-blue-500 transition-all outline-none bg-white"/>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Reset Password</label>
                <div className="relative group">
                  <input type={showEditP ? "text" : "password"} value={editFormData.password} onChange={e => setEditFormData(p => ({ ...p, password: e.target.value }))} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:border-blue-500 transition-all outline-none bg-white pr-11" placeholder="Leave blank to maintain current"/>
                  <button type="button" onClick={() => setShowEditP(!showEditP)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors p-1">{showEditP ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold text-gray-400 block">Access Privileges</label>
                <div className="relative group">
                  <select value={editFormData.role} onChange={e => setEditFormData(p => ({ ...p, role: e.target.value }))} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold focus:border-blue-500 outline-none bg-white transition-all appearance-none cursor-pointer">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <DownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={savingUser} className="w-full py-3.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50">{savingUser ? "Propagating..." : "Apply Changes"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirm} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} confirmText={confirmModal.confirmText} />
    </div>
  );
}
