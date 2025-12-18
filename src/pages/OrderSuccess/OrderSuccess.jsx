// src/pages/OrderSuccess/OrderSuccess.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderId = location.state?.orderId;

  return (
    <main className="w-full bg-[#FBFAF9] min-h-screen px-4 py-10 pt-20 sm:pt-24 font-montserrat">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 grid place-items-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for your order. We'll send you a confirmation email shortly.
          </p>
          {orderId && (
            <p className="text-sm text-gray-500 mb-6">
              Order ID: <span className="font-semibold text-gray-900">{orderId}</span>
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/products")}
              className="px-6 py-3 bg-yellow-accent hover:bg-yellow-accent/90 rounded-xl text-black font-semibold transition-all"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 border border-gray-300 hover:bg-gray-50 rounded-xl text-gray-800 font-semibold transition-all"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

