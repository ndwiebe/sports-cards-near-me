// init.js (updated for geolocation-triggered reload with optional feedback)
import { initializeApp as appInit } from './main.js';

// Google Maps callback
window.initializeApp = function () {
  try {
    appInit();
  } catch (e) {
    console.error("Google Maps initializeApp failed:", e);
  }
};

// Trigger geolocation and reload if successful
window.useMyLocationAndReload = function () {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    () => location.reload(),
    () => alert("Unable to retrieve your location. Please enable location access and try again.")
  );
};












