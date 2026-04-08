import { apiFetch } from "../lib/api";

export async function deleteUser(uid, idToken) {
  const res = await apiFetch(`/admin/users/${uid}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete user");
  }

  return res.json();
}

export async function createUser(userData, idToken) {
  const res = await apiFetch("/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create user");
  }

  return res.json();
}

export async function updateUser(uid, userData, idToken) {
  const res = await apiFetch(`/admin/users/${uid}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update user");
  }

  return res.json();
}
