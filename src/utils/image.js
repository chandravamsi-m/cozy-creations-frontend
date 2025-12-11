// src/utils/image.js

/**
 * Return a safe <img> src for a stored image value.
 * Accepts:
 *  - data URLs (already "data:image/..;base64,...")
 *  - normal remote URLs ("https://...")
 *  - raw base64 strings (no prefix) -> will be converted to data URL
 *  - null/undefined -> returns placeholder
 *
 * If a mimeType is provided it will be used for raw base64 conversion.
 * If not provided, defaults to "image/png".
 */
const PLACEHOLDER = "https://via.placeholder.com/600x400?text=No+image";

/**
 * Tests whether a string looks like base64 payload (very loose check).
 * Accepts typical base64 characters and checks length.
 */
function looksLikeBase64(s) {
  if (!s || typeof s !== "string") return false;
  // Remove whitespace/newlines
  const cleaned = s.replace(/\s+/g, "");
  // Base64 should be at least some length and only contain base64 chars + optionally padding =
  if (cleaned.length < 100) return false; // crude minimum length; tweak if needed
  return /^[A-Za-z0-9+/=]+$/.test(cleaned);
}

export function getImageSrc(value, mimeType = "image/png") {
  if (!value) return PLACEHOLDER;

  // if it's already a data URL
  if (typeof value === "string" && value.startsWith("data:image")) {
    return value;
  }

  // if it's already a full http(s) URL
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    return value;
  }

  // some firebase storage URLs may be protocol relative or start with //
  if (typeof value === "string" && value.startsWith("//")) {
    return window.location.protocol + value;
  }

  // raw base64 payload (no data: prefix)
  if (looksLikeBase64(value)) {
    return `data:${mimeType};base64,${value}`;
  }

  // fallback: if it's an object with fields (e.g., { url, base64, mimeType })
  if (typeof value === "object" && value !== null) {
    if (value.url && /^https?:\/\//i.test(value.url)) return value.url;
    if (value.base64) {
      const mt = value.mimeType || mimeType;
      return `data:${mt};base64,${value.base64}`;
    }
  }

  // last resort: return placeholder
  return PLACEHOLDER;
}
