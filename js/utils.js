// utils.js (lightweight helpers for rendering and validation)

/**
 * Return a value or "N/A" if falsy or empty string.
 */
export function displayOrNA(value) {
  return value && value.trim() !== "" ? value : "N/A";
}

/**
 * Validate a URL by attempting to construct it.
 */
export function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}
