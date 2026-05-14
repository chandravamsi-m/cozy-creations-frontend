// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
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
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { sendWelcomeEmail, sendPasswordResetEmail as sendBackendResetEmail } from "../api/email";
import { useRef } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = getAuth();
  const lastInitializedUidRef = useRef(null);

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
    const firstName = partBeforeAt.split(/[._]/)[0];
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
          await setDoc(userRef, {
            uid: user.uid,
            email: email.toLowerCase(),
            displayName: derivedName,
            photoURL: user.photoURL || null,
            role: "user",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          sendWelcomeEmail(email, derivedName).catch((err) =>
            console.error("Welcome email failed:", err)
          );
        }
      } else {
        await setDoc(
          userRef,
          {
            email: email.toLowerCase(),
            displayName: user.displayName || userSnap.data().displayName || derivedName,
            photoURL: user.photoURL || userSnap.data().photoURL || null,
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
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        lastInitializedUidRef.current = null;
        setIdToken(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      if (lastInitializedUidRef.current !== u.uid) {
        lastInitializedUidRef.current = u.uid;
        const email = u.email || "";
        if (email) {
          await createUserDocument(u, email, false);
        }
        await checkAdminRole(u.uid);
      }
      setLoading(false);
    });

    const unsubToken = onIdTokenChanged(auth, async (u) => {
      if (!u) {
        setIdToken(null);
        return;
      }
      try {
        const token = await u.getIdToken();
        setIdToken(token);
      } catch (error) {
        console.error("AuthContext: Failed to refresh ID token:", error);
        setIdToken(null);
      }
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  // ------------------------------------------
  // HELPER: Get error message
  // ------------------------------------------
  const getErrorMessage = (error) => {
    const code = error.code || "";
    const message = error.message || "";
    const cleanMessage = message.replace(/^Firebase:\s*/i, "").replace(/^auth\/\w+:\s*/i, "");
    switch (code) {
      case "auth/email-already-in-use": return "This email is already registered.";
      case "auth/invalid-email": return "Please enter a valid email address.";
      case "auth/weak-password": return "Password is too weak.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential": return "Invalid email or password.";
      case "auth/user-disabled": return "This account has been disabled. Please contact support.";
      case "auth/too-many-requests": return "Too many attempts. Try again later.";
      case "auth/popup-closed-by-user": return "Google login was cancelled.";
      default: return cleanMessage || "Something went wrong.";
    }
  };

  // ------------------------------------------
  // AUTH METHODS
  // ------------------------------------------
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email || "";
    if (email) {
      await createUserDocument(result.user, email, true);
    }
    await checkAdminRole(result.user.uid);
    return result.user;
  };

  const loginWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await checkAdminRole(result.user.uid);
    return result.user;
  };

  const signupWithEmail = async (email, password, displayName = "") => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Include displayName in the user object passed to doc creator
    const userWithProfile = { ...result.user, displayName: displayName || result.user.displayName };
    await createUserDocument(userWithProfile, email.toLowerCase(), true);
    await checkAdminRole(result.user.uid);
    return result.user;
  };

  const resetPassword = async (email) => {
    return await sendBackendResetEmail(email);
  };

  const changeUserPassword = async (currentPassword, newPassword) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user logged in.");
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  };

  const logoutUser = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  const value = {
    user, isAdmin, idToken, loading,
    signInWithGoogle, loginWithEmail, signupWithEmail, resetPassword, changeUserPassword, logoutUser,
    getErrorMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
