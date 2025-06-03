import { initializeApp } from './main.js';

// Expose the map initializer so Google Maps can call it via callback=initializeApp
window.initializeApp = initializeApp;
