const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Sends a welcome email to a new user.
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name (optional)
 */
export async function sendWelcomeEmail(email, name) {
  if (!BACKEND_URL) return { success: false, error: "Backend URL missing" };
  
  const url = `${BACKEND_URL}/send-welcome-email`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name }),
    });

    const contentType = res.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = { message: await res.text() };
    }

    if (!res.ok) {
      return { success: false, error: data.message, status: res.status };
    }

    return { success: true, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
/**
 * Sends an order confirmation email to the user.
 * @param {string} email - Recipient email
 * @param {object} orderData - The order details
 */
export async function sendOrderConfirmation(email, orderData) {
  if (!BACKEND_URL) return { success: false, error: "Backend URL missing" };
  const url = `${BACKEND_URL}/send-order-confirmation`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orderData }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Sends an order status update email to the user.
 * @param {string} email - Recipient email
 * @param {string} orderId - The ID of the order
 * @param {string} status - New status (e.g., 'shipped')
 * @param {string} name - Recipient name
 */
export async function sendOrderStatusUpdate(email, orderId, status, name) {
  if (!BACKEND_URL) return { success: false, error: "Backend URL missing" };
  const url = `${BACKEND_URL}/send-status-update`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orderId, status, name }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Trigger professional Password Reset email via backend
 */
export async function sendPasswordResetEmail(email) {
  if (!BACKEND_URL) return { success: false, error: "Backend URL missing" };
  const url = `${BACKEND_URL}/send-password-reset`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}
