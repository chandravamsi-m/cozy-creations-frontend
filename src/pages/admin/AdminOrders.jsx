// src/pages/admin/AdminOrders.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, orderBy, query, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { updateAdminOrderStatus } from "../../api/adminOrders";
import { sendOrderStatusUpdate } from "../../api/email";

export default function AdminOrders() {
  const { idToken } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [statusDraft, setStatusDraft] = useState({});
  const [deliveryDateDraft, setDeliveryDateDraft] = useState({});

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
    setMsg("");
    try {
      // Load directly from Firestore so the list renders immediately (no backend dependency).
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
    } catch (err) {
      console.error("Error loading orders:", err);
      showToast("Failed to load orders", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const statusOptions = [
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ];

  const handleSaveStatus = async (order) => {
    const orderId = order.id;
    const nextStatus = statusDraft[orderId];
    if (!nextStatus) return;
    if (!idToken) {
      showToast("Not authenticated. Please login again.", "error");
      return;
    }

    setSavingId(orderId);
    setMsg("");
    try {
      const deliveryDate = deliveryDateDraft[orderId] || order.expectedDeliveryDate;
      await updateAdminOrderStatus(orderId, nextStatus, idToken, deliveryDate);
      // Update local state instantly so the badge updates without refresh
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus, expectedDeliveryDate: deliveryDate } : o))
      );
      showToast("Status updated successfully");
      setExpandedId(null); // Close the details view on success
      scrollToTop();

      // Send Status Update Email (Non-blocking)
      let targetEmail = order.userEmail;

      // Fallback for older orders: Try to fetch email from user profile
      if (!targetEmail && order.userId) {
        try {
          const userSnap = await getDoc(doc(db, "users", order.userId));
          if (userSnap.exists()) {
            targetEmail = userSnap.data().email;
          }
        } catch (err) {
          console.error("Failed to fetch user profile for email fallback:", err);
        }
      }

      if (targetEmail) {
        sendOrderStatusUpdate(targetEmail, orderId, nextStatus, order.shippingAddress?.fullName || "Customer", deliveryDate);
      } else {
        console.warn(`AdminOrders: Could not find any recipient email for order ${orderId}.`);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      showToast("Failed to update status", "error");
    } finally {
      setSavingId(null);
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

      {loading && <p>Loading orders...</p>}

      {!loading && orders.length === 0 && (
        <p>No orders found.</p>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border rounded-lg p-4 shadow-sm bg-white"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
              <p className="font-semibold text-gray-800">
                Order #{order.id}
              </p>

              <span
                className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status] || "bg-gray-200 text-gray-800"
                  }`}
              >
                {order.status}
              </span>
            </div>

            <p className="text-sm text-gray-600">
              Created:{" "}
              {order.createdAt
                ? order.createdAt.toLocaleString()
                : "N/A"}
            </p>

            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
              <span>Total Amount: <span className="font-bold text-gray-900">₹{order.total}</span></span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${order.paymentMethod === 'cod'
                ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                }`}>
                {order.paymentMethod || "online"}
              </span>
            </div>

            {order.expectedDeliveryDate && (
              <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <span>📅 Expected: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
              </p>
            )}

            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                onClick={() => setExpandedId((prev) => (prev === order.id ? null : order.id))}
                className="px-3 py-2 bg-black text-white rounded w-full sm:w-auto"
              >
                {expandedId === order.id ? "Hide Details" : "View Details"}
              </button>
            </div>

            {expandedId === order.id && (
              <div className="mt-4 border-t pt-4 space-y-4 bg-gray-50 rounded-lg p-4">
                {/* STATUS UPDATE */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="w-full sm:w-72">
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={deliveryDateDraft[order.id] || order.expectedDeliveryDate || ""}
                      onChange={(e) =>
                        setDeliveryDateDraft((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      className="border p-2 rounded w-full bg-white text-sm"
                    />
                  </div>

                  <div className="w-full sm:w-72">
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Update Status
                    </label>
                    <select
                      value={statusDraft[order.id] ?? order.status ?? "pending"}
                      onChange={(e) =>
                        setStatusDraft((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      className="border p-2 rounded w-full bg-white"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleSaveStatus(order)}
                    disabled={savingId === order.id}
                    className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50 w-full sm:w-auto"
                  >
                    {savingId === order.id ? "Saving..." : "Save"}
                  </button>
                </div>

                {/* SHIPPING DETAILS */}
                {order.shippingAddress && (
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Shipping Details</h3>
                    <div className="bg-white border rounded p-3 text-sm text-gray-700 space-y-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <p><span className="font-medium text-gray-900">Name:</span> {order.shippingAddress.fullName}</p>
                        <p><span className="font-medium text-gray-900">Phone:</span> {order.shippingAddress.phone}</p>
                      </div>
                      <div className="border-t my-2 border-gray-100"></div>
                      <p><span className="font-medium text-gray-900">Address:</span> {order.shippingAddress.street}</p>
                      <p><span className="font-medium text-gray-900">City/State:</span> {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                    </div>
                  </div>
                )}

                {/* ITEMS */}
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">Items</h3>
                  {order.items?.length ? (
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={item.productId || idx}
                          className="border p-3 rounded bg-white flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              Qty: <span className="font-medium text-gray-800">{item.quantity}</span>
                            </p>
                          </div>
                          <div className="text-sm text-gray-800 font-semibold whitespace-nowrap">
                            ₹{item.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No items.</p>
                  )}
                </div>

                {/* BILLING */}
                {order.billing && (
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Billing Info</h3>
                    <pre className="bg-white border p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(order.billing, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
