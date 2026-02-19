const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function createProduct(product, idToken) {
  const res = await fetch(`${BACKEND_URL}/admin/products`, {
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
  const res = await fetch(`${BACKEND_URL}/admin/products/${id}`, {
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
  const res = await fetch(`${BACKEND_URL}/admin/products/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to delete product");
  return res.json();
}

export async function permanentlyDeleteProduct(id, idToken) {
  const res = await fetch(`${BACKEND_URL}/admin/products/${id}/permanent`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to permanently delete product");
  return res.json();
}

export async function generateCatalogue(idToken, onProgress) {
  const res = await fetch(`${BACKEND_URL}/admin/generate-catalogue`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to generate catalogue");

  const reader = res.body.getReader();
  const contentLength = Number(res.headers.get('Content-Length'));

  let receivedLength = 0;
  let chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    if (contentLength && onProgress) {
      onProgress(Math.round((receivedLength / contentLength) * 100));
    }
  }

  return new Blob(chunks, { type: 'application/pdf' });
}

export async function generateBulkCatalogue(idToken, onProgress) {
  const res = await fetch(`${BACKEND_URL}/admin/generate-bulk-catalogue`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to generate bulk catalogue");

  const reader = res.body.getReader();
  const contentLength = Number(res.headers.get('Content-Length'));

  let receivedLength = 0;
  let chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    if (contentLength && onProgress) {
      onProgress(Math.round((receivedLength / contentLength) * 100));
    }
  }

  return new Blob(chunks, { type: 'application/pdf' });
}

export async function getCatalogueStatus(idToken) {
  const res = await fetch(`${BACKEND_URL}/admin/catalogue-status`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to get catalogue status");
  return res.json();
}
