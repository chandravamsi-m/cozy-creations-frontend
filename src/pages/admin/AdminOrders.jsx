// src/pages/admin/AdminOrders.jsx
import React, { useCallback, useEffect, useState } from "react";
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
import { apiFetch } from "../../lib/api";
import { cancelAdminOrder } from "../../api/adminOrders";
import { formatShiprocketStatus, getOrderStatusConfig, shouldShowShiprocketStatus } from "../../utils/orderStatus";
import { getOrderAmountBreakdown } from "../../utils/orderAmounts";

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

function getOrderTimeValue(value) {
  if (!value) return 0;
  if (typeof value?.getTime === "function") return value.getTime();
  const parsed = parseOrderTimestamp(value);
  return parsed?.getTime() || 0;
}

const AUTO_SYNC_THRESHOLD_MS = 60 * 60 * 1000;
const AUTO_SYNC_LIMIT = 5;


export default function AdminOrders() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Shiprocket action states
  const [creatingShipment, setCreatingShipment] = useState(null);
  const [generatingLabel, setGeneratingLabel] = useState(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  };

  const getLastShiprocketSyncTime = (order) => {
    const value = order?.shiprocket?.lastUpdate || order?.shiprocket?.lastSyncAttempt || null;
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatShiprocketDateTime = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString();
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);

    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: parseOrderTimestamp(data.createdAt),
          updatedAt: parseOrderTimestamp(data.updatedAt),
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
  }, [showToast]);

  const silentAdminSync = useCallback(async (ordersList) => {
    if (!idToken) return;
    const now = Date.now();

    const staleOrders = ordersList
      .filter((o) => {
        if (!o.shiprocket?.shipmentId && !o.shiprocket?.orderId) return false;
        if (["delivered", "cancelled"].includes(o.status?.toLowerCase())) return false;
        return now - getLastShiprocketSyncTime(o) > AUTO_SYNC_THRESHOLD_MS;
      })
      .sort((a, b) => getOrderTimeValue(b.createdAt) - getOrderTimeValue(a.createdAt))
      .slice(0, AUTO_SYNC_LIMIT);

    if (staleOrders.length === 0) return;

    const chunks = [];
    for (let i = 0; i < staleOrders.length; i += 5) {
      chunks.push(staleOrders.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (order) => {
          try {
            const res = await apiFetch(`/admin/orders/${order.id}/sync`, {
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
                      ...(data.shipmentId ? { shipmentId: data.shipmentId } : {}),
                      ...(data.shiprocketOrderId ? { orderId: data.shiprocketOrderId } : {}),
                      ...(data.courierName ? { courierName: data.courierName } : {}),
                      ...(data.awbCode ? { awbCode: data.awbCode } : {}),
                      ...(data.srStatus ? { status: data.srStatus } : {}),
                      ...(data.lastSyncAttempt ? { lastSyncAttempt: data.lastSyncAttempt } : {}),
                      ...(data.srStatus ? { lastUpdate: data.lastSyncAttempt || new Date().toISOString() } : {}),
                    },
                  };
                })
              );
            } else if (data?.cleaned || data?.lastSyncAttempt) {
              setOrders((prev) =>
                prev.map((o) => {
                  if (o.id !== order.id) return o;
                  return {
                    ...o,
                    status: data.localStatus || o.status,
                    shiprocket: {
                      ...o.shiprocket,
                      ...(data.shipmentId ? { shipmentId: data.shipmentId } : {}),
                      ...(data.shiprocketOrderId ? { orderId: data.shiprocketOrderId } : {}),
                      ...(data.courierName ? { courierName: data.courierName } : {}),
                      awbCode: null,
                      status: null,
                      ...(data.lastSyncAttempt ? { lastSyncAttempt: data.lastSyncAttempt } : {}),
                    },
                  };
                })
              );
            }
          } catch {
            // Silent — never disrupt the admin view
          }
        })
      );
    }
  }, [idToken]);

  useEffect(() => {
    loadOrders().then((list) => {
      if (list) silentAdminSync(list);
    });
  }, [loadOrders, silentAdminSync]);


  // ── Shiprocket: Create Shipment ────────────────────────────────────────────
  const handleCreateShipment = async (order) => {
    if (!idToken) { showToast("Not authenticated.", "error"); return; }
    setCreatingShipment(order.id);
    try {
      const res = await apiFetch("/orders/create-shipment", {
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
      const res = await apiFetch(`/admin/orders/${orderId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.cleaned || data?.lastSyncAttempt) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    status: data.localStatus || o.status,
                    shiprocket: {
                      ...o.shiprocket,
                      ...(data.shipmentId ? { shipmentId: data.shipmentId } : {}),
                      ...(data.shiprocketOrderId ? { orderId: data.shiprocketOrderId } : {}),
                      ...(data.courierName ? { courierName: data.courierName } : {}),
                      awbCode: null,
                      status: null,
                      ...(data.lastSyncAttempt ? { lastSyncAttempt: data.lastSyncAttempt } : {}),
                    },
                  }
                : o
            )
          );
        }
        throw new Error(data.error || "Sync failed");
      }

      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: data.localStatus,
                  shiprocket: {
                    ...o.shiprocket,
                    ...(data.shipmentId ? { shipmentId: data.shipmentId } : {}),
                    ...(data.shiprocketOrderId ? { orderId: data.shiprocketOrderId } : {}),
                    ...(data.courierName ? { courierName: data.courierName } : {}),
                    ...(data.awbCode ? { awbCode: data.awbCode } : {}),
                    ...(data.srStatus ? { status: data.srStatus } : {}),
                    ...(data.lastSyncAttempt ? { lastSyncAttempt: data.lastSyncAttempt } : {}),
                    ...(data.srStatus ? { lastUpdate: data.lastSyncAttempt || new Date().toISOString() } : {}),
                  }
                }
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

  const handleCancelOrder = async (order) => {
    if (!idToken) { showToast("Not authenticated.", "error"); return; }

    const currentStatus = String(order.status || "").toLowerCase();
    if (["cancelled", "delivered"].includes(currentStatus)) {
      showToast(`Order is already ${currentStatus}.`, "error");
      return;
    }

    const confirmed = window.confirm(
      order.shiprocket?.shipmentId
        ? "This will mark the order as cancelled in our application. If the shipment was cancelled in Shiprocket too, this keeps the order state aligned locally. Continue?"
        : "Mark this order as cancelled in our application?"
    );
    if (!confirmed) return;

    try {
      const result = await cancelAdminOrder(order.id, idToken);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "cancelled",
                shiprocket: {
                  ...o.shiprocket,
                  ...(result.cancelledInShiprocket ? { status: "CANCELLED" } : {}),
                  lastUpdate: new Date().toISOString(),
                  lastSyncAttempt: new Date().toISOString(),
                },
              }
            : o
        )
      );
      if (result.cancelledInShiprocket) {
        showToast("Order cancelled in Shiprocket and our application");
      } else if (result.shiprocketAttempted) {
        showToast("Order cancelled locally. Shiprocket cancellation did not complete.", "error");
      } else {
        showToast("Order cancelled in our application");
      }
    } catch (err) {
      console.error("Cancel order error:", err);
      showToast(err.message || "Failed to cancel order", "error");
    }
  };

  // ── Shiprocket: Generate Label ─────────────────────────────────────────────
  const handleGenerateLabel = async (order) => {
    if (!idToken) { showToast("Not authenticated.", "error"); return; }
    setGeneratingLabel(order.id);
    try {
      const res = await apiFetch(`/orders/generate-label/${order.id}`, {
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
        {orders.map((order) => {
          const statusLower = String(order.status || "").toLowerCase();
          const isTerminalOrder = ["cancelled", "delivered"].includes(statusLower);
          const hasShiprocketIdentity = !!(order.shiprocket?.shipmentId || order.shiprocket?.orderId);
          const { subtotal, discountTotal, shippingFee, platformFee } = getOrderAmountBreakdown(order);

          return (
          <div key={order.id} className="border rounded-lg p-4 shadow-sm bg-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
              <p className="font-semibold text-gray-800">Order #{order.id}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getOrderStatusConfig(order.status).color}`}>
                  {getOrderStatusConfig(order.status).label.toLowerCase()}
                </span>
                {shouldShowShiprocketStatus(order.status, order.shiprocket?.status) && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
                    {formatShiprocketStatus(order.shiprocket.status)}
                  </span>
                )}
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
              {!["cancelled", "delivered"].includes(String(order.status || "").toLowerCase()) && (
                <button
                  onClick={() => handleCancelOrder(order)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded w-full sm:w-auto text-sm font-bold border border-red-100 transition-colors"
                >
                  Cancel Order
                </button>
              )}

              {!order.shiprocket?.shipmentId && !order.shiprocket?.orderId && ["confirmed", "packed", "pending"].includes(order.status) && (
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
              {!isTerminalOrder && hasShiprocketIdentity && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleSyncStatus(order.id)}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded flex-1 sm:flex-none text-[10px] font-black uppercase tracking-wider transition-all border border-blue-100 flex items-center justify-center gap-1"
                    title="Sync with Shiprocket"
                  >
                    <RefreshCw className="w-3 h-3" /> Sync
                  </button>
                  {order.shiprocket.awbCode && (
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
                  )}
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
                        {order.shiprocket?.orderId && (
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-medium">Shiprocket Order ID</span>
                            <span className="font-bold text-gray-800">{order.shiprocket.orderId}</span>
                          </div>
                        )}
                        {order.shiprocket?.shipmentId && (
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-medium">Shipment ID</span>
                            <span className="font-bold text-gray-800">{order.shiprocket.shipmentId}</span>
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
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Last Sync</span>
                          <span className="font-bold text-gray-800">
                            {formatShiprocketDateTime(order.shiprocket?.lastUpdate || order.shiprocket?.lastSyncAttempt)}
                          </span>
                        </div>
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
                        <span className="font-medium text-gray-600">Rs {subtotal}</span>
                      </div>
                      {discountTotal > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span className="text-green-600">Discount</span>
                          <span className="font-medium text-green-600">-Rs {discountTotal}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-400">
                        <span>Shipping Fee</span>
                        <span className={`font-medium ${shippingFee > 0 ? "text-gray-600" : "text-green-600"}`}>
                          {shippingFee > 0 ? `Rs ${shippingFee}` : "Free"}
                        </span>
                      </div>
                      {platformFee > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Platform Fee</span>
                          <span className="font-medium text-gray-600">Rs {platformFee}</span>
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
        )})}
      </div>
    </div>
  );
}
