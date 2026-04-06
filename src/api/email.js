import { apiFetch } from "../lib/api";

export async function sendWelcomeEmail(email, name) {
  const res = await apiFetch("/send-welcome-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, name }),
  });

  const contentType = res.headers.get("content-type");
  const data = contentType && contentType.includes("application/json")
    ? await res.json()
    : { message: await res.text() };

  if (!res.ok) {
    return { success: false, error: data.message || data.error, status: res.status };
  }

  return { success: true, ...data };
}

export async function sendOrderConfirmation(email, orderData, idToken) {
  const res = await apiFetch("/send-order-confirmation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ email, orderData }),
  });
  return res.json();
}

export async function sendOrderStatusUpdate(email, orderId, status, name, expectedDeliveryDate, idToken) {
  const res = await apiFetch("/send-status-update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ email, orderId, status, name, expectedDeliveryDate }),
  });
  return res.json();
}

export async function sendPasswordResetEmail(email) {
  const res = await apiFetch("/send-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}
