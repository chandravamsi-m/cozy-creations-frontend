// src/components/skeletons/OrderRowSkeleton.jsx
import React from "react";
import Skeleton from "../common/Skeleton";

const OrderRowSkeleton = () => {
  return (
    <tr className="animate-pulse border-b border-gray-50 bg-white">
      <td className="px-6 py-5">
        <Skeleton width="100px" height="14px" borderRadius="4px" />
      </td>
      <td className="px-6 py-5">
        <Skeleton width="80px" height="12px" borderRadius="4px" />
      </td>
      <td className="px-6 py-5">
        <Skeleton width="60px" height="14px" borderRadius="4px" />
      </td>
      <td className="px-6 py-5">
        <Skeleton width="120px" height="12px" borderRadius="4px" />
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col gap-1.5">
          <Skeleton width="70px" height="20px" borderRadius="8px" />
          <Skeleton width="50px" height="10px" borderRadius="4px" />
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <Skeleton width="32px" height="32px" borderRadius="12px" />
      </td>
    </tr>
  );
};

export default OrderRowSkeleton;
