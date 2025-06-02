// utils.js

/**
 * Returns value or "N/A" if empty, null, undefined, or only whitespace.
 * @param {any} value
 * @returns {string}
 */
export function displayOrNA(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : "N/A";
}

/**
 * Validates whether a string is a well-formed URL.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidUrl(str) {
  if (!str || typeof str !== "string" || str.trim().toLowerCase() === "n/a") return false;
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}
