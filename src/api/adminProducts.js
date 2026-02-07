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

export async function generateCatalogue(idToken) {
  const res = await fetch(`${BACKEND_URL}/admin/generate-catalogue`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to generate catalogue");
  return res.blob();
}
