// src/components/LoginModal.jsx
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginModal({ closeModal }) {
  const { signInWithGoogle, loginWithEmail, signupWithEmail } = useAuth();

  // Tabs: "login" | "signup"
  const [mode, setMode] = useState("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const submitEmailForm = async () => {
    setErrMsg("");
    if (!email.trim() || !password.trim()) {
      setErrMsg("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }

      closeModal();
    } catch (err) {
      setErrMsg(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    try {
      setErrMsg("");
      setLoading(true);
      await signInWithGoogle();
      closeModal();
    } catch (err) {
      setErrMsg("Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      {/* Click background to close */}
      <div
        className="absolute inset-0"
        onClick={closeModal}
      ></div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <button onClick={closeModal} className="text-gray-500 text-xl hover:text-black">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex">
          <button
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              mode === "login"
                ? "text-gray-900 border-b-2 border-yellow-accent"
                : "text-gray-500"
            }`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              mode === "signup"
                ? "text-gray-900 border-b-2 border-yellow-accent"
                : "text-gray-500"
            }`}
            onClick={() => setMode("signup")}
          >
            Signup
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-6">

          {errMsg && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              {errMsg}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-yellow-accent"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-yellow-accent"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {mode === "signup"
                  ? "Password must be at least 6 characters."
                  : ""}
              </p>
            </div>

            <button
              onClick={submitEmailForm}
              disabled={loading}
              className="w-full py-2 bg-yellow-accent text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-[1px] bg-gray-300"></div>
              <span className="text-gray-500 text-xs">OR</span>
              <div className="flex-1 h-[1px] bg-gray-300"></div>
            </div>

            {/* Google button */}
            <button
              onClick={googleLogin}
              disabled={loading}
              className="w-full py-2 border rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-gray-700 font-medium">
                Continue with Google
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 text-center text-sm text-gray-700">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                className="text-yellow-accent hover:underline"
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="text-yellow-accent hover:underline"
                onClick={() => setMode("login")}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>

      {/* ANIMATIONS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
