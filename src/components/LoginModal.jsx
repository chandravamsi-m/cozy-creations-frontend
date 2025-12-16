import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginModal({ open, onClose }) {
  const {
    signInWithGoogle,
    loginWithEmail,
    signupWithEmail,
  } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!open) return null;

  const handleEmailAuth = async () => {
    if (isLogin) {
      await loginWithEmail(email, password);
    } else {
      await signupWithEmail(email, password);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-6 rounded-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-4">
          {isLogin ? "Login" : "Create Account"}
        </h2>

        {/* GOOGLE LOGIN */}
        <button
          onClick={async () => {
            await signInWithGoogle();
            onClose();
          }}
          className="w-full py-2 bg-red-500 text-white rounded-lg mb-4"
        >
          Sign in with Google
        </button>

        {/* EMAIL/PASSWORD FORM */}
        <input
          type="email"
          className="w-full border p-2 rounded mb-2"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border p-2 rounded"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleEmailAuth}
          className="w-full mt-4 py-2 bg-yellow-accent text-black rounded"
        >
          {isLogin ? "Login" : "Sign Up"}
        </button>

        <p className="text-sm text-center mt-3">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <span
                className="text-yellow-accent cursor-pointer"
                onClick={() => setIsLogin(false)}
              >
                Create one
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span
                className="text-yellow-accent cursor-pointer"
                onClick={() => setIsLogin(true)}
              >
                Login
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
