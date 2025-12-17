import React from "react";
import vector from "../assets/svgs/vector.svg";

export default function ScrollDownIndicator({
  className = "",
  label = "Scroll Down",
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute left-0 right-0 bottom-6 z-20 flex flex-col items-center gap-2 text-white ${className}`}
      aria-label={label}
    >
      <img
        src={vector}
        alt=""
        className="animate-bounce w-8 h-8 sm:w-6 sm:h-6"
      />
      <span className="text-xs font-semibold uppercase">{label}</span>
    </button>
  );
}


