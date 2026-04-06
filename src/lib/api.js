const RAW_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

function splitBackendUrl(rawUrl) {
  if (!rawUrl) {
    return {
      origin: "",
      apiBase: "",
    };
  }

  if (rawUrl.endsWith("/api")) {
    return {
      origin: rawUrl.slice(0, -4),
      apiBase: rawUrl,
    };
  }

  return {
    origin: rawUrl,
    apiBase: `${rawUrl}/api`,
  };
}

const { origin: BACKEND_ORIGIN, apiBase: BACKEND_API_BASE } = splitBackendUrl(RAW_BACKEND_URL);

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function rootUrl(path = "") {
  if (!path) return BACKEND_ORIGIN;
  return `${BACKEND_ORIGIN}${normalizePath(path)}`;
}

export function apiUrl(path) {
  return `${BACKEND_API_BASE}${normalizePath(path)}`;
}

export async function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), options);
}
