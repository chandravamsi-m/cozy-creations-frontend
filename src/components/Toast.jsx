import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

const Toast = ({ show, message, type }) => {
  return (
    <div
      className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[2100] transition-all duration-500 ease-in-out ${show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8 pointer-events-none"
        }`}
    >
      <div
        className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-xl bg-white border ${type === "success" ? "border-green-100 text-green-600" : "border-red-100 text-red-600"
          }`}
      >
        <span className="flex-shrink-0">
          {type === "success" ? (
            <CheckCircle2 className="w-5 h-5 transition-transform duration-500 ease-out" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </span>
        <span className="text-sm font-semibold tracking-tight">{message}</span>
      </div>
    </div>
  );
};

export default Toast;
