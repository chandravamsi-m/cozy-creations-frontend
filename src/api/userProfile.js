// src/api/userProfile.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Update user profile in Firestore
 * @param {string} uid - User ID
 * @param {object} data - Profile data to update
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, data) {
  if (!uid) throw new Error("User ID is required");
  
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
}
