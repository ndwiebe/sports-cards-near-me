// init.js (clean version without filtering exclusion, triggers full map display)
import { initializeApp as appInit } from './main.js';

// Google Maps callback
window.initializeApp = function () {
  try {
    appInit();
  } catch (e) {
    console.error("Google Maps initializeApp failed:", e);
  }
};

// Search bar functionality - pans the map only (does not hide stores)
window.searchLocation = function () {
  const input = document.getElementById('search-input');
  const address = input?.value.trim();

  if (!address || !window.google || !window.google.maps || !window.map) {
    alert("Google Maps or address is unavailable.");
    return;
  }

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const loc = results[0].geometry.location;
      if (window.map?.setCenter) {
        window.map.setCenter(loc);
        window.map.setZoom(12);
      } else {
        console.error("Google Map instance not initialized correctly.");
      }
    } else {
      alert('Could not find that location: ' + status);
    }
  });
};





