// src/hooks/usePageSEO.js
// Lightweight hook to set per-page SEO meta tags dynamically.
// No external dependencies needed.

import { useEffect } from "react";

const SITE_NAME = "Cozy Creations";
const BASE_URL = "https://cozycreations.in";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

/**
 * Sets document title, meta description, canonical URL, and Open Graph tags
 * for the current page.
 *
 * @param {Object} options
 * @param {string} options.title      – Page title (will get " | Cozy Creations" appended)
 * @param {string} options.description – Meta description (≤160 chars recommended)
 * @param {string} [options.path]      – Path segment for canonical URL (e.g. "/about")
 * @param {string} [options.ogImage]   – Custom OG image URL (defaults to brand image)
 */
export default function usePageSEO({
  title,
  description,
  path = "",
  ogImage = DEFAULT_OG_IMAGE,
}) {
  useEffect(() => {
    // ---- Title ----
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    // ---- Helper to set/create meta tags ----
    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // ---- Helper to set/create link tags ----
    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    // ---- Meta description ----
    setMeta("name", "description", description);

    // ---- Canonical URL ----
    const canonicalUrl = `${BASE_URL}${path}`;
    setLink("canonical", canonicalUrl);

    // ---- Open Graph ----
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:locale", "en_IN");

    // ---- Twitter Card ----
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);
  }, [title, description, path, ogImage]);
}
