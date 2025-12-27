// src/pages/MyOrders/MyOrders.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserOrders } from "../../api/userOrders";

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      const userOrders = await getUserOrders(user.uid);
      setOrders(userOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmed: "bg-blue-100 text-blue-800 border-blue-200",
      packed: "bg-purple-100 text-purple-800 border-purple-200",
      shipped: "bg-orange-100 text-orange-800 border-orange-200",
      delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFAF9] pt-24 px-4 flex items-center justify-center">
        <p className="text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFAF9] pt-24 px-4 pb-12 font-montserrat">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600 mb-8">Track and manage your orders</p>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
            <a
              href="/products"
              className="inline-block px-6 py-3 bg-yellow-accent text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
            >
              Browse Products
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
              >
                {/* Order Header */}
                <div className="p-4 md:p-6">
                  <div className="flex flex-col gap-3 mb-4">
                    {/* Mobile: Stack everything vertically */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Order ID</p>
                        <p className="font-semibold text-sm md:text-base text-gray-900">#{order.id}</p>
                      </div>
                      <div>
                        <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold border ${getStatusColor(order.status)}`}>
                          {order.status?.toUpperCase() || "PENDING"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:flex md:gap-6">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Date</p>
                        <p className="font-medium text-sm text-gray-900">{formatDate(order.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="font-semibold text-sm md:text-base text-gray-900">₹{order.total}</p>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Details Button */}
                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1"
                  >
                    {expandedId === order.id ? "Hide Details" : "View Details"}
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedId === order.id ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedId === order.id && (
                  <div className="border-t border-gray-100 p-6 bg-gray-50">
                    {/* Items */}
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                            <div>
                              <p className="font-medium text-gray-900">{item.name || item.productId}</p>
                              <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                            </div>
                            <p className="font-semibold text-gray-900">₹{item.totalAmount || item.quantity * 500}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Address */}
                    {order.shippingAddress && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Shipping Address</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
                          <p>{order.shippingAddress.street}</p>
                          <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                          <p>Phone: {order.shippingAddress.phone}</p>
                        </div>
                      </div>
                    )}

                    {/* Payment Method */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Payment Method: <span className="font-medium text-gray-900">{order.paymentMethod?.toUpperCase() || "N/A"}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
