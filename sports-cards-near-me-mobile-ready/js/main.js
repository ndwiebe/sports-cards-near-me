import { initMap } from './map.js';
import { loadStoresFromSheet } from './loadStores.js';

window.initMap = async () => {
  const stores = await loadStoresFromSheet();
  initMap(stores);
};