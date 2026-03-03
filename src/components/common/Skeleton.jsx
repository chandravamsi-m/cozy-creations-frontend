// src/components/common/Skeleton.jsx
import React from "react";

/**
 * A flexible Skeleton component with shimmer animation.
 * @param {string} width - Width of the skeleton (e.g., '100%', '200px')
 * @param {string} height - Height of the skeleton
 * @param {string} borderRadius - Border radius (e.g., '8px', '9999px')
 * @param {string} className - Additional CSS classes
 */
const Skeleton = ({ width, height, borderRadius = "8px", className = "" }) => {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 ${className}`}
      style={{
        width: width || "100%",
        height: height || "20px",
        borderRadius: borderRadius,
      }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
};

export default Skeleton;
