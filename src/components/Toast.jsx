import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

const Toast = ({ show, message, type }) => {
  return (
    <div
      className={`fixed top-20 sm:top-10 left-1/2 transform -translate-x-1/2 z-[3100] max-w-[90vw] w-max transition-all duration-500 ease-in-out ${
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8 pointer-events-none"
      }`}
    >
      <div
        className={`flex items-center justify-center sm:justify-start gap-2.5 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-full shadow-2xl bg-white/95 backdrop-blur-md border ${
          type === "success" ? "border-green-100 text-green-700" : "border-red-100 text-red-700"
        } mx-auto max-w-full`}
      >
        <span className="flex-shrink-0">
          {type === "success" ? (
            <CheckCircle2 className="w-[18px] h-[18px] sm:w-5 sm:h-5 transition-transform duration-500 ease-out" />
          ) : (
            <AlertCircle className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
          )}
        </span>
        <span className="text-[13px] sm:text-sm font-bold tracking-tight text-center sm:text-left leading-tight">{message}</span>
      </div>
    </div>
  );
};

export default Toast;
