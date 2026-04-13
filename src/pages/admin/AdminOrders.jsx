// src/pages/admin/AdminOrders.jsx
import React, { useCallback, useEffect, useState } from "react";
import { db } from "../../firebase";
import { createPortal } from "react-dom";
import { 
  collection, 
  getDocs, 
  getDoc,
  doc,
  orderBy, 
  query, 
  limit, 
  startAfter, 
  where,
  documentId,
  or,
  and
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import OrderRowSkeleton from "../../components/skeletons/OrderRowSkeleton";
import ConfirmModal from "../../components/ConfirmModal";
import { 
  RefreshCw as RefreshIcon,
  Truck as TruckIcon,
  Loader2 as LoaderIcon,
  Tag as TagIcon,
  Search as SearchIcon,
  ChevronRight as RightIcon,
  CalendarIcon,
  CreditCard as CardIcon,
  Package as PackageIcon,
  X as CloseIcon,
  Copy as CopyIcon,
  Flame as FlameIcon,
  User as UserIcon,
  ShoppingBag as BagIcon,
  MapPin as MapIcon,
  ArrowUpRight as ActionIcon,
  Trash2 as TrashIcon,
  ShieldCheck as ShieldIcon,
  Banknote as CashIcon,
  Filter as FilterIcon,
  ChevronDown as DownIcon,
  Eye as EyeIcon
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { cancelAdminOrder, deleteAdminOrder } from "../../api/adminOrders";
import { getOrderStatusConfig } from "../../utils/orderStatus";
import { getOrderAmountBreakdown } from "../../utils/orderAmounts";

// --- HELPERS ---
function parseOrderTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  if (typeof ts?._seconds === "number") return new Date(ts._seconds * 1000);
  if (typeof ts === "string" || typeof ts === "number") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const ORDER_LIMIT = 15;

const STATUS_TABS = [
  { id: "all", label: "All Orders", status: null },
  { id: "new", label: "New", status: "new" },
  { id: "packed", label: "Packed", status: "packed" },
  { id: "shipped", label: "Shipped", status: "shipped" },
  { id: "delivered", label: "Delivered", status: "delivered" },
  { id: "cancelled", label: "Cancelled", status: "cancelled" },
];

export default function AdminOrders() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  
  // -- State --
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchId, setSearchId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const [creatingShipment, setCreatingShipment] = useState(null);
  const [generatingLabel, setGeneratingLabel] = useState(null);
  const [syncingOrderId, setSyncingOrderId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    type: "default",
    onConfirm: () => {},
  });

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied to clipboard!");
    }).catch(() => {
      showToast("Copy failed", "error");
    });
  };

  const closeConfirm = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  // -- Data Fetching --
  const [isSearchActive, setIsSearchActive] = useState(false);

  const fetchOrders = useCallback(async (isLoadMore = false, statusId = "all", search = "") => {
    const term = search?.trim() || "";
    if (term) {
      setLoading(true);
      setIsSearchActive(true);
      try {
        const ordersRef = collection(db, "orders");
        // PREFIX SEARCH ON ID: Matches all IDs starting with the term
        const q = query(
          ordersRef, 
          where(documentId(), ">=", term), 
          where(documentId(), "<=", term + '\uf8ff'),
          limit(ORDER_LIMIT)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => {
           const data = d.data();
           return {
              id: d.id, ...data,
              createdAt: parseOrderTimestamp(data.createdAt || data.updatedAt),
           };
        });
        setOrders(list);
        setHasMore(false); // Disable pagination for filtered results for now
        if (list.length === 0) showToast("No orders identified for this prefix.", "error");
      } catch (err) {
        showToast("Error executing search", "error");
      } finally {
        setLoading(false);
      }
      return;
    }
    setIsSearchActive(false);

    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const ordersRef = collection(db, "orders");
      let q;
      const statusFilter = STATUS_TABS.find(t => t.id === statusId)?.status;
      if (statusFilter) {
        q = query(ordersRef, where("status", "==", statusFilter), orderBy("createdAt", "desc"), limit(ORDER_LIMIT));
      } else {
        q = query(ordersRef, orderBy("createdAt", "desc"), limit(ORDER_LIMIT));
      }
      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      const snap = await getDocs(q);
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, ...data,
          createdAt: parseOrderTimestamp(data.createdAt || data.updatedAt),
        };
      });
      if (isLoadMore) setOrders(prev => [...prev, ...list]);
      else setOrders(list);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === ORDER_LIMIT);
    } catch (err) {
      if (err.code === "failed-precondition") {
        showToast("Index required. Check console.", "error");
        console.error("Firestore Index Required: " + err.message);
      } else {
        showToast("Failed to load orders", "error");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [showToast, lastDoc]);

  useEffect(() => { if (!searchId) fetchOrders(false, activeTab); }, [activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLastDoc(null);
    fetchOrders(false, activeTab, searchId);
  };

  const handleClearSearch = () => {
    setSearchId("");
    setLastDoc(null);
    fetchOrders(false, activeTab, "");
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchId("");
    setLastDoc(null);
    setStatusDropdownOpen(false);
  };

  const handleCreateShipment = async (order) => {
    if (!idToken) return;
    setCreatingShipment(order.id);
    try {
      const res = await apiFetch("/orders/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Shipment failed");
      const updatedOrder = { ...order, status: "packed", shiprocket: data.shiprocket };
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      if (selectedOrder?.id === order.id) setSelectedOrder(updatedOrder);
      showToast("Shipment created successfully");
    } catch (err) { showToast(err.message, "error"); } finally { setCreatingShipment(null); }
  };

  const handleSyncStatus = async (order) => {
    if (!idToken) return;
    setSyncingOrderId(order.id);
    try {
      const res = await apiFetch(`/admin/orders/${order.id}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (data.success) {
        const updatedOrder = {
          ...order, status: data.localStatus,
          shiprocket: { ...order.shiprocket, ...data }
        };
        setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
        if (selectedOrder?.id === order.id) setSelectedOrder(updatedOrder);
        showToast("Status synced");
      }
    } catch (err) { showToast("Sync failed", "error"); } finally { setSyncingOrderId(null); }
  };

  const performCancelOrder = async (order) => {
    if (!idToken) return;
    try {
      await cancelAdminOrder(order.id, idToken);
      const updatedOrder = { ...order, status: "cancelled" };
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      if (selectedOrder?.id === order.id) setSelectedOrder(updatedOrder);
      showToast("Order cancelled");
    } catch (err) { showToast("Cancel failed", "error"); }
  };

  const performDeleteOrder = async (order) => {
    if (!idToken) return;
    try {
      await deleteAdminOrder(order.id, idToken);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setSelectedOrder(null);
      showToast("Order deleted permanently");
    } catch (err) {
      showToast(err.message || "Failed to delete order", "error");
    }
  };

  const handleCancelOrder = (order) => {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Order",
      message: "Are you sure you want to cancel this order? This action will block fulfillment.",
      confirmText: "Cancel Order",
      type: "danger",
      onConfirm: () => performCancelOrder(order),
    });
  };

  const handleDeleteOrder = (order) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Order Permanently",
      message: "WARNING: This will permanently remove the order from the database. This action cannot be undone. Proceed?",
      confirmText: "Delete Permanently",
      type: "danger",
      onConfirm: () => performDeleteOrder(order),
    });
  };

  const handleGenerateLabel = async (order) => {
    if (!idToken) return;
    setGeneratingLabel(order.id);
    try {
      const res = await apiFetch(`/orders/generate-label/${order.id}`, { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json();
      if (data.labelUrl) window.open(data.labelUrl, "_blank");
    } catch (err) { showToast("Label error", "error"); } finally { setGeneratingLabel(null); }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* HEADER SECTION - Responsive Flex */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div className="flex items-end gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-none">Orders</h2>
          <p className="text-[10px] font-medium text-gray-400 mb-0.5">Control Panel</p>
        </div>
        
        {/* Mobile-Friendly Search/Actions Overlay (Future placeholder if needed) */}
      </div>

      {/* FILTER & SEARCH TOOLBAR - Adaptive Row */}
      <div className="flex flex-row items-center justify-between gap-2 lg:gap-6 py-2 px-1 border-y border-gray-100 bg-gray-50/10">
        
        {/* Search Input - Condensed for Mobile, Full for Desktop */}
        <form onSubmit={handleSearch} className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all overflow-hidden h-10 lg:max-w-xl">
          <div className="pl-3 lg:pl-4 text-gray-400 shrink-0">
            <SearchIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Search Order ID..." 
            value={searchId} 
            onChange={(e) => setSearchId(e.target.value)} 
            className="flex-1 bg-transparent border-none px-2 lg:px-3 py-2 text-xs lg:text-sm focus:outline-none min-w-0" 
          />
          {isSearchActive ? (
            <button 
              type="button" 
              onClick={handleClearSearch} 
              className="mr-1.5 lg:mr-2 px-3 lg:px-6 py-1.5 lg:py-2 bg-red-50 text-red-600 text-[9px] lg:text-[10px] font-black rounded-lg hover:bg-red-600 hover:text-white transition-all"
            >
              <span className="hidden lg:inline">Clear</span>
              <span className="lg:hidden text-[8px]">Clear</span>
            </button>
          ) : (
            <button 
              type="submit" 
              className="mr-1.5 lg:mr-2 p-1.5 lg:px-6 lg:py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shrink-0 text-[10px] font-black"
            >
              <SearchIcon className="lg:hidden w-3.5 h-3.5" />
              <span className="hidden lg:inline">Search</span>
            </button>
          )}
        </form>

        {/* Status Filter - Adaptive for Desktop/Mobile */}
        <div className="relative shrink-0">
          <button 
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="px-3 lg:px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center gap-2 lg:gap-3 hover:border-gray-400 transition-all text-[11px] lg:text-sm font-bold text-gray-700 h-10"
          >
            <span className="text-[9px] lg:text-[10px] text-gray-400 font-bold">Status:</span>
            <span className="truncate max-w-[60px] sm:max-w-[120px]">{STATUS_TABS.find(t => t.id === activeTab)?.label}</span>
            <DownIcon className={`w-3 h-3 lg:w-4 lg:h-4 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {statusDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-[180px] sm:w-[220px] bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {STATUS_TABS.map((tab) => (
                  <button 
                    key={tab.id} 
                    onClick={() => handleTabChange(tab.id)} 
                    className={`w-full text-left px-4 py-3 lg:py-4 text-[10px] lg:text-[11px] font-bold hover:bg-gray-50 flex items-center justify-between group transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                  >
                    {tab.label}
                    <RightIcon className={`w-3 h-3 lg:w-4 lg:h-4 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === tab.id ? 'opacity-100' : ''}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ORDERS LIST CONTAINER - Responsive Switch */}
      <div className="min-h-[500px]">
        {loading ? (
           <div className="space-y-4 lg:space-y-0">
              {/* Responsive Skeletons */}
              <div className="lg:hidden space-y-4">
                 {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white border rounded-2xl p-5 space-y-4 animate-pulse">
                       <div className="flex justify-between items-start">
                          <div className="w-24 h-4 bg-gray-100 rounded" />
                          <div className="w-16 h-6 bg-gray-100 rounded-lg" />
                       </div>
                       <div className="w-40 h-3 bg-gray-50 rounded" />
                       <div className="flex justify-between items-center pt-2">
                          <div className="w-20 h-5 bg-gray-100 rounded" />
                          <div className="w-10 h-10 bg-gray-100 rounded-full" />
                       </div>
                    </div>
                 ))}
              </div>
              <div className="hidden lg:block bg-white border rounded-2xl shadow-sm overflow-hidden">
                 <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-gray-50">
                       {[...Array(8)].map((_, i) => <OrderRowSkeleton key={i} />)}
                    </tbody>
                 </table>
              </div>
           </div>
        ) : orders.length === 0 ? (
           <div className="bg-white border rounded-2xl p-24 text-center">
              <PackageIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-[11px] font-black text-gray-300">No order records identified</p>
           </div>
        ) : (
          <div className="space-y-4">
            {/* MOBILE CARD VIEW (< lg) */}
            <div className="lg:hidden space-y-4">
               {orders.map((order) => {
                  const statusCfg = getOrderStatusConfig(order.status);
                  return (
                     <div 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-all"
                     >
                        <div className="flex justify-between items-start mb-4">
                           <div className="space-y-1">
                              <span className="font-mono text-[10px] font-black text-gray-400">Order ID</span>
                              <p className="text-sm font-bold text-gray-900">{order.id}</p>
                           </div>
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black border shadow-sm ${statusCfg.color}`}>
                              {statusCfg.label}
                           </span>
                        </div>

                        <div className="flex items-center gap-4 py-3 border-y border-gray-50 mb-4">
                           <div className="flex -space-x-4 overflow-hidden shrink-0">
                              {(order.items || []).slice(0, 3).map((item, idx) => (
                                 <div key={idx} className="w-12 h-12 rounded-xl bg-white border-2 border-white shadow-sm overflow-hidden shrink-0">
                                    {item.image ? (
                                       <img src={item.image} className="w-full h-full object-cover" />
                                    ) : (
                                       <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50">
                                          <PackageIcon className="w-6 h-6" />
                                       </div>
                                    )}
                                 </div>
                              ))}
                              {order.items?.length > 3 && (
                                 <div className="w-12 h-12 rounded-xl bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-500 shadow-sm shrink-0">
                                    +{order.items.length - 3}
                                 </div>
                              )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-gray-900 truncate">
                                 {order.items?.[0]?.name || "Item"}
                                 {order.items?.length > 1 && <span className="ml-1 text-blue-600">+{order.items.length - 1} more</span>}
                              </p>
                              <p className="text-[9px] font-medium text-gray-400 mt-1">
                                 {order.items?.length || 0} Item(s) Total
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between">
                           <div className="flex-1">
                              <p className="text-[10px] font-bold text-gray-400 mb-1">Date & Payment</p>
                              <div className="flex items-center gap-2">
                                 <span className="text-[11px] font-black text-gray-700">{order.createdAt ? order.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : "—"}</span>
                                 <span className="w-1 h-1 rounded-full bg-gray-200" />
                                 <span className="text-[10px] font-bold text-gray-400">{order.paymentMethod ? (order.paymentMethod.toLowerCase() === 'cod' ? 'COD' : 'Online') : "Online"}</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="text-right">
                                 <p className="text-[10px] font-bold text-gray-400 mb-1">Total</p>
                                 <p className="text-lg font-black text-blue-600 tracking-tighter leading-none">₹{order.total}</p>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                 <RightIcon className="w-4 h-4" />
                              </div>
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>

            {/* DESKTOP TABLE VIEW (>= lg) */}
            <div className="hidden lg:block bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 border-r border-gray-100/50">Order ID</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 border-r border-gray-100/50">Products</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 border-r border-gray-100/50">Date / Time</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400 border-r border-gray-100/50">Payment</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-gray-400">Status</th>
                      <th className="px-6 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map((order) => {
                      const statusCfg = getOrderStatusConfig(order.status);
                      return (
                        <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-blue-50/30 transition-all cursor-pointer group hover:scale-[1.002] duration-200 origin-center">
                          <td className="px-6 py-3.5">
                             <span title={order.id} className="px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg font-mono text-[11px] text-gray-700 font-bold tracking-tight group-hover:bg-white group-hover:border-blue-100 transition-colors">
                                {order.id}
                             </span>
                          </td>
                          <td className="px-6 py-3.5 border-l border-gray-50/10">
                             <div className="flex items-center gap-3">
                                <div className="flex -space-x-5 overflow-hidden group/images shrink-0">
                                   {(order.items || []).slice(0, 3).map((item, idx) => (
                                      <div key={idx} className="w-10 h-10 rounded-lg bg-white border-2 border-white shadow-sm overflow-hidden shrink-0 transition-transform group-hover/images:translate-x-1">
                                         {item.image ? (
                                            <img src={item.image} className="w-full h-full object-cover" />
                                         ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50">
                                               <PackageIcon className="w-5 h-5" />
                                            </div>
                                         )}
                                      </div>
                                   ))}
                                   {order.items?.length > 3 && (
                                      <div className="w-10 h-10 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-500 shadow-sm">
                                         +{order.items.length - 3}
                                      </div>
                                   )}
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[11px] font-black text-gray-900 group-hover:text-blue-700 transition-colors truncate max-w-[150px]">
                                      {order.items?.[0]?.name || "Item"}
                                      {order.items?.length > 1 && <span className="ml-1 text-blue-600">+{order.items.length - 1}</span>}
                                   </p>
                                   <p className="text-[9px] font-medium text-gray-400 mt-0.5">
                                      {order.items?.length || 0} Item(s) Total
                                   </p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-3.5 border-l border-gray-50/10">
                             <div className="space-y-0.5">
                                <p className="text-xs font-bold text-gray-600">{order.createdAt ? order.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{order.createdAt ? order.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}</p>
                             </div>
                          </td>
                          <td className="px-6 py-3.5 border-l border-gray-50/10">
                             <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-900 tracking-tighter">₹{order.total}</span>
                                <span className="text-[9px] font-bold text-gray-400">{order.paymentMethod ? (order.paymentMethod.toLowerCase() === 'cod' ? 'COD' : 'Online') : "Online"}</span>
                             </div>
                          </td>
                          <td className="px-6 py-3.5 border-l border-gray-50/10">
                             <span className={`w-fit px-3 py-1 rounded-lg text-[9px] font-black border shadow-sm ${statusCfg.color}`}>
                                {statusCfg.label}
                             </span>
                          </td>
                          <td className="px-6 py-3.5 text-right w-[80px]">
                             <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center transition-all group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:scale-110 shadow-sm active:scale-95">
                                <RightIcon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      
        {/* PAGINATION FOOTER */}
        {hasMore && !loading && (
          <div className="p-8 flex justify-center border-t bg-gray-50/20">
            <button 
              onClick={() => fetchOrders(true, activeTab)} 
              disabled={loadingMore} 
              className="group px-10 py-3.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-3"
            >
              {loadingMore ? <LoaderIcon className="w-4 h-4 animate-spin"/> : <ActionIcon className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
              Load More Results
            </button>
          </div>
        )}

      {/* MODALS & PORTALS (REMAINS UNTOUCHED FOR SIDEBAR CONSISTENCY) */}
      <OrderSidePanel 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        actions={{ handleCreateShipment, handleSyncStatus, handleCancelOrder, handleDeleteOrder, handleGenerateLabel, copyToClipboard }} 
        loadingStates={{ creatingShipment, generatingLabel, syncingOrderId }} 
        onImageClick={setPreviewImage}
      />
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirm} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} confirmText={confirmModal.confirmText} type={confirmModal.type} />
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}

// --- POLISHED UX SUB-COMPONENTS (NO CHANGES PER USER REQUEST) ---
function OrderSidePanel({ order, onClose, actions, loadingStates, onImageClick }) {
  if (!order) return null;
  const { subtotal, discountTotal, shippingFee: calculatedShipping, platformFee } = getOrderAmountBreakdown(order);
  const shippingFee = calculatedShipping || Number(order.deliveryFee || 0);
  const statusCfg = getOrderStatusConfig(order.status);
  const hasShiprocket = !!(order.shiprocket?.shipmentId || order.shiprocket?.orderId);
  const isTerminal = ["cancelled", "delivered"].includes(String(order.status || "").toLowerCase());
  const itemCount = (order.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0);

  const panelContent = (
    <div className="fixed inset-0 z-[100] flex justify-end font-sans">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={onClose} />
      
      <div className="relative h-screen w-full sm:max-w-[420px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-100 top-0">
        
        {/* REFINED HEADER: Integrated ID, Status & Actions */}
        <div className="p-6 border-b border-gray-100">
           <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-4">
                 <h3 className="font-bold text-gray-900 text-xl tracking-tight">Order Details</h3>
                 <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold border shadow-sm ${statusCfg.color}`}>
                    {statusCfg.label}
                 </span>
              </div>
              <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all active:scale-95">
                 <CloseIcon className="w-5 h-5" />
              </button>
           </div>
           
           <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                 <p className="text-[13px] font-mono font-bold text-gray-500 tracking-tighter truncate max-w-[200px]">{order.id}</p>
                 <button onClick={() => actions.copyToClipboard(order.id)} className="p-1 hover:bg-gray-50 rounded text-gray-500 hover:text-gray-900 transition-colors">
                    <CopyIcon className="w-3 h-3" />
                 </button>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {order.createdAt ? order.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + order.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : "—"}
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* REFINED SUMMARY STRIP: High-Impact Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
             <div className="bg-slate-50/50 border border-slate-100 border-l-4 border-l-blue-500 rounded-xl p-3 text-left">
                <p className="text-[8px] font-black text-slate-400 mb-1">Total</p>
                <div className="flex items-center gap-1 text-slate-900 font-bold">
                   <span className="text-[10px]">₹</span>
                   <span className="text-sm tracking-tighter">{order.total}</span>
                </div>
             </div>
             <div className="bg-slate-50/50 border border-slate-100 border-l-4 border-l-emerald-500 rounded-xl p-3 text-left">
                <p className="text-[8px] font-black text-slate-400 mb-1">Items</p>
                <div className="flex items-center gap-1 text-slate-900 font-bold">
                   <PackageIcon className="w-3 h-3 text-emerald-500" />
                   <span className="text-sm tracking-tighter">{itemCount}</span>
                </div>
             </div>
             <div className="bg-slate-50/50 border border-slate-100 border-l-4 border-l-violet-500 rounded-xl p-3 text-left">
                <p className="text-[8px] font-black text-slate-400 mb-1">Method</p>
                <div className="flex items-center gap-1 text-slate-900 font-bold">
                   <CashIcon className="w-3 h-3 text-violet-500" />
                   <span className="text-[9px] tracking-tighter truncate">{order.paymentMethod ? (order.paymentMethod.toLowerCase() === 'cod' ? 'COD' : 'Online') : "Online"}</span>
                </div>
             </div>
          </div>

          {/* FULFILLMENT HIGHLIGHT - REFINED COLORS */}
          {!hasShiprocket && !isTerminal && (
             <div className="bg-blue-50 text-blue-600 p-5 rounded-xl shadow-lg border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center justify-between mb-4">
                   <div className="space-y-0.5">
                      <h5 className="text-[10px] font-black text-blue-500">Next Step</h5>
                      <p className="font-bold text-sm">Initialize Shipment</p>
                   </div>
                   <TruckIcon className="w-6 h-6 text-blue-400" />
                </div>
                <button 
                   onClick={() => actions.handleCreateShipment(order)}
                   disabled={loadingStates.creatingShipment === order.id}
                   className="w-full py-3 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                   {loadingStates.creatingShipment === order.id ? <LoaderIcon className="w-3.5 h-3.5 animate-spin"/> : <ActionIcon className="w-3.5 h-3.5"/>}
                   Create Shipment
                </button>
             </div>
          )}

          {/* LOGISTICS NODE */}
          {hasShiprocket && !isTerminal && (
             <div className="space-y-3">
                <h5 className="text-[10px] font-black text-gray-400 flex items-center gap-2 px-1">
                   <TruckIcon className="w-3.5 h-3.5 text-blue-600" /> Dispatch Control
                </h5>
                <div className="bg-white border rounded-xl p-4 shadow-sm space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <p className="text-[9px] font-bold text-gray-400 mb-1.5">Carrier Service</p>
                         <div className="bg-violet-600 px-3 py-1 rounded-md shadow-[0_4px_12px_rgba(124,58,237,0.3)] inline-block">
                            <p className="text-[10px] font-black text-white uppercase tracking-wider">{order.shiprocket?.courierName || "Processing..."}</p>
                         </div>
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-gray-400 mb-1">AWB Code</p>
                         <p className="text-xs font-mono font-bold text-blue-600">{order.shiprocket?.awbCode || "Pending"}</p>
                      </div>
                   </div>
                   <div className="flex gap-2 pt-1">
                       <button onClick={() => actions.handleSyncStatus(order)} disabled={loadingStates.syncingOrderId === order.id} className="flex-1 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                          {loadingStates.syncingOrderId === order.id ? <LoaderIcon className="w-3 h-3 animate-spin"/> : <RefreshIcon className="w-3 h-3"/>}
                          Sync Status
                       </button>
                       {order.shiprocket?.awbCode && (
                          <button onClick={() => actions.handleGenerateLabel(order)} disabled={loadingStates.generatingLabel === order.id} className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-[10px] font-black hover:bg-green-800 transition-colors flex items-center justify-center gap-2">
                             {loadingStates.generatingLabel === order.id ? <LoaderIcon className="w-3 h-3 animate-spin"/> : <TagIcon className="w-3 h-3"/>}
                             Print Label
                          </button>
                       )}
                   </div>
                </div>
             </div>
          )}

          {/* SHIPPING DESTINATION */}
          <div className="space-y-3">
             <h5 className="text-[10px] font-black text-gray-400 flex items-center gap-2 px-1">
                <MapIcon className="w-3.5 h-3.5 text-rose-500" /> Customer Details
             </h5>
             <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <p className="text-[9px] font-bold text-gray-500 mb-1">Customer Name</p>
                      <p className="text-sm font-bold text-gray-900 tracking-tight">{order.shippingAddress?.fullName || order.customerName}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-gray-500 mb-1">Phone Number</p>
                      <div className="flex items-center gap-2 justify-end">
                         <a href={`tel:${order.shippingAddress?.phone}`} className="text-blue-600 font-bold text-sm hover:underline">{order.shippingAddress?.phone}</a>
                         <button onClick={() => actions.copyToClipboard(order.shippingAddress?.phone)} className="p-1 hover:bg-gray-50 rounded text-gray-200 hover:text-gray-600 transition-colors"><CopyIcon className="w-3.5 h-3.5" /></button>
                      </div>
                   </div>
                </div>
                <div className="pt-4 border-t border-gray-50">
                   <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[9px] font-bold text-gray-500">Shipping Address</span>
                      <button onClick={() => actions.copyToClipboard(`${order.shippingAddress?.street}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}`)} className="text-[8px] font-black text-gray-400 hover:text-black flex items-center gap-1 transition-colors bg-gray-50 px-2 py-0.5 rounded">
                         <CopyIcon className="w-2.5 h-2.5"/> Copy
                      </button>
                   </div>
                   <div className="text-[12px] text-gray-600 font-bold leading-relaxed">
                      <p>{order.shippingAddress?.street}</p>
                      <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.pincode}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* CART SUMMARY */}
          <div className="space-y-3">
             <h5 className="text-[10px] font-black text-gray-400 flex items-center gap-2 px-1">
                <BagIcon className="w-3.5 h-3.5 text-orange-500" /> Cart Breakdown
             </h5>
             <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-50">
                   {(order.items || []).map((item, i) => (
                     <div key={i} className="flex gap-4 items-center p-4 hover:bg-gray-50/50 transition-colors">
                        <div 
                           className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0 cursor-pointer active:scale-95 relative"
                           onClick={() => item.image && onImageClick(item.image)}
                           title="Preview image"
                        >
                           {item.image ? (
                                 <img src={item.image} className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                 <FlameIcon className="w-6 h-6 text-gray-200" />
                              </div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[12px] font-bold text-gray-900 truncate tracking-tight">{item.name}</p>
                           <p className="text-[11px] font-semibold text-gray-500 tracking-[0.1em]">{item.quantity} × ₹{item.price}</p>
                        </div>
                        <div className="text-right text-[12px] font-bold text-gray-900">₹{item.price * item.quantity}</div>
                     </div>
                   ))}
                </div>
                
                {/* BILLING SUMMARY with updated labels */}
                <div className="bg-gray-50 p-5 space-y-3 border-t border-gray-100">
                   <div className="flex justify-between text-[11px] font-bold text-gray-500">
                      <span>Subtotal</span>
                      <span className="text-gray-900 tracking-tighter font-semibold">₹{subtotal}</span>
                   </div>
                   {discountTotal > 0 && (
                      <div className="flex justify-between text-[11px] font-bold text-emerald-600">
                         <span className="flex items-center gap-1"><TagIcon className="w-3 h-3" /> Discount</span>
                         <span className="font-semibold tracking-tighter">-₹{discountTotal}</span>
                      </div>
                   )}
                   <div className="flex justify-between text-[11px] font-bold text-gray-500">
                      <span>Shipping Fee</span>
                      <span className="text-gray-900 tracking-tighter font-semibold">{shippingFee > 0 ? `₹${shippingFee}` : "FREE"}</span>
                   </div>
                   {platformFee > 0 && (
                      <div className="flex justify-between text-[11px] font-bold text-gray-500">
                         <span>Platform Fee</span>
                         <span className="text-gray-900 tracking-tighter font-semibold">₹{platformFee}</span>
                      </div>
                   )}
                   <div className="flex justify-between font-bold text-[14px] pt-4 border-t border-gray-200 mt-2 text-gray-900 tracking-[0.1em]">
                      <span>Total</span>
                      <span className="text-lg tracking-tighter font-bold">₹{order.total}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* DYNAMIC ACTIONS: Cancel (if active) | Delete (if cancelled) */}
          <div className="pt-4 space-y-3">
             {order.status === "cancelled" ? (
                <button 
                  onClick={() => actions.handleDeleteOrder(order)}
                  className="w-full py-3.5 bg-red-600 text-white rounded-lg text-[10px] font-black hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                   <TrashIcon className="w-4 h-4" /> Delete Order Permanently
                </button>
             ) : (
                !isTerminal && (
                   <button 
                     onClick={() => actions.handleCancelOrder(order)}
                     className="w-full py-3.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
                   >
                     <CloseIcon className="w-4 h-4" /> Cancel Order
                   </button>
                )
             )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}

function ImagePreviewModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[2200] flex items-center justify-center p-8 bg-black/90 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-all z-[2210]"
      >
        <CloseIcon className="w-8 h-8" />
      </button>
      
      <div 
        className="relative max-w-full max-h-full flex items-center justify-center pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Product Preview" 
          className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-scale-down pointer-events-auto shadow-none" 
        />
      </div>
    </div>,
    document.body
  );
}
