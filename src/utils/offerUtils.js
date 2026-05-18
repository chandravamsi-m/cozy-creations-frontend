// src/utils/offerUtils.js
import { apiFetch } from "../lib/api";

/**
 * "Best Price Wins" — synchronous multi-offer discount calculator.
 * Accepts either a single offer object (legacy) or an array of offers.
 * Returns the result of the offer that gives the maximum discount to the product.
 *
 * @param {Object} product - Product with id, price, category
 * @param {Object|Array} offersOrOffer - Active offer settings (array or single object)
 * @returns {Object} Discount details
 */
export function getEffectiveDiscount(product, offersOrOffer) {
  const offers = Array.isArray(offersOrOffer)
    ? offersOrOffer
    : offersOrOffer
    ? [offersOrOffer]
    : [];

  const noDiscount = {
    hasDiscount: false,
    originalPrice: product.price,
    discountedPrice: product.price,
    savedAmount: 0,
    discountPercent: 0,
    offerName: ""
  };

  if (!offers.length) return noDiscount;

  let bestResult = noDiscount;

  for (const offer of offers) {
    const result = computeOfferForProduct(product, offer);
    if (result.hasDiscount && result.savedAmount > bestResult.savedAmount) {
      bestResult = result;
    }
  }

  return bestResult;
}

/**
 * Compute discount for a single offer applied to a single product.
 * @private
 */
function computeOfferForProduct(product, offer) {
  if (!offer || !offer.isActive || !offer.hasDiscount) {
    return {
      hasDiscount: false,
      originalPrice: product.price,
      discountedPrice: product.price,
      savedAmount: 0,
      discountPercent: 0,
    };
  }

  let applies = false;
  if (offer.applicableToAll) {
    applies = true;
  } else {
    if (offer.applicableCategories?.includes(product.category)) applies = true;
    if (offer.applicableProducts?.includes(product.id)) applies = true;
  }

  if (!applies) {
    return {
      hasDiscount: false,
      originalPrice: product.price,
      discountedPrice: product.price,
      savedAmount: 0,
      discountPercent: 0,
    };
  }

  const originalPrice = product.price || 0;
  let discountedPrice = originalPrice;

  if (offer.discountType === "percentage") {
    const discountAmount = (originalPrice * (offer.discountValue || 0)) / 100;
    discountedPrice = Math.max(0, originalPrice - discountAmount);
  } else {
    discountedPrice = Math.max(0, originalPrice - (offer.discountValue || 0));
  }

  const savedAmount = Math.round(originalPrice - discountedPrice);
  return {
    hasDiscount: savedAmount > 0,
    originalPrice,
    discountedPrice: Math.round(discountedPrice),
    savedAmount,
    discountPercent:
      offer.discountType === "percentage"
        ? offer.discountValue || 0
        : Math.round((savedAmount / originalPrice) * 100) || 0,
    offerName: offer.name || "Offer"
  };
}

/**
 * Calculate discount for a product via backend API call (legacy/individual check).
 * The backend now also uses "Best Price Wins" multi-offer logic.
 *
 * @param {Object} product - Product object with id, price, category
 * @returns {Promise<Object>} Discount details
 */
export async function calculateProductDiscount(product) {
  try {
    const res = await apiFetch("/offers/calculate-discount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        productPrice: product.price,
        category: product.category,
      }),
    });

    if (!res.ok) throw new Error("Failed to calculate discount");
    return await res.json();
  } catch (err) {
    console.error("Error calculating discount:", err);
    return {
      hasDiscount: false,
      originalPrice: product.price,
      discountedPrice: product.price,
      savedAmount: 0,
      discountPercent: 0,
    };
  }
}
