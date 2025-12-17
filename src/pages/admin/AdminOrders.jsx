// src/pages/admin/AdminOrders.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || null,
      }));

      setOrders(list);
    } catch (err) {
      console.error("Error loading orders:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

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
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-gray-800">
                Order #{order.id}
              </p>

              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  statusColors[order.status] || "bg-gray-200 text-gray-800"
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

            <p className="text-sm text-gray-600">
              Total Amount: ₹{order.total}
            </p>

            <button
              onClick={() => navigate(`/admin/orders/${order.id}`)}
              className="mt-3 px-3 py-1 bg-black text-white rounded"
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
