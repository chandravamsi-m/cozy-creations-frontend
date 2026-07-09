import { apiFetch } from "../lib/api";

export async function createProduct(product, idToken) {
  const res = await apiFetch("/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ product }),
  });

  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export async function updateProduct(id, product, idToken) {
  const res = await apiFetch(`/admin/products/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ product }),
  });

  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}

export async function deleteProduct(id, idToken) {
  const res = await apiFetch(`/admin/products/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to delete product");
  return res.json();
}

export async function permanentlyDeleteProduct(id, idToken) {
  const res = await apiFetch(`/admin/products/${id}/permanent`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to permanently delete product");
  return res.json();
}

export async function generateCatalogue(idToken, onProgress) {
  const res = await apiFetch("/admin/generate-catalogue", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to generate catalogue");

  const reader = res.body.getReader();
  const contentLength = Number(res.headers.get("Content-Length"));

  let receivedLength = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    if (contentLength && onProgress) {
      onProgress(Math.round((receivedLength / contentLength) * 100));
    }
  }

  return new Blob(chunks, { type: "application/pdf" });
}

export async function generateBulkCatalogue(idToken, onProgress) {
  const res = await apiFetch("/admin/generate-bulk-catalogue", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to generate bulk catalogue");

  const reader = res.body.getReader();
  const contentLength = Number(res.headers.get("Content-Length"));

  let receivedLength = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    if (contentLength && onProgress) {
      onProgress(Math.round((receivedLength / contentLength) * 100));
    }
  }

  return new Blob(chunks, { type: "application/pdf" });
}

export async function getCatalogueStatus(idToken) {
  const res = await apiFetch("/admin/catalogue-status", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to get catalogue status");
  return res.json();
}

export async function uploadVideoToCloudinary(file, idToken) {
  // 1. Get signature from backend
  const sigRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/admin/cloudinary-signature`, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (!sigRes.ok) throw new Error("Failed to get upload signature");
  const { signature, timestamp, eager, eager_async, apiKey, cloudName } = await sigRes.json();

  // 2. Upload to Cloudinary using Signed Upload
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("eager", eager);
  form.append("eager_async", eager_async);

  const res = await fetch(url, { method: "POST", body: form });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Video upload failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  if (!data?.secure_url) throw new Error("Video upload failed: missing secure_url from Cloudinary");
  
  return data.secure_url;
}
