export const INTEGER_INPUT_PATTERN = /^\d*$/;
export const DECIMAL_INPUT_PATTERN = /^\d*\.?\d*$/;

export function isValidAdminNumberInput(value, { allowDecimal = false } = {}) {
  const pattern = allowDecimal ? DECIMAL_INPUT_PATTERN : INTEGER_INPUT_PATTERN;
  return pattern.test(value);
}

export function getStableAdminNumberValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function coerceAdminNumberInput(currentValue, nextValue, { allowDecimal = false } = {}) {
  return isValidAdminNumberInput(nextValue, { allowDecimal }) ? nextValue : currentValue;
}

export function parseAdminNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function preventNumberWheelChange(event) {
  event.currentTarget.blur();
}
