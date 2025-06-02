import { loadStoresFromSheet } from './loadStores.js';
import { initMapWithStores } from './map.js';

window.initMap = async () => {
  try {
    const stores = await loadStoresFromSheet();
    initMapWithStores(stores);
  } catch (error) {
    console.error('Failed to load stores:', error);
  }
};
