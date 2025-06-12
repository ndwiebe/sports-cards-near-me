import { initializeApp } from './main.js';

// Ensure the Google Maps API can call this
window.initializeApp = initializeApp;

// Optionally, attach additional global behaviors
window.searchLocation = function () {
  const input = document.getElementById('search-input');
  const address = input?.value.trim();
  if (!address || !window.google || !window.google.maps || !window.map) return;

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const loc = results[0].geometry.location;
      window.map.setCenter(loc);
      window.map.setZoom(12);
    } else {
      alert('Could not find that location.');
    }
  });
};
