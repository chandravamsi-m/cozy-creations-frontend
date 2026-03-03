// src/components/skeletons/OrderRowSkeleton.jsx
import React from "react";
import Skeleton from "../common/Skeleton";

const OrderRowSkeleton = () => {
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          {/* Order ID */}
          <Skeleton width="180px" height="18px" />
          {/* Date */}
          <Skeleton width="120px" height="14px" />
        </div>
        {/* Status Chip */}
        <Skeleton width="100px" height="28px" borderRadius="9999px" />
      </div>

      <div className="h-px bg-gray-50 -mx-1" />

      <div className="flex items-center justify-between">
        {/* Number of items */}
        <Skeleton width="80px" height="14px" />
        {/* Total Price */}
        <Skeleton width="60px" height="18px" />
      </div>
    </div>
  );
};

export default OrderRowSkeleton;
