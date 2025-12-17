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
} from "firebase/auth";

import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // ------------------------------------------
  // CHECK ADMIN ROLE FROM FIRESTORE
  // ------------------------------------------
  const checkAdminRole = async (uid) => {
    try {
      const ref = doc(db, "admins", uid);
      const snap = await getDoc(ref);

      if (snap.exists() && snap.data()?.role === "admin") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
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
  // LOGIN METHODS
  // ------------------------------------------
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await checkAdminRole(result.user.uid);
    return result.user;
  };

  const loginWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await checkAdminRole(result.user.uid);
    return result.user;
  };

  const signupWithEmail = async (email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await checkAdminRole(result.user.uid);
    return result.user;
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
    logoutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
