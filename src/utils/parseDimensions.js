/**
 * parseDimensions.js
 * Parses a product's dimension string and computes effective shipment dimensions,
 * applying pack quantity using the bounding-box (industry-standard) approach.
 *
 * Supported product dimension formats:
 *   - "AxB"   e.g. "7x8.5cm"  → W = A, H = B  (circular/square base products)
 *   - "AxBxC" e.g. "7x8.5x10" → W = B, H = C  (explicit 3D)
 *
 * Returns { l, w, h } in cm and weightKg in kg.
 *
 * Scaling rule (Volume Invariance):
 *   Only L is scaled by totalUnits. This preserves total volume = L×W×H
 *   equivalent to any grid arrangement of the items.
 */

/**
 * Parses a dimension string into { base, height } for 2D, or { l, w, h } for 3D.
 * Returns null if the string can't be parsed.
 * @param {string} dim
 * @returns {{ base: number, height: number, is3D: false } | { l: number, w: number, h: number, is3D: true } | null}
 */
export function parseDimensionString(dim) {
  if (!dim || typeof dim !== "string") return null;

  const cleaned = dim.replace(/\s*(cm|mm)\s*/gi, "").trim();
  const parts = cleaned.split("x").map(Number);

  if (parts.some(isNaN) || parts.some((p) => p <= 0)) return null;

  if (parts.length === 3) {
    return { l: parts[0], w: parts[1], h: parts[2], is3D: true };
  }

  if (parts.length === 2) {
    // AxB: A = base (footprint width), B = height
    return { base: parts[0], height: parts[1], is3D: false };
  }

  return null;
}

/**
 * Compute effective dimensions and weight for one cart item.
 *
 * For AxB dimensions (e.g. candles): W = A, H = B, L = A × totalUnits
 * For AxBxC dimensions: W = B, H = C, L = A × totalUnits
 * Fallback (no dimensions): 10 × 10 × 10 cm per unit
 *
 * @param {object} item - Cart item with quantity, quantityPack, dimensions, weightGrams
 * @returns {{ weightKg, l, w, h }}
 */
export function getEffectiveShipmentDimensions(item) {
  const cartQty = item.quantity || 1;
  const packQty = Number(item.quantityPack) || 1;
  const totalUnits = cartQty * packQty;

  // Weight scales linearly with all units
  const totalWeightGrams = (Number(item.weightGrams) || 300) * totalUnits;
  const weightKg = totalWeightGrams / 1000;

  const parsed = parseDimensionString(item.dimensions);

  let l, w, h;
  if (!parsed) {
    // Fallback: assume 10cm cube per unit
    l = 10 * totalUnits;
    w = 10;
    h = 10;
  } else if (parsed.is3D) {
    // AxBxC: explicitly 3D
    l = parsed.l * totalUnits;
    w = parsed.w;
    h = parsed.h;
  } else {
    // AxB: A = base (footprint), B = height
    l = parsed.base * totalUnits;
    w = parsed.base;
    h = parsed.height;
  }

  return { weightKg, l, w, h };
}
