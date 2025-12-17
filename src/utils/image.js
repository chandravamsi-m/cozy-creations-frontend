const PLACEHOLDER = "https://via.placeholder.com/600x400?text=No+image";
 
function looksLikeBase64(s) {
  if (!s || typeof s !== "string") return false;
  const cleaned = s.replace(/\s+/g, "");
  if (cleaned.length < 100) return false;
  return /^[A-Za-z0-9+/=]+$/.test(cleaned);
}
 
export function getImageSrc(value, mimeType = "image/png") {
  if (!value) return PLACEHOLDER;
 
  if (typeof value === "string" && value.startsWith("data:image")) {
    return value;
  }
 
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    return value;
  }
 
  if (typeof value === "string" && value.startsWith("//")) {
    return window.location.protocol + value;
  }
 
  if (looksLikeBase64(value)) {
    return `data:${mimeType};base64,${value}`;
  }
 
  if (typeof value === "object" && value !== null) {
    if (value.url && /^https?:\/\//i.test(value.url)) return value.url;
    if (value.base64) {
      const mt = value.mimeType || mimeType;
      return `data:${mt};base64,${value.base64}`;
    }
  }
 
  return PLACEHOLDER;
}