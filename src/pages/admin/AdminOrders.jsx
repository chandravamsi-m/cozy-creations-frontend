// src/pages/admin/AdminOrders.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import OrderRowSkeleton from "../../components/skeletons/OrderRowSkeleton";
import { 
  CheckCircle, 
  RefreshCw, 
  Truck, 
  Loader2, 
  Tag, 
  ExternalLink, 
  Phone, 
  ArrowRight 
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function AdminOrders() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Shiprocket action states
  const [creatingShipment, setCreatingShipment] = useState(null);
  const [generatingLabel, setGeneratingLabel] = useState(null);

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
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  };

  const parseTimestamp = (ts) => {
    if (!ts) return null;
    if (typeof ts?.toDate === "function") return ts.toDate();
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
    if (typeof ts?._seconds === "number") return new Date(ts._seconds * 1000);
    if (typeof ts === "string" || typeof ts === "number") {
      const d = new Date(ts);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const loadOrders = async () => {
    setLoading(true);

    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: parseTimestamp(data.createdAt),
          updatedAt: parseTimestamp(data.updatedAt),
        };
      });
      setOrders(list);
      return list;
    } catch (err) {
      console.error("Error loading orders:", err);
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const silentAdminSync = async (ordersList) => {
    if (!idToken) return;
    const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    // Only sync active orders that haven't been synced in 30+ minutes
    const staleOrders = ordersList.filter((o) => {
      if (!o.shiprocket?.shipmentId) return false;
      if (["delivered", "cancelled"].includes(o.status?.toLowerCase())) return false;
      const lastUpdate = o.shiprocket?.lastUpdate ? new Date(o.shiprocket.lastUpdate).getTime() : 0;
      return now - lastUpdate > STALE_THRESHOLD_MS;
    });

    if (staleOrders.length === 0) return;

    // Throttle: process max 5 at a time to avoid rate limits
    const chunks = [];
    for (let i = 0; i < staleOrders.length; i += 5) {
      chunks.push(staleOrders.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (order) => {
          try {
            const res = await fetch(`${BACKEND_URL}/api/admin/orders/${order.id}/sync`, {
              method: "POST",
              headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (data?.success) {
              setOrders((prev) =>
                prev.map((o) => {
                  if (o.id !== order.id) return o;
                  return {
                    ...o,
                    ...(data.localStatus ? { status: data.localStatus } : {}),
                    shiprocket: {
                      ...o.shiprocket,
                      ...(data.awbCode ? { awbCode: data.awbCode } : {}),
                      ...(data.srStatus ? { status: data.srStatus, lastUpdate: new Date().toISOString() } : {}),
                    },
                  };
                })
              );
            }
          } catch (_) {
            // Silent — never disrupt the admin view
          }
        })
      );
    }
  };

  useEffect(() => {
    loadOrders().then((list) => {
      if (list) silentAdminSync(list);
    });
  }, []);


  // ── Shiprocket: Create Shipment ────────────────────────────────────────────
  const handleCreateShipment = async (order) => {
    if (!idToken) { showToast("Not authenticated.", "error"); return; }
    setCreatingShipment(order.id);
    try {
      const res = await fetch(`${BACKEND_URL}/orders/create-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create shipment");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: "packed", shiprocket: data.shiprocket }
            : o
        )
      );
      showToast(`Shipment created! AWB: ${data.shiprocket?.awbCode || "Pending"}`);
    } catch (err) {
      console.error("Create shipment error:", err);
      showToast(err.message || "Failed to create shipment", "error");
    } finally {
      setCreatingShipment(null);
    }
  };

  const handleSyncStatus = async (orderId) => {
    if (!idToken) { showToast("Not authenticated.", "error"); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/admin/orders/${orderId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");

      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: data.localStatus, shiprocket: { ...o.shiprocket, status: data.srStatus, lastUpdate: new Date().toISOString() } }
              : o
          )
        );
        showToast(`Status synced: ${data.srStatus}`);
      }
    } catch (err) {
      console.error("Sync error:", err);
      showToast(err.message || "Failed to sync status", "error");
    }
  };

  // ── Shiprocket: Generate Label ─────────────────────────────────────────────
  const handleGenerateLabel = async (order) => {
    if (!idToken) { showToast("Not authenticated.", "error"); return; }
    setGeneratingLabel(order.id);
    try {
      const res = await fetch(`${BACKEND_URL}/orders/generate-label/${order.id}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Label generation failed");

      if (data.labelUrl) {
        window.open(data.labelUrl, "_blank");
        showToast("Label opened in new tab");
      } else {
        showToast("Label URL not available yet. Try again shortly.", "error");
      }
    } catch (err) {
      console.error("Label error:", err);
      showToast(err.message || "Failed to generate label", "error");
    } finally {
      setGeneratingLabel(null);
    }
  };

  const statusColors = {
    pending: "bg-yellow-200 text-yellow-800",
    confirmed: "bg-blue-200 text-blue-800",
    packed: "bg-indigo-200 text-indigo-800",
    shipped: "bg-purple-200 text-purple-800",
    delivered: "bg-green-200 text-green-800",
    cancelled: "bg-red-200 text-red-800",
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">All Orders</h2>

      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <OrderRowSkeleton key={i} />
          ))}
        </div>
      )}
      {!loading && orders.length === 0 && <p>No orders found.</p>}

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border rounded-lg p-4 shadow-sm bg-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
              <p className="font-semibold text-gray-800">Order #{order.id}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status] || "bg-gray-200 text-gray-800"}`}>
                  {order.status}
                </span>
                {/* Shiprocket AWB badge */}
                {order.shiprocket?.awbCode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(order.shiprocket.awbCode); }}
                      className="px-2 py-1 rounded text-xs font-bold bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200 flex items-center gap-1 transition-colors"
                      title="Click to copy AWB"
                    >
                      <Truck className="w-3 h-3" /> AWB: {order.shiprocket.awbCode}
                    </button>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Created:{" "}{order.createdAt ? order.createdAt.toLocaleString() : "N/A"}
            </p>

            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1 flex-wrap">
              <span>Total Amount: <span className="font-bold text-gray-900">₹{order.total}</span></span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${order.paymentMethod === 'cod'
                ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                }`}>
                {order.paymentMethod || "online"}
              </span>
              {(order.shiprocket?.courierName || order.courierName) && (
                <span className="text-[10px] font-bold text-violet-600 px-2 py-0.5 rounded-full bg-violet-50">
                  via {order.shiprocket?.courierName || order.courierName}
                </span>
              )}
            </div>


            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
              <button
                onClick={() => setExpandedId((prev) => (prev === order.id ? null : order.id))}
                className="px-3 py-2 bg-black text-white rounded w-full sm:w-auto text-sm hover:bg-gray-800 transition-colors"
              >
                {expandedId === order.id ? "Hide Details" : "View Details"}
              </button>

              {/* Shiprocket: Create Shipment – show if no shipment yet and order is confirmed/packed */}
              {!order.shiprocket?.shipmentId && ["confirmed", "packed", "pending"].includes(order.status) && (
                  <button
                    onClick={() => handleCreateShipment(order)}
                    disabled={creatingShipment === order.id}
                    className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded w-full sm:w-auto text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    {creatingShipment === order.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                    ) : (
                      <><Truck className="w-4 h-4" /> Create Shipment</>
                    )}
                  </button>
              )}

              {/* Shiprocket: Print Label – show once shipment exists */}
              {order.shiprocket?.shipmentId && (
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleGenerateLabel(order)}
                      disabled={generatingLabel === order.id}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex-1 sm:flex-none text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    >
                      {generatingLabel === order.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Tag className="w-4 h-4" /> Print Label</>
                      )}
                    </button>
                  <button
                    onClick={() => handleSyncStatus(order.id)}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded flex-1 sm:flex-none text-[10px] font-black uppercase tracking-wider transition-all border border-blue-100 flex items-center justify-center gap-1"
                    title="Sync with Shiprocket"
                  >
                    <RefreshCw className="w-3 h-3" /> Sync
                  </button>
                  {order.shiprocket.awbCode && (
                    <a
                      href={`https://shiprocket.co/tracking/${order.shiprocket.awbCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 rounded flex-1 sm:flex-none text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" /> Live Track
                    </a>
                  )}
                </div>
              )}
            </div>

            {expandedId === order.id && (
              <div className="mt-3 border-t border-gray-100 pt-3 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-gray-50/60 rounded-xl p-3">

                {/* ── LEFT: Address + Shiprocket ── */}
                <div className="space-y-3">

                  {/* Ship-to */}
                  {order.shippingAddress && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ship To</p>
                      <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 text-[12px] text-gray-700 space-y-0.5">
                        <p className="font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                        <p>{order.shippingAddress.street}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</p>
                        <p className="text-gray-400 pt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {order.shippingAddress.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Shiprocket */}
                  {order.shiprocket && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Shiprocket
                      </p>
                      <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-[12px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Status</span>
                          <span className="font-bold text-violet-700 capitalize">{order.shiprocket.status || "—"}</span>
                        </div>
                        {(order.shiprocket?.courierName || order.courierName) && (
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-medium">Courier</span>
                            <span className="font-bold text-gray-800">{order.shiprocket?.courierName || order.courierName}</span>
                          </div>
                        )}
                        {order.shiprocket.awbCode && (
                          <div className="flex justify-between items-center pt-0.5">
                            <span className="text-gray-400 font-medium">AWB</span>
                            <a
                              href={`https://shiprocket.co/tracking/${order.shiprocket.awbCode}`}
                              target="_blank" rel="noopener noreferrer"
                              className="font-bold text-violet-600 hover:underline text-[11px]"
                            >
                              {order.shiprocket.awbCode} <ArrowRight className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RIGHT: Items + Price Breakdown ── */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Order Items</p>
                  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden text-[12px]">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto] text-[9px] font-black text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 px-3 py-1.5 gap-4">
                      <span>Product</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Unit</span>
                      <span className="text-right">Total</span>
                    </div>
                    {/* Rows */}
                    {(order.items || []).map((item, idx) => (
                      <div key={item.productId || idx}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center px-3 py-2 gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <span className="font-semibold text-gray-900 truncate">{item.name}</span>
                        <span className="text-center text-gray-500 font-medium">×{item.quantity}</span>
                        <span className="text-right text-gray-500">₹{item.price}</span>
                        <span className="text-right font-bold text-gray-900">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    {/* Summary strip */}
                    <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 space-y-1">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal</span>
                        <span className="font-medium text-gray-600">₹{(order.items || []).reduce((s, i) => s + i.price * i.quantity, 0)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Courier Fee</span>
                        <span className={`font-medium ${order.deliveryFee > 0 ? "text-gray-600" : "text-green-600"}`}>
                          {order.deliveryFee > 0 ? `₹${order.deliveryFee}` : "Free"}
                        </span>
                      </div>
                      {order.platformFee > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Platform Fee</span>
                          <span className="font-medium text-gray-600">₹{order.platformFee}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-900 font-black border-t border-gray-200 pt-1 text-[13px]">
                        <span>Total</span>
                        <span>₹{order.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
