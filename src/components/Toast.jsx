// src/components/Toast.jsx
import React from "react";

const Toast = ({ show, message, type }) => {
  return (
    <div
      className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out ${show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8 pointer-events-none"
        }`}
    >
      <div
        className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-xl bg-white border ${type === "success" ? "border-green-100 text-green-600" : "border-red-100 text-red-600"
          }`}
      >
        <span className="flex-shrink-0">
          {type === "success" ? (
            <svg
              className="w-5 h-5 transition-transform duration-500 ease-out"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </span>
        <span className="text-sm font-semibold tracking-tight">{message}</span>
      </div>
    </div>
  );
};

export default Toast;
