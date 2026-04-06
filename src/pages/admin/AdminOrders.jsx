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
  where 
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
  Calendar as CalendarIcon,
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
  Banknote as CashIcon
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
  { id: "pending", label: "Pending", status: "pending" },
  { id: "confirmed", label: "Confirmed", status: "confirmed" },
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

  const [creatingShipment, setCreatingShipment] = useState(null);
  const [generatingLabel, setGeneratingLabel] = useState(null);
  const [syncingOrderId, setSyncingOrderId] = useState(null);
  
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
  const fetchOrders = useCallback(async (isLoadMore = false, statusId = "all", search = "") => {
    const term = search?.trim() || "";
    if (term) {
      setLoading(true);
      try {
        const docRef = doc(db, "orders", term);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrders([{
            id: docSnap.id,
            ...data,
            createdAt: parseOrderTimestamp(data.createdAt || data.updatedAt),
          }]);
          setHasMore(false);
        } else {
          setOrders([]);
          showToast("Order not found.", "error");
        }
      } catch (err) {
        showToast("Error searching for order", "error");
      } finally {
        setLoading(false);
      }
      return;
    }

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

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchId("");
    setLastDoc(null);
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
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-end gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-none">Orders</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 mb-0.5">Control Panel</p>
        </div>
        <form onSubmit={handleSearch} className="flex-1 max-w-sm relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search Full Order ID..." value={searchId} onChange={(e) => setSearchId(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans" />
        </form>
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar scroll-smooth">
        {STATUS_TABS.map((tab) => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${activeTab === tab.id ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-100 hover:text-gray-900 hover:border-gray-300"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Placed At</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Carrier</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? Array.from({ length: 6 }).map((_, i) => <OrderRowSkeleton key={i} />) : orders.length === 0 ? <tr><td colSpan={6} className="py-20 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No matching records</td></tr> : orders.map((order) => {
                const statusCfg = getOrderStatusConfig(order.status);
                return (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-gray-50/80 transition-colors cursor-pointer group">
                    <td className="px-6 py-5 font-mono text-[11px] text-gray-900 font-bold tracking-tighter uppercase">{order.id.slice(0, 10)}...</td>
                    <td className="px-6 py-5 text-xs text-gray-500">{order.createdAt ? order.createdAt.toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-5 text-xs font-black text-gray-900">₹{order.total}</td>
                    <td className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-tight">{order.shiprocket?.courierName || order.courierName || "—"}</td>
                    <td className="px-6 py-5"><span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border shadow-sm ${statusCfg.color}`}>{statusCfg.label}</span></td>
                    <td className="px-6 py-5 text-right"><RightIcon className="w-4 h-4 text-gray-200 group-hover:text-gray-900 transition-colors" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {hasMore && !loading && (
          <div className="p-4 flex justify-center border-t bg-gray-50/10">
            <button onClick={() => fetchOrders(true, activeTab)} disabled={loadingMore} className="px-8 py-2.5 bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-black/20 active:scale-95 disabled:opacity-50 transition-all">{loadingMore ? <LoaderIcon className="w-3 h-3 animate-spin"/> : "Fetch more results"}</button>
          </div>
        )}
      </div>

      <OrderSidePanel order={selectedOrder} onClose={() => setSelectedOrder(null)} actions={{ handleCreateShipment, handleSyncStatus, handleCancelOrder, handleDeleteOrder, handleGenerateLabel, copyToClipboard }} loadingStates={{ creatingShipment, generatingLabel, syncingOrderId }} />
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirm} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} confirmText={confirmModal.confirmText} type={confirmModal.type} />
    </div>
  );
}

// --- POLISHED UX SUB-COMPONENTS ---
function OrderSidePanel({ order, onClose, actions, loadingStates }) {
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
      
      <div className="relative h-screen w-full max-w-[420px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-100 h-full top-0">
        
        {/* REFINED HEADER: Integrated ID, Status & Actions */}
        <div className="p-6 border-b border-gray-100">
           <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-4">
                 <h3 className="font-bold text-gray-900 text-xl tracking-tight">Order Details</h3>
                 <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase border shadow-sm ${statusCfg.color}`}>
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
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {order.createdAt ? order.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + order.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : "—"}
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* REFINED SUMMARY STRIP: High-Impact Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5">
             <div className="bg-slate-50/50 border border-slate-100 border-l-4 border-l-blue-500 rounded-xl p-3 text-left">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                <div className="flex items-center gap-1 text-slate-900 font-bold">
                   <span className="text-[10px]">₹</span>
                   <span className="text-sm tracking-tighter">{order.total}</span>
                </div>
             </div>
             <div className="bg-slate-50/50 border border-slate-100 border-l-4 border-l-emerald-500 rounded-xl p-3 text-left">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Items</p>
                <div className="flex items-center gap-1 text-slate-900 font-bold">
                   <PackageIcon className="w-3 h-3 text-emerald-500" />
                   <span className="text-sm tracking-tighter">{itemCount}</span>
                </div>
             </div>
             <div className="bg-slate-50/50 border border-slate-100 border-l-4 border-l-violet-500 rounded-xl p-3 text-left">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Method</p>
                <div className="flex items-center gap-1 text-slate-900 font-bold">
                   <CashIcon className="w-3 h-3 text-violet-500" />
                   <span className="text-[9px] uppercase tracking-tighter truncate">{order.paymentMethod || "Online"}</span>
                </div>
             </div>
          </div>

          {/* FULFILLMENT HIGHLIGHT - REFINED COLORS */}
          {!hasShiprocket && !isTerminal && (
             <div className="bg-blue-50 text-blue-600 p-5 rounded-xl shadow-lg border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center justify-between mb-4">
                   <div className="space-y-0.5">
                      <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Next Step</h5>
                      <p className="font-bold text-sm">Initialize Shipment</p>
                   </div>
                   <TruckIcon className="w-6 h-6 text-blue-400" />
                </div>
                <button 
                   onClick={() => actions.handleCreateShipment(order)}
                   disabled={loadingStates.creatingShipment === order.id}
                   className="w-full py-3 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                   {loadingStates.creatingShipment === order.id ? <LoaderIcon className="w-3.5 h-3.5 animate-spin"/> : <ActionIcon className="w-3.5 h-3.5"/>}
                   Create Shipment
                </button>
             </div>
          )}

          {/* LOGISTICS NODE */}
          {hasShiprocket && !isTerminal && (
             <div className="space-y-3">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                   <TruckIcon className="w-3.5 h-3.5 text-blue-600" /> Dispatch Control
                </h5>
                <div className="bg-white border rounded-xl p-4 shadow-sm space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Carrier Service</p>
                         <div className="bg-violet-600 px-3 py-1 rounded-md shadow-[0_4px_12px_rgba(124,58,237,0.3)] inline-block">
                            <p className="text-[10px] font-black text-white uppercase tracking-wider">{order.shiprocket?.courierName || "Processing..."}</p>
                         </div>
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">AWB Code</p>
                         <p className="text-xs font-mono font-bold text-blue-600">{order.shiprocket?.awbCode || "Pending"}</p>
                      </div>
                   </div>
                   <div className="flex gap-2 pt-1">
                       <button onClick={() => actions.handleSyncStatus(order)} disabled={loadingStates.syncingOrderId === order.id} className="flex-1 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                          {loadingStates.syncingOrderId === order.id ? <LoaderIcon className="w-3 h-3 animate-spin"/> : <RefreshIcon className="w-3 h-3"/>}
                          Sync Status
                       </button>
                       {order.shiprocket?.awbCode && (
                          <button onClick={() => actions.handleGenerateLabel(order)} disabled={loadingStates.generatingLabel === order.id} className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-800 transition-colors flex items-center justify-center gap-2">
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
             <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <MapIcon className="w-3.5 h-3.5 text-rose-500" /> Customer Details
             </h5>
             <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Customer Name</p>
                      <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{order.shippingAddress?.fullName || order.customerName}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Phone Number</p>
                      <div className="flex items-center gap-2 justify-end">
                         <a href={`tel:${order.shippingAddress?.phone}`} className="text-blue-600 font-bold text-sm hover:underline">{order.shippingAddress?.phone}</a>
                         <button onClick={() => actions.copyToClipboard(order.shippingAddress?.phone)} className="p-1 hover:bg-gray-50 rounded text-gray-200 hover:text-gray-600 transition-colors"><CopyIcon className="w-3.5 h-3.5" /></button>
                      </div>
                   </div>
                </div>
                <div className="pt-4 border-t border-gray-50">
                   <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Shipping Address</span>
                      <button onClick={() => actions.copyToClipboard(`${order.shippingAddress?.street}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}`)} className="text-[8px] font-black text-gray-400 hover:text-black uppercase flex items-center gap-1 transition-colors bg-gray-50 px-2 py-0.5 rounded">
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
             <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <BagIcon className="w-3.5 h-3.5 text-orange-500" /> Cart Breakdown
             </h5>
             <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-50">
                   {(order.items || []).map((item, i) => (
                     <div key={i} className="flex gap-4 items-center p-4 hover:bg-gray-50/50 transition-colors">
                        <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                           {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50"><FlameIcon className="w-6 h-6 text-gray-200" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[11px] font-bold text-gray-900 truncate uppercase tracking-tight">{item.name}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{item.quantity} × ₹{item.price}</p>
                        </div>
                        <div className="text-right text-[11px] font-black text-gray-900">₹{item.price * item.quantity}</div>
                     </div>
                   ))}
                </div>
                
                {/* BILLING SUMMARY with updated labels */}
                <div className="bg-gray-50 p-5 space-y-3 border-t border-gray-100">
                   <div className="flex justify-between text-[11px] font-bold text-gray-500">
                      <span className="uppercase tracking-widest">Subtotal</span>
                      <span className="text-gray-900 tracking-tighter font-black">₹{subtotal}</span>
                   </div>
                   {discountTotal > 0 && (
                      <div className="flex justify-between text-[11px] font-bold text-emerald-600">
                         <span className="uppercase tracking-widest flex items-center gap-1"><TagIcon className="w-3 h-3" /> Discount</span>
                         <span className="font-black tracking-tighter">-₹{discountTotal}</span>
                      </div>
                   )}
                   <div className="flex justify-between text-[11px] font-bold text-gray-500">
                      <span className="uppercase tracking-widest">Shipping Fee</span>
                      <span className="text-gray-900 tracking-tighter font-black">{shippingFee > 0 ? `₹${shippingFee}` : "FREE"}</span>
                   </div>
                   {platformFee > 0 && (
                      <div className="flex justify-between text-[11px] font-bold text-gray-500">
                         <span className="uppercase tracking-widest">Platform Fee</span>
                         <span className="text-gray-900 tracking-tighter font-black">₹{platformFee}</span>
                      </div>
                   )}
                   <div className="flex justify-between font-black text-[13px] pt-4 border-t border-gray-200 mt-2 text-gray-900 uppercase tracking-[0.1em]">
                      <span>Total</span>
                      <span className="text-lg tracking-tighter">₹{order.total}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* DYNAMIC ACTIONS: Cancel (if active) | Delete (if cancelled) */}
          <div className="pt-4 space-y-3">
             {order.status === "cancelled" ? (
                <button 
                  onClick={() => actions.handleDeleteOrder(order)}
                  className="w-full py-3.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                   <TrashIcon className="w-4 h-4" /> Delete Order Permanently
                </button>
             ) : (
                !isTerminal && (
                   <button 
                     onClick={() => actions.handleCancelOrder(order)}
                     className="w-full py-3.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
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
