// src/utils/offerUtils.js
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Calculate discount for a product
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
