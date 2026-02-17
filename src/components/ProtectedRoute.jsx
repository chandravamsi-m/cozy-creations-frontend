import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLoginModal } from "../contexts/LoginModalContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const location = useLocation();

  useEffect(() => {
    // If we're not loading and there's no user, open the login modal
    // after the redirect happens.
    if (!loading && !user) {
      const timer = setTimeout(() => {
        openLoginModal();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, openLoginModal]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-accent"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to home if not logged in, saving the intended location
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
