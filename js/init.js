// init.js (corrected to define the callback globally)
import { initializeApp } from './main.js';

// This makes the function available to the Google Maps API callback
window.initializeApp = () => {
  try {
    initializeApp();
  } catch (error) {
    console.error("Initialization failed:", error);
  }
};

// Optional geolocation-triggered search
window.searchLocation = function () {
  const input = document.getElementById('search-input');
  const address = input?.value.trim();
  if (!address || !window.google || !window.google.maps || !window.map) return;

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
      alert('Could not find that location.');
    }
  });
};

