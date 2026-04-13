// src/pages/MyOrders/MyOrders.jsx
import React, { useCallback, useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserOrders } from "../../api/userOrders";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";
import UserSidebar from "../../components/UserSidebar";
import Skeleton from "../../components/common/Skeleton";
import OrderRowSkeleton from "../../components/skeletons/OrderRowSkeleton";
import { apiUrl } from "../../lib/api";
import { formatShiprocketStatus, getOrderStatusConfig, shouldShowShiprocketStatus } from "../../utils/orderStatus";
import { getOrderAmountBreakdown } from "../../utils/orderAmounts";
import { 
  Search, 
  ChevronDown, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  Clock, 
  Building2, 
  Package, 
  AlertCircle,
  ShoppingBag,
  Flame
} from "lucide-react";

const AUTO_SYNC_THRESHOLD_MS = 60 * 60 * 1000;
const AUTO_SYNC_LIMIT = 3;

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
  const [sortBy, setSortBy] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let list = [...orders];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((order) =>
        order.id.toLowerCase().includes(term) ||
        order.items?.some((item) => item.name?.toLowerCase().includes(term))
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((order) => order.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    list.sort((a, b) => {
      const getTime = (date) => {
        if (!date) return 0;
        if (date.seconds) return date.seconds * 1000;
        if (date.getTime) return date.getTime();
        if (typeof date === "number") return date;
        return new Date(date).getTime() || 0;
      };
      const timeA = getTime(a.createdAt);
      const timeB = getTime(b.createdAt);
      return sortBy === "recent" ? timeB - timeA : timeA - timeB;
    });

    setFilteredOrders(list);
  }, [searchTerm, orders, sortBy, statusFilter]);

  const loadUserData = useCallback(async () => {
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
  }, [user]);

  const loadOrders = useCallback(async () => {
    try {
      const userOrders = await getUserOrders(user.uid);
      const sorted = [...userOrders].sort((a, b) => {
        const getTime = (date) => {
          if (!date) return 0;
          if (date.seconds) return date.seconds * 1000;
          if (date.getTime) return date.getTime();
          if (typeof date === "number") return date;
          return new Date(date).getTime() || 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
      setOrders(sorted);
      setFilteredOrders(sorted);
      setLoading(false);

      const getLastShiprocketSyncTime = (order) => {
        const value = order?.shiprocket?.lastUpdate || order?.shiprocket?.lastSyncAttempt || null;
        if (!value) return 0;
        const parsed = new Date(value).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      const now = Date.now();

      // ── Silent auto-sync: heal AWB + update status for active shipments ──
      const needsSync = sorted.filter(
        (o) =>
          (o.shiprocket?.shipmentId || o.shiprocket?.orderId) &&
          !["delivered", "cancelled"].includes(o.status?.toLowerCase()) &&
          now - getLastShiprocketSyncTime(o) > AUTO_SYNC_THRESHOLD_MS
      ).slice(0, AUTO_SYNC_LIMIT);
      if (needsSync.length > 0) {
        const auth = getAuth();
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          for (const order of needsSync) {
            try {
              const res = await fetch(apiUrl(`/shipping/auto-sync-awb/${order.id}`), {
                method: "POST",
                headers: { Authorization: `Bearer ${idToken}` },
              });
              const data = await res.json();
              if (data?.success) {
                // Patch local state with healed AWB and/or new status
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
              } else if (data?.cleaned || data?.reason === "no_awb") {
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
              // Silent — never break the page
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadUserData();
    }
  }, [user, loadOrders, loadUserData]);

  const getStatusConfig = (status) => {
    const base = getOrderStatusConfig(status);
    const s = status?.toLowerCase() || "";
    if (s === "new") return { ...base, icon: <Clock className="w-3.5 h-3.5" /> };
    if (s === "delivered") return { ...base, icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    if (s === "shipped") return { ...base, icon: <Truck className="w-3.5 h-3.5" /> };
    if (s === "cancelled") return { ...base, icon: <XCircle className="w-3.5 h-3.5" /> };


    if (s === "packed") return { ...base, icon: <Package className="w-3.5 h-3.5" /> };

    return { ...base, icon: <AlertCircle className="w-3.5 h-3.5" /> };
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
      <div className="min-h-screen bg-[#F8F9FA] pt-20 lg:pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-montserrat text-[#191816]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <UserSidebar userData={userData} />
            <div className="flex-1 w-full space-y-4">
              <div className="mb-8">
                <Skeleton width="200px" height="32px" className="mb-2" />
                <Skeleton width="300px" height="16px" />
              </div>
              {[...Array(5)].map((_, i) => (
                <OrderRowSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-20 lg:pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-montserrat">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start">
          <UserSidebar userData={userData} />
          <div className="flex-1 w-full">
            <div className="mb-4 lg:block hidden">
              <h1 className="text-4xl font-bold text-[#191816] mb-2 font-serif">Your Orders</h1>
              <p className="text-gray-500 font-medium">Track your recent purchases and manage reorders.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-[2]">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Search by Order ID or Item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent outline-none shadow-sm transition-all text-sm"
                />
              </div>
              <div className="flex gap-2 flex-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl px-3 sm:px-4 py-3 text-xs font-bold text-gray-700 outline-none shadow-sm cursor-pointer hover:bg-gray-50"
                >
                  <option value="recent">Recent</option>
                  <option value="oldest">Oldest</option>
                </select>
                <div className="relative group flex-1 min-w-0">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-100 rounded-xl pl-3 pr-8 sm:pl-4 sm:pr-10 py-3 text-xs font-bold text-gray-700 outline-none shadow-sm cursor-pointer hover:bg-gray-50"
                  >
                    <option value="all">Status</option>
                    <option value="new">New</option>

                    <option value="packed">Packed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <ChevronDown className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-20 text-center shadow-sm border border-gray-50">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-50 rounded-3xl flex items-center justify-center shadow-inner">
                  <ShoppingBag className="w-12 h-12 text-gray-300" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">No orders found</h4>
                <p className="text-gray-400 mb-8 max-w-xs mx-auto font-medium leading-relaxed">
                  {searchTerm ? "Try adjusting your search terms." : "Your shopping cart is waiting to be filled with our cozy creations."}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => navigate("/products", { state: { scrollTo: "products", skipHero: true } })}
                    className="px-10 py-4 bg-yellow-accent text-black font-bold rounded-2xl shadow-lg shadow-yellow-accent/20 hover:scale-105 transition-transform active:scale-95"
                  >
                    Explore Products
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isExpanded={expandedId === order.id}
                    onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    getStatusConfig={getStatusConfig}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized OrderCard component
const OrderCard = React.memo(({ order, isExpanded, onToggle, getStatusConfig, formatDate }) => {
  const status = getStatusConfig(order.status);
  const mainItem = order.items?.[0] || {};
  const othersCount = (order.items?.length || 1) - 1;
  const { subtotal, discountTotal, shippingFee, platformFee } = getOrderAmountBreakdown(order);

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-md">
      <div className="bg-gray-50/50 px-3 sm:px-4 py-2 border-b border-gray-100 italic">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-gray-400 tracking-widest mb-0.5 uppercase">Order ID</p>
              <p className="text-[11px] sm:text-sm font-bold text-gray-900 truncate">{order.id}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Placed On</p>
              <p className="text-[11px] sm:text-sm font-bold text-gray-900">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          <div className="flex justify-between items-center sm:hidden pt-1.5 border-t border-gray-100/50">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total</p>
              <p className="text-sm font-black text-gray-900">₹{order.total}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest flex items-center gap-1.5 ${status.color}`}>
              {status.icon} {status.label}
            </div>
          </div>
          <div className="hidden sm:flex justify-between items-center pt-1 border-t border-gray-100/50">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Amount</p>
              <p className="text-sm sm:text-base font-black text-gray-900">₹{order.total}</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-1.5 ${status.color}`}>
              {status.icon} {status.label}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 w-full">
          <div className="flex -space-x-4 flex-shrink-0">
            {order.items?.slice(0, 2).map((item, idx) => (
              <div key={idx} className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <Flame className="w-8 h-8 text-yellow-500/30" />}
              </div>
            ))}
            {order.items?.length > 2 && (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-xl border-2 border-white shadow-sm flex items-center justify-center text-[9px] sm:text-xs font-bold text-gray-500 z-10">
                +{order.items.length - 2}
              </div>
            )}
          </div>
          <div className="ml-0 sm:ml-2 overflow-hidden flex-1">
            <h4 className="text-[14px] sm:text-[17px] font-bold text-gray-900 mb-0.5 truncate sm:whitespace-normal">
              {mainItem.name || "Custom Candle"}
              {othersCount > 0 && <span className="text-gray-400"> & {othersCount} other{othersCount > 1 ? "s" : ""}</span>}
            </h4>
            {(() => {
              const s = order.status?.toLowerCase() || "new";
              const history = order.statusHistory || {};
              const timestamp = history[s] || order.createdAt;
              const labels = {
                new: "Placed on",

                shipped: "Shipped on",
                delivered: "Delivered on",
                cancelled: "Cancelled on",

                "in transit": "Shipped on"
              };
              return <p className="text-[10px] sm:text-xs text-gray-400 font-medium">{labels[s] || "Updated on"} {formatDate(timestamp)}</p>;
            })()}
            {shouldShowShiprocketStatus(order.status, order.shiprocket?.status) && order.status?.toLowerCase() !== "cancelled" && (
              <p className="text-[10px] sm:text-xs text-violet-600 font-semibold mt-1">
                Shipping: {formatShiprocketStatus(order.shiprocket.status)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto mt-1 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-50">
          {/* Track Package – shown when shipment is dispatched or scheduled */}
          {order.shiprocket?.awbCode && !["cancelled", "delivered"].includes(order.status?.toLowerCase()) && (
            <a
              href={`https://shiprocket.co/tracking/${order.shiprocket.awbCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full md:w-auto py-2 sm:py-0 text-[13px] font-bold text-violet-600 hover:text-violet-800 transition-colors"
            >
              <Truck className="w-4 h-4" /> <span>Track Package</span>
            </a>
          )}
          <button onClick={onToggle} className="flex items-center justify-center gap-1.5 w-full md:w-auto py-2 sm:py-0 text-[13px] font-bold text-gray-900 hover:text-black transition-colors group">
            <span>View Details</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 animate-in slide-in-from-top-4 duration-300">
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <div>
              <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Order Items</h5>
              <div className="space-y-1.5">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50/50 rounded-xl border border-gray-50 transition-colors hover:bg-white hover:shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center text-base">
                        {item.image ? (
                          <img src={item.image} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Flame className="w-5 h-5 text-yellow-500/30" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-[13px]">{item.name || "Custom Candle"}</p>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide">QTY: {item.quantity} • ₹{(item.totalAmount || item.itemTotal || (item.price * item.quantity)) / item.quantity}/unit</p>
                      </div>
                    </div>
                    <p className="font-black text-gray-900 text-sm">₹{item.totalAmount || item.itemTotal || (item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {order.shippingAddress && (
                <div className="space-y-1.5">
                  <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Shipping Address</h5>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm space-y-0.5 text-[13px]">
                    <p className="font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                    <p className="text-gray-500 font-medium leading-relaxed">{order.shippingAddress.street}</p>
                    <p className="text-gray-500 font-medium leading-relaxed">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                    <p className="text-gray-400 pt-1 font-semibold text-[11px]">Phone: {order.shippingAddress.phone}</p>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Summary</h5>
                <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm space-y-1.5">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-gray-400 font-medium">Payment</span>
                    <span className="font-bold text-gray-900 uppercase tracking-wide">{order.paymentMethod || "Online"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-gray-400 font-medium">Subtotal</span>
                    <span className="font-bold text-gray-900">Rs {subtotal}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-green-600 font-medium">Discount</span>
                      <span className="font-bold text-green-600">-Rs {discountTotal}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-gray-400 font-medium">Shipping Fee</span>
                    <span className={`font-bold ${shippingFee > 0 ? "text-gray-900" : "text-green-600"}`}>
                      {shippingFee > 0 ? `Rs ${shippingFee}` : "FREE"}
                    </span>
                  </div>
                  {platformFee > 0 && (
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-gray-400 font-medium">Platform Fee</span>
                      <span className="font-bold text-gray-900">Rs {platformFee}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-gray-900 font-bold text-sm">Total</span>
                    <span className="text-gray-900 font-black text-lg tracking-tight">₹{order.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
