import { BACKEND_URL } from "../config/backend";

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
