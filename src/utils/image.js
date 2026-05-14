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


export function optimizeCloudinaryUrl(url, options = {}) {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) return url;
  
  if (url.includes("/upload/w_") || url.startsWith("data:") || url.startsWith("blob:")) return url;

  const { width = 1000, height, crop = "fill" } = options;
  
  // We use c_fill with g_auto for better centering by default
  let transformations = `c_${crop},w_${width},q_auto,f_auto`;
  if (height) transformations += `,h_${height}`;
  if (crop === "fill") transformations += ",g_auto";

  const optimizedUrl = url.replace(
    /\/(upload|private|authenticated)\/(v[0-9]+\/)?/, 
    `/$1/${transformations}/$2`
  );

  return optimizedUrl;
}


export const compressToWebpUnderLimit = async (file, maxBytes = 5 * 1024 * 1024) => {
  if (!(file instanceof File) || !file.type.startsWith("image/")) return file;
  
  if (file.type === "image/webp" && file.size <= maxBytes) return file;

  const imgUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = imgUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const MAX_DIM = 1920;
    let scale = 1;
    if (img.naturalWidth > MAX_DIM || img.naturalHeight > MAX_DIM) {
      scale = MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight);
    }

    const quality = 0.85; 
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    
    if (!blob) throw new Error("Image compression failed");

    if (blob.size > maxBytes) {
      const smallerBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.6)
      );
      return new File([smallerBlob || blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
};