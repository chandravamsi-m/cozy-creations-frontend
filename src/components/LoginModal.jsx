// src/components/LoginModal.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function LoginModal({ closeModal }) {
  const navigate = useNavigate();

  const {
    signInWithGoogle,
    loginWithEmail,
    signupWithEmail,
    resetPassword,
    getErrorMessage,
    isAdmin,
    loading: authLoading,
  } = useAuth();

  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [msg, setMsg] = useState("");

  const handlePostLogin = () => {
    closeModal();
  };

  // -------------------------
  // EMAIL LOGIN / SIGNUP
  // -------------------------
  const submitEmailForm = async () => {
    setErrMsg("");

    // Validation
    if (!email.trim() || !password.trim()) {
      setErrMsg("Please enter both email and password.");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrMsg("Please enter a valid email address.");
      return;
    }

    // For signup, validate password and confirm password
    if (mode === "signup") {
      if (password.length < 6) {
        setErrMsg("Password must be at least 6 characters long.");
        return;
      }

      if (password !== confirmPassword) {
        setErrMsg("Passwords do not match. Please try again.");
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await loginWithEmail(email.trim(), password);
      } else {
        await signupWithEmail(email.trim(), password);
      }

      handlePostLogin();

    } catch (err) {
      // Use getErrorMessage if available, otherwise use error message
      const errorMsg = getErrorMessage ? getErrorMessage(err) : (err.message || "Something went wrong.");
      setErrMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // GOOGLE LOGIN
  // -------------------------
  const googleLogin = async () => {
    try {
      setErrMsg("");
      setLoading(true);

      await signInWithGoogle();

      handlePostLogin();

    } catch (err) {
      const errorMsg = getErrorMessage ? getErrorMessage(err) : "Google Sign-In failed.";
      setErrMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrMsg("");
    setMsg("");

    if (!email.trim()) {
      setErrMsg("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await resetPassword(email.trim());

      if (res && res.success) {
        setMsg("Password reset link sent! Please check your email inbox.");
      } else {
        setErrMsg(res?.error || "Could not send reset link. Please try again.");
      }
    } catch (err) {
      setErrMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset form when mode changes
  useEffect(() => {
    setErrMsg("");
    setMsg("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">

      {/* CLICK OUTSIDE TO CLOSE */}
      <div className="absolute inset-0" onClick={closeModal}></div>

      {/* MODAL */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fadeIn">

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {mode === "login"
              ? "Welcome Back"
              : mode === "forgot"
                ? "Reset Password"
                : "Create Account"}
          </h2>
          <button onClick={closeModal} className="text-gray-500 text-xl hover:text-black">
            ✕
          </button>
        </div>
        {/* TABS */}
        {mode !== "forgot" && (
          <div className="flex">
            <button
              className={`flex-1 py-3 text-center font-medium ${mode === "login"
                ? "text-gray-900 border-b-2 border-yellow-accent"
                : "text-gray-500"
                }`}
              onClick={() => setMode("login")}
            >
              Login
            </button>

            <button
              className={`flex-1 py-3 text-center font-medium ${mode === "signup"
                ? "text-gray-900 border-b-2 border-yellow-accent"
                : "text-gray-500"
                }`}
              onClick={() => setMode("signup")}
            >
              Signup
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="px-6 py-6">
          {errMsg && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              {errMsg}
            </div>
          )}

          {msg && (
            <div className="mb-3 text-sm text-emerald-600 bg-emerald-50 p-2 rounded">
              {msg}
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

            {mode === "forgot" && (
              <p className="text-sm text-gray-600">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>
            )}

            {/* PASSWORD */}
            {mode !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm text-gray-700">Password</label>
                  {mode === "login" && (
                    <button
                      onClick={() => setMode("forgot")}
                      className="text-[11px] text-yellow-600 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-yellow-accent pr-10"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (mode === "login" || (mode === "signup" && confirmPassword))
                      ) {
                        submitEmailForm();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {mode === "signup" && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Password must be at least 6 characters.
                  </p>
                )}
              </div>
            )}

            {/* CONFIRM PASSWORD - Only show in signup mode */}
            {mode === "signup" && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-yellow-accent pr-10"
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password && confirmPassword) {
                        submitEmailForm();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              onClick={mode === "forgot" ? handleResetPassword : submitEmailForm}
              disabled={loading}
              className="w-full py-2 bg-yellow-accent text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Login"
                  : mode === "forgot"
                    ? "Send Reset Link"
                    : "Create Account"}
            </button>

            {/* DIVIDER */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-[1px] bg-gray-300"></div>
              <span className="text-gray-500 text-xs">OR</span>
              <div className="flex-1 h-[1px] bg-gray-300"></div>
            </div>

            {/* GOOGLE LOGIN */}
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

        {/* FOOTER */}
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
          ) : mode === "forgot" ? (
            <>
              Remembered your password?{" "}
              <button
                className="text-yellow-accent hover:underline"
                onClick={() => setMode("login")}
              >
                Log in
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

      {/* ANIMATION */}
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
