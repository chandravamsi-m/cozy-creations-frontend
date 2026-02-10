const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function deleteUser(uid, idToken) {
  const res = await fetch(`${BACKEND_URL}/admin/users/${uid}`, {
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
  const res = await fetch(`${BACKEND_URL}/admin/users`, {
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
