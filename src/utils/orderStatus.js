export function getOrderStatusConfig(status) {
  const s = status?.toLowerCase() || "";
  if (s === "new") {
    return { color: "text-indigo-700 bg-indigo-100", label: "NEW" };
  }
  if (s === "delivered") {
    return { color: "text-[#2D8A39] bg-[#E8F5E9]", label: "DELIVERED" };
  }
  if (s === "shipped") {
    return { color: "text-[#1976D2] bg-[#E3F2FD]", label: "SHIPPED" };
  }
  if (s === "cancelled") {
    return { color: "text-red-500 bg-red-50", label: "CANCELLED" };
  }
  if (s === "packed") {
    return { color: "text-indigo-600 bg-indigo-50", label: "PACKED" };
  }
  return { color: "text-gray-500 bg-gray-50", label: (s || "unknown").toUpperCase() };
}

export function formatShiprocketStatus(status) {
  if (!status) return "";
  return String(status)
    .toLowerCase()
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeShiprocketStatusForComparison(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (!normalized) return "";

  if (
    normalized.includes("CANCELLED") ||
    normalized.includes("CANCELED") ||
    normalized.includes("CANCELLATION") ||
    normalized === "RTO DELIVERED"
  ) {
    return "cancelled";
  }

  if (normalized === "DELIVERED") {
    return "delivered";
  }

  if (
    normalized === "PICKUP SCHEDULED" ||
    normalized === "PICKUP GENERATED"
  ) {
    return "packed";
  }

  if (
    normalized === "PICKED UP" ||
    normalized === "IN TRANSIT" ||
    normalized === "OUT FOR DELIVERY" ||
    normalized === "UNDELIVERED" ||
    normalized === "RTO INITIATED"
  ) {
    return "shipped";
  }

  return normalized.toLowerCase();
}

export function shouldShowShiprocketStatus(localStatus, shiprocketStatus) {
  if (!shiprocketStatus) return false;

  const normalizedLocal = String(localStatus || "").trim().toLowerCase();
  const normalizedShiprocket = normalizeShiprocketStatusForComparison(shiprocketStatus);

  if (!normalizedShiprocket) return false;
  return normalizedLocal !== normalizedShiprocket;
}
