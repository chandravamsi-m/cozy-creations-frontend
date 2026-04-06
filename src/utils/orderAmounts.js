export function toOrderAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getItemOriginalSubtotal(order) {
  return (order.items || []).reduce((sum, item) => {
    const lineTotal = item.lineOriginalTotal ?? item.totalOriginalAmount ?? (toOrderAmount(item.originalPrice ?? item.price) * toOrderAmount(item.quantity));
    return sum + toOrderAmount(lineTotal);
  }, 0);
}

function getItemDiscountedSubtotal(order) {
  return (order.items || []).reduce((sum, item) => {
    const lineTotal = item.lineTotal ?? item.totalAmount ?? item.itemTotal ?? (toOrderAmount(item.price) * toOrderAmount(item.quantity));
    return sum + toOrderAmount(lineTotal);
  }, 0);
}

export function getOrderSubtotal(order) {
  const explicitSubtotal = toOrderAmount(order?.subtotal);
  const itemOriginalSubtotal = getItemOriginalSubtotal(order);
  const itemDiscountedSubtotal = getItemDiscountedSubtotal(order);

  if (itemOriginalSubtotal > 0) {
    return Math.max(explicitSubtotal, itemOriginalSubtotal, itemDiscountedSubtotal);
  }

  return Math.max(explicitSubtotal, itemDiscountedSubtotal);
}

export function getOrderDiscountTotal(order) {
  const explicitDiscount = toOrderAmount(order?.discountTotal);
  if (explicitDiscount > 0) return explicitDiscount;

  const originalSubtotal = getOrderSubtotal(order);
  const discountedSubtotal = order?.discountedSubtotal != null
    ? toOrderAmount(order.discountedSubtotal)
    : getItemDiscountedSubtotal(order);

  return Math.max(0, originalSubtotal - discountedSubtotal);
}

export function getOrderPlatformFee(order) {
  return toOrderAmount(order?.platformFee);
}

export function getOrderShippingFee(order) {
  const subtotal = getOrderSubtotal(order);
  const discountTotal = getOrderDiscountTotal(order);
  const discountedSubtotal = order?.discountedSubtotal != null
    ? toOrderAmount(order.discountedSubtotal)
    : Math.max(0, getItemDiscountedSubtotal(order), subtotal - discountTotal);
  const platformFee = getOrderPlatformFee(order);
  const total = toOrderAmount(order?.total);
  const derived = total - discountedSubtotal - platformFee;

  if (order?.total != null && (order?.discountedSubtotal != null || order?.subtotal != null)) {
    return Math.max(0, toOrderAmount(derived));
  }

  return toOrderAmount(order?.deliveryFee);
}

export function getOrderAmountBreakdown(order) {
  return {
    subtotal: getOrderSubtotal(order),
    discountTotal: getOrderDiscountTotal(order),
    shippingFee: getOrderShippingFee(order),
    platformFee: getOrderPlatformFee(order),
    total: toOrderAmount(order?.total),
  };
}
