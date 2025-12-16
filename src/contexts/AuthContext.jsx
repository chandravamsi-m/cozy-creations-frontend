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
import "../firebase"; // ensure Firebase initializes before using Auth

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Track user login state + refresh token automatically
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        const token = await u.getIdToken();
        setIdToken(token);

        // Refresh token every 50 mins
        u.getIdToken(true);
      } else {
        setIdToken(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Google login
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  // Email login
  const loginWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Email signup
  const signupWithEmail = async (email, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  // Logout
  const logoutUser = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    idToken,
    loading,
    signInWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
