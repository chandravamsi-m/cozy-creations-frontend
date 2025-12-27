// src/api/userOrders.js
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Fetch all orders for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of order objects
 */
export async function getUserOrders(userId) {
  if (!userId) throw new Error("User ID is required");
  
  const ordersRef = collection(db, "orders");
  const q = query(
    ordersRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
  }));
}
