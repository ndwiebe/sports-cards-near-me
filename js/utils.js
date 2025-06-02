export function displayOrNA(value) {
  return value && value.trim() !== "" ? value : "N/A";
}

export function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}
