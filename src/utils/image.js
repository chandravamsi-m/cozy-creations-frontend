// Convert raw base64 string into a valid <img> src
export function toImageSrc(base64String, mimeType = "image/png") {
  if (!base64String) return "";
  
  // Already a valid data URL? (starts with data:image)
  if (base64String.startsWith("data:image")) {
    return base64String;
  }

  // Build proper data URL
  return `data:${mimeType};base64,${base64String}`;
}
