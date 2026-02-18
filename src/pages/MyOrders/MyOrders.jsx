// src/pages/MyOrders/MyOrders.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserOrders } from "../../api/userOrders";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import UserSidebar from "../../components/UserSidebar";

export default function MyOrders() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [userData, setUserData] = useState({ displayName: "", email: "" });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      loadOrders();
      loadUserData();
    }
  }, [user]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = orders.filter((order) =>
      order.id.toLowerCase().includes(term) ||
      order.items?.some((item) => item.name?.toLowerCase().includes(term))
    );
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  const loadUserData = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData({
          displayName: data.displayName || "",
          email: user.email || "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrders = async () => {
    try {
      const userOrders = await getUserOrders(user.uid);
      const sorted = [...userOrders].sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setOrders(sorted);
      setFilteredOrders(sorted);
    } catch (error) {
      console.error("Error loading orders:", error);
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase() || "";
    if (s === "delivered")
      return { color: "text-[#2D8A39] bg-[#E8F5E9]", label: "DELIVERED", icon: "✓" };
    if (s === "shipped" || s === "in transit")
      return { color: "text-[#1976D2] bg-[#E3F2FD]", label: "IN TRANSIT", icon: "🚚" };
    if (s === "cancelled")
      return { color: "text-red-500 bg-red-50", label: "CANCELLED", icon: "✕" };
    if (s === "pending")
      return { color: "text-yellow-600 bg-yellow-50", label: "PENDING", icon: "⏳" };
    if (s === "completed")
      return { color: "text-[#795548] bg-[#EFEBE9]", label: "COMPLETED", icon: "⌛" };
    return { color: "text-gray-500 bg-gray-50", label: s.toUpperCase(), icon: "•" };
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-20 pb-12 px-4 sm:px-6 lg:px-8 font-montserrat">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Reusable Sticky Sidebar */}
          <UserSidebar userData={userData} />

          {/* Main Content */}
          <div className="flex-1 w-full">
            <div className="mb-4">
              <h1 className="text-4xl font-bold text-[#191816] mb-2 font-serif">Your Orders</h1>
              <p className="text-gray-500 font-medium">Track your recent purchases and manage reorders.</p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by Order ID or Item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent outline-none shadow-sm transition-all text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 outline-none shadow-sm cursor-pointer hover:bg-gray-50">
                  <option>Last 3 months</option>
                  <option>2023</option>
                  <option>2022</option>
                </select>
                <button className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Status
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-20 text-center shadow-sm border border-gray-50">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner">
                  🛍️
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">No orders found</h4>
                <p className="text-gray-400 mb-8 max-w-xs mx-auto font-medium leading-relaxed">
                  {searchTerm ? "Try adjusting your search terms." : "Your shopping cart is waiting to be filled with our cozy creations."}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => navigate("/products")}
                    className="px-10 py-4 bg-yellow-accent text-black font-bold rounded-2xl shadow-lg shadow-yellow-accent/20 hover:scale-105 transition-transform active:scale-95"
                  >
                    Explore Products
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const status = getStatusConfig(order.status);
                  const isExpanded = expandedId === order.id;
                  const mainItem = order.items?.[0] || {};
                  const othersCount = (order.items?.length || 1) - 1;

                  return (
                    <div key={order.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-md">
                      {/* Order Header / Metadata Bar */}
                      <div className="bg-gray-50/50 px-4 py-2 flex flex-wrap items-center justify-between gap-6 border-b border-gray-100">
                        <div className="flex gap-8">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-1">Order ID</p>
                            <p className="text-sm font-bold text-gray-900">{order.id}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Placed On</p>
                            <p className="text-sm font-bold text-gray-900">{formatDate(order.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p>
                            <p className="text-sm font-black text-gray-900">₹{order.total}</p>
                          </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${status.color}`}>
                          {status.label}
                        </div>
                      </div>

                      {/* Main Order Info */}
                      <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Image Stack */}
                          <div className="flex -space-x-4">
                            {order.items?.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="w-16 h-16 bg-white rounded-xl border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-2xl">🕯️</span>
                                )}
                              </div>
                            ))}
                            {order.items?.length > 2 && (
                              <div className="w-16 h-16 bg-gray-50 rounded-xl border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-500 z-10">
                                +{order.items.length - 2}
                              </div>
                            )}
                          </div>
                          <div className="ml-2">
                            <h4 className="text-[17px] font-bold text-gray-900 mb-1">
                              {mainItem.name || "Custom Candle"}
                              {othersCount > 0 && <span className="text-gray-400"> & {othersCount} other{othersCount > 1 ? "s" : ""}</span>}
                            </h4>
                            {(() => {
                              const s = order.status?.toLowerCase() || "pending";
                              const history = order.statusHistory || {};
                              const timestamp = history[s] || order.createdAt;
                              const labels = {
                                pending: "Placed on",
                                confirmed: "Confirmed on",
                                shipped: "Shipped on",
                                delivered: "Delivered on",
                                cancelled: "Cancelled on",
                                completed: "Completed on",
                                "in transit": "Shipped on"
                              };
                              return (
                                <p className="text-xs text-gray-400 font-medium">
                                  {labels[s] || "Updated on"} {formatDate(timestamp)}
                                </p>
                              );
                            })()}
                            {order.expectedDeliveryDate && (
                              <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                <span>📅 Estimated Arrival: {formatDate(order.expectedDeliveryDate)}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="flex items-center gap-1.5 text-sm font-bold text-gray-900 hover:text-black transition-colors group"
                          >
                            <span>Details</span>
                            <svg
                              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section (Reusing previous logic but matching new style) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 animate-in slide-in-from-top-4 duration-300">
                          <div className="border-t border-gray-100 pt-4 space-y-4">
                            <div>
                              <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Order Items</h5>
                              <div className="space-y-2">
                                {order.items?.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50/50 rounded-2xl border border-gray-50 transition-colors hover:bg-white hover:shadow-sm">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-lg">{item.image ? <img src={item.image} className="w-full h-full object-cover rounded-xl" /> : "🕯️"}</div>
                                      <div>
                                        <p className="font-bold text-gray-900 text-sm">{item.name || "Custom Candle"}</p>
                                        <p className="text-xs text-gray-400 font-medium tracking-wide">QTY: {item.quantity} • ₹{(item.totalAmount || item.itemTotal || (item.price * item.quantity)) / item.quantity} per unit</p>
                                      </div>
                                    </div>
                                    <p className="font-black text-gray-900">₹{item.totalAmount || item.itemTotal || (item.price * item.quantity)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {order.shippingAddress && (
                                <div className="space-y-2">
                                  <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Shipping Address</h5>
                                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-1 text-sm">
                                    <p className="font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                                    <p className="text-gray-500 font-medium leading-relaxed">{order.shippingAddress.street}</p>
                                    <p className="text-gray-500 font-medium leading-relaxed">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                                    <p className="text-gray-400 pt-2 font-semibold">Phone: {order.shippingAddress.phone}</p>
                                  </div>
                                </div>
                              )}
                              <div className="space-y-2">
                                <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Summary</h5>
                                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Payment Method</span>
                                    <span className="font-bold text-gray-900 uppercase tracking-wide">{order.paymentMethod || "Online"}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Order Status</span>
                                    <span className={`font-bold px-3 py-1 rounded-lg ${status.color}`}>{status.label}</span>
                                  </div>
                                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-gray-900 font-bold">Grand Total</span>
                                    <span className="text-gray-900 font-black text-xl tracking-tight">₹{order.total}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
