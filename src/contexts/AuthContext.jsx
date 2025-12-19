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
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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
      // Use email as document ID (sanitize email for Firestore document ID)
      // Firestore document IDs cannot contain certain characters, so we'll use a safe version
      const emailDocId = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const userRef = doc(db, "users", emailDocId);

      // Check if user already exists
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create new user document with default role "user"
        await setDoc(userRef, {
          uid: user.uid,
          email: email.toLowerCase(),
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          role: "user", // Default role
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Update existing user document with latest info
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: email.toLowerCase(),
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("Error creating user document:", error);
      // Don't throw error - user is still authenticated even if document creation fails
    }
  };

  // ------------------------------------------
  // CHECK ADMIN ROLE FROM FIRESTORE (users collection only)
  // ------------------------------------------
  const checkAdminRole = async (uid, email) => {
    try {
      // Check users collection (by email) for admin role
      if (email) {
        const emailDocId = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const userRef = doc(db, "users", emailDocId);
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
        // Ensure user document exists
        if (email) {
          await createUserDocument(u, email);
        }
        // Check admin role
        await checkAdminRole(u.uid, email);
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
