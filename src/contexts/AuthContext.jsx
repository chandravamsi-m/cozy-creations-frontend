// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sendWelcomeEmail, sendPasswordResetEmail as sendBackendResetEmail } from "../api/email";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // ------------------------------------------
  // HELPER: EXTRACT NAME FROM EMAIL
  // ------------------------------------------
  const extractNameFromEmail = (email) => {
    if (!email) return "Customer";
    const partBeforeAt = email.split("@")[0];
    // Take the first part before any dot or underscore
    const firstName = partBeforeAt.split(/[._]/)[0];
    // Capitalize first letter
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  // ------------------------------------------
  // CREATE USER DOCUMENT IN FIRESTORE
  // ------------------------------------------
  const createUserDocument = async (user, email, allowCreation = false) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      const derivedName = user.displayName || extractNameFromEmail(email);

      if (!userSnap.exists()) {
        if (allowCreation) {
          // Intentional Creation (Signup / Social First Time)
          await setDoc(userRef, {
            uid: user.uid,
            email: email.toLowerCase(),
            displayName: derivedName,
            photoURL: user.photoURL || null,
            role: "user",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Trigger Welcome Email (Non-blocking)
          sendWelcomeEmail(email, derivedName);
        }
      } else {
        // Update existing profile with latest info if available
        await setDoc(
          userRef,
          {
            email: email.toLowerCase(),
            displayName: user.displayName || userSnap.data().displayName || derivedName,
            photoURL: user.photoURL || userSnap.data().photoURL,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("AuthContext: Error in createUserDocument:", error);
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
      console.error("AuthContext: Admin check failed:", error);
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
        if (email) {
          // IMPORTANT: allowCreation is FALSE by default here
          // This prevents "Login" from causing a "Signup" UI event in Firestore
          await createUserDocument(u, email, false);
        }
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
      // Social login acts like a signup on first hit
      await createUserDocument(result.user, email, true);
    }
    await checkAdminRole(result.user.uid);
    return result.user;
  };

  const loginWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await checkAdminRole(result.user.uid);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const signupWithEmail = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(result.user, email.toLowerCase(), true);
      await checkAdminRole(result.user.uid);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email) => {
    return await sendBackendResetEmail(email);
  };

  // ------------------------------------------
  // CHANGE PASSWORD (Requires re-authentication)
  // ------------------------------------------
  const changeUserPassword = async (currentPassword, newPassword) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently logged in.");

    // Re-authenticate to satisfy Firebase's recent-login requirement
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    // Now safe to update the password
    await updatePassword(currentUser, newPassword);
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
    changeUserPassword,
    logoutUser,
    getErrorMessage, // Export for use in components
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
