import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";

export default function AdminOrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    try {
      const ref = doc(db, "orders", orderId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.error("Failed to load order", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  if (loading) return <p>Loading order...</p>;
  if (!order) return <p>Order not found.</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-3">Order Details</h2>

      <p><strong>Order ID:</strong> {order.id}</p>
      <p><strong>User ID:</strong> {order.userId || "Guest"}</p>
      <p><strong>Status:</strong> {order.status}</p>
      <p><strong>Total:</strong> ₹{order.total}</p>

      {/* ITEMS */}
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Items</h3>
        {order.items?.map((item) => (
          <div key={item.productId} className="border p-2 mb-2 rounded">
            <p>{item.name}</p>
            <p>Qty: {item.quantity}</p>
            <p>Price: ₹{item.price}</p>
          </div>
        ))}
      </div>

      {/* BILLING */}
      {order.billing && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Billing Info</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(order.billing, null, 2)}
          </pre>
        </div>
      )}

      {/* FUTURE STEP → Status Update Buttons */}
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Status update actions will be added next.
        </p>
      </div>
    </div>
  );
}
