import { apiUrl } from "../lib/api";

export async function listAdminOrders(idToken, { limit } = {}) {
  const url = new URL(apiUrl("/admin/orders"));
  if (limit) url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

export async function getAdminOrderDetails(orderId, idToken) {
  const res = await fetch(apiUrl(`/admin/orders/${orderId}`), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to load order");
  return res.json();
}

export async function updateAdminOrderStatus(orderId, status, idToken, expectedDeliveryDate) {
  const res = await fetch(apiUrl(`/admin/orders/${orderId}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ status, expectedDeliveryDate }),
  });

  if (!res.ok) throw new Error("Failed to update order status");
  return res.json();
}

export async function cancelAdminOrder(orderId, idToken) {
  const res = await fetch(apiUrl(`/admin/orders/${orderId}/cancel`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to cancel order");
  return data;
}
