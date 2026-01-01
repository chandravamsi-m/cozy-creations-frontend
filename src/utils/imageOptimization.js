// src/utils/imageOptimization.js

/**
 * Optimizes Cloudinary image URLs for faster loading
 * @param {string} url - Original Cloudinary image URL
 * @param {object} options - Optimization options
 * @returns {string} - Optimized image URL
 */
export function optimizeCloudinaryImage(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) {
    return url; // Return original if not a Cloudinary URL
  }

  const {
    width = 200,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  // Split the URL at '/upload/'
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  // Build transformation string
  const transformations = [
    `w_${width}`,
    `q_${quality}`,
    `f_${format}`,
    `c_${crop}`,
    'dpr_auto', // Automatic device pixel ratio
  ].join(',');

  // Reconstruct URL with transformations
  return `${parts[0]}/upload/${transformations}/${parts[1]}`;
}

/**
 * Preset configurations for different use cases
 */
export const IMAGE_PRESETS = {
  thumbnail: { width: 100, quality: 'auto:low' },
  cart: { width: 200, quality: 'auto:good' },
  checkout: { width: 150, quality: 'auto:good' },
  product: { width: 600, quality: 'auto:best' },
  hero: { width: 1200, quality: 'auto:best' },
};
