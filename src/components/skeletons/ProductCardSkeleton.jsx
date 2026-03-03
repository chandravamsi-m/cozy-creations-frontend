// src/components/skeletons/ProductCardSkeleton.jsx
import React from "react";
import Skeleton from "../common/Skeleton";

const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full w-full">
      {/* Image Skeleton */}
      <div className="relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden bg-gray-100">
        <Skeleton height="100%" borderRadius="0px" />
      </div>

      {/* Content Skeleton */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2 sm:gap-3">
        {/* Category Label */}
        <Skeleton width="40%" height="10px" borderRadius="9999px" />

        {/* Title */}
        <Skeleton width="85%" height="16px" className="sm:h-5" />
        <Skeleton width="60%" height="16px" className="sm:h-5" />

        {/* Price & Button */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <Skeleton width="30%" height="18px" className="sm:h-6" />
          <Skeleton width="40px" height="40px" borderRadius="12px" className="shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
