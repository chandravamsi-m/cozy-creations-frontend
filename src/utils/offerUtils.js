// src/utils/offerUtils.js
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


/**
 * Synchronous local discount calculation to avoid race conditions and redundant API calls.
 * @param {Object} product - Product with id, price, category
 * @param {Object} offer - Active offer settings
 * @returns {Object} Discount details
 */
export function getEffectiveDiscount(product, offer) {
  if (!offer || !offer.isActive || !offer.hasDiscount) {
    return {
      hasDiscount: false,
      originalPrice: product.price,
      discountedPrice: product.price,
      savedAmount: 0,
      discountPercent: 0
    };
  }

  let applies = false;
  if (offer.applicableToAll) {
    applies = true;
  } else {
    // Check categories
    if (offer.applicableCategories?.includes(product.category)) {
      applies = true;
    }
    // Check specific products
    if (offer.applicableProducts?.includes(product.id)) {
      applies = true;
    }
  }

  if (!applies) {
    return {
      hasDiscount: false,
      originalPrice: product.price,
      discountedPrice: product.price,
      savedAmount: 0,
      discountPercent: 0
    };
  }

  const originalPrice = product.price || 0;
  let discountedPrice = originalPrice;

  if (offer.discountType === 'percentage') {
    const discountAmount = (originalPrice * (offer.discountValue || 0)) / 100;
    discountedPrice = Math.max(0, originalPrice - discountAmount);
  } else {
    discountedPrice = Math.max(0, originalPrice - (offer.discountValue || 0));
  }

  return {
    hasDiscount: true,
    originalPrice,
    discountedPrice: Math.round(discountedPrice),
    savedAmount: Math.round(originalPrice - discountedPrice),
    discountPercent: offer.discountType === 'percentage' 
      ? (offer.discountValue || 0) 
      : Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) || 0
  };
}

/**
 * Calculate discount for a product (Legacy/Individual check)
 * @param {Object} product - Product object with id, price, category
 * @returns {Promise<Object>} Discount details
 */
export async function calculateProductDiscount(product) {
  try {
    const res = await fetch(`${BACKEND_URL}/offers/calculate-discount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product.id,
        productPrice: product.price,
        category: product.category
      })
    });

    if (!res.ok) {
      throw new Error('Failed to calculate discount');
    }

    return await res.json();
  } catch (err) {
    console.error('Error calculating discount:', err);
    // Return no discount on error
    return {
      hasDiscount: false,
      originalPrice: product.price,
      discountedPrice: product.price,
      savedAmount: 0,
      discountPercent: 0
    };
  }
}
