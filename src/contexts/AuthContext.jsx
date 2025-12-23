// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // ------------------------------------------
  // CREATE USER DOCUMENT IN FIRESTORE
  // ------------------------------------------
  const createUserDocument = async (user, email) => {
    try {
      // NEW: Use UID as document ID for better security and structure
      const userRef = doc(db, "users", user.uid);
      
      // Migration logic: Check if UID doc exists
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Check if an old email-based document exists
        const emailDocId = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const oldRef = doc(db, "users", emailDocId);
        const oldSnap = await getDoc(oldRef);

        if (oldSnap.exists()) {
          // MIGRATE: Copy data from old email-doc to new UID-doc
          const oldData = oldSnap.data();
          await setDoc(userRef, {
            ...oldData,
            uid: user.uid,
            email: email.toLowerCase(),
            displayName: user.displayName || oldData.displayName || null,
            photoURL: user.photoURL || oldData.photoURL || null,
            updatedAt: serverTimestamp(),
          });
          // Delete old doc for cleanliness
          await deleteDoc(oldRef);
          console.log(`Migrated user ${email} to UID doc and deleted old entry`);
        } else {
          // Create new user document
          await setDoc(userRef, {
            uid: user.uid,
            email: email.toLowerCase(),
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            role: "user",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        // Update existing UID document
        await setDoc(
          userRef,
          {
            email: email.toLowerCase(),
            displayName: user.displayName || userSnap.data().displayName,
            photoURL: user.photoURL || userSnap.data().photoURL,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("Error creating/migrating user document:", error);
    }
  };

  // ------------------------------------------
  // CHECK ADMIN ROLE FROM FIRESTORE
  // ------------------------------------------
  const checkAdminRole = async (uid) => {
    try {
      if (uid) {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data()?.role === "admin") {
          setIsAdmin(true);
          return;
        }
      }

      setIsAdmin(false);
    } catch (error) {
      console.error("Admin check failed:", error);
      setIsAdmin(false);
    }
  };

  // ------------------------------------------
  // AUTH STATE LISTENER
  // ------------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        const token = await u.getIdToken();
        setIdToken(token);

        const email = u.email || "";
        // Ensure user document exists (handles migration too)
        if (email) {
          await createUserDocument(u, email);
        }
        // Check admin role by UID
        await checkAdminRole(u.uid);
      } else {
        setIdToken(null);
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ------------------------------------------
  // HELPER: Get user-friendly error message
  // ------------------------------------------
  const getErrorMessage = (error) => {
    const code = error.code || "";
    const message = error.message || "";

    // Remove "Firebase: " prefix if present
    const cleanMessage = message.replace(/^Firebase:\s*/i, "").replace(/^auth\/\w+:\s*/i, "");

    switch (code) {
      case "auth/operation-not-allowed":
        return "Email/Password authentication is not enabled. Please contact support.";
      case "auth/email-already-in-use":
        return "This email is already registered. Please login instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 6 characters.";
      case "auth/user-not-found":
        return "No account found with this email. Please sign up first.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-credential":
      case "auth/invalid-credentials":
        return "Invalid email or password. Please check your credentials and try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";
      default:
        // Return user-friendly message or fallback
        return cleanMessage || "Something went wrong. Please try again.";
    }
  };

  // ------------------------------------------
  // LOGIN METHODS
  // ------------------------------------------
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email || "";
    if (email) {
      await createUserDocument(result.user, email);
    }
    await checkAdminRole(result.user.uid, email);
    return result.user;
  };

  const loginWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const emailLower = email.toLowerCase();
    await createUserDocument(result.user, emailLower);
    await checkAdminRole(result.user.uid, emailLower);
    return result.user;
  };

  const signupWithEmail = async (email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const emailLower = email.toLowerCase();
    await createUserDocument(result.user, emailLower);
    await checkAdminRole(result.user.uid, emailLower);
    return result.user;
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logoutUser = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  const value = {
    user,
    isAdmin,
    idToken,
    loading,
    signInWithGoogle,
    loginWithEmail,
    signupWithEmail,
    resetPassword,
    logoutUser,
    getErrorMessage, // Export for use in components
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
