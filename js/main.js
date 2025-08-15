// main.js (updated to bind searchLocation from map.js)
import {
  initMap,
  clearMarkers,
  panToMarker,
  highlightMarkerByIndex,
  clearMarkerHighlights,
  searchLocation
} from './map.js';

import { loadStoreData } from './loadStores.js';
import { displayOrNA, isValidUrl } from './utils.js';

let allStores = [];
let mapInstance = null;
let userCoords = null;

window.searchLocation = searchLocation;

export async function initializeApp() {
  allStores = await loadStoreData();
  renderStoreCards(allStores);
  mapInstance = initMap(allStores, handleMarkerClick);
  setupSearchAndFilters();
  detectUserLocation();
}

function detectUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      userCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    });
  }
}

function getDistanceFromUser(lat, lng) {
  if (!userCoords) return null;
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat - userCoords.lat);
  const dLng = toRad(lng - userCoords.lng);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(userCoords.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function setupSearchAndFilters() {
  const searchInput = document.getElementById("search-input");
  const serviceCheckboxes = document.querySelectorAll(".service-filter");
  const typeCheckboxes = document.querySelectorAll(".type-filter");
  const provinceLinks = document.querySelectorAll("nav a[href^='#']");

  const applyFilters = () => {
    const query = searchInput.value.toLowerCase();
    const selectedServices = [...serviceCheckboxes].filter(cb => cb.checked).map(cb => cb.value.toLowerCase());
    const selectedTypes = [...typeCheckboxes].filter(cb => cb.checked).map(cb => cb.value.toLowerCase());

    const filtered = allStores.filter(store => {
      const name = store["Store Name"]?.toLowerCase() || "";
      const city = store.City?.toLowerCase() || "";
      const address = store.Address?.toLowerCase() || "";
      const postal = store["Postal Code"]?.toLowerCase() || "";
      const services = (store.Services || "").toLowerCase();
      const types = (store["Sports/TCG Available"] || "").toLowerCase();

      const matchSearch = [name, city, address, postal].some(text => text.includes(query));
      const matchServices = selectedServices.every(service => services.includes(service));
      const matchTypes = selectedTypes.every(type => types.includes(type));
      const distance = getDistanceFromUser(store.lat, store.lng);
      const withinRadius = distance === null || distance <= 50;

      return matchSearch && matchServices && matchTypes && withinRadius;
    });

    renderStoreCards(filtered);
    clearMarkers();
    initMap(filtered, handleMarkerClick);

    const resultsWrapper = document.getElementById("results-wrapper");
    if (resultsWrapper) resultsWrapper.classList.remove("hidden");
  };

  provinceLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      const provCode = link.getAttribute("href").substring(1).toUpperCase();
      const filtered = allStores.filter(store => {
        const match = store.Address?.match(/\b(AB|BC|MB|NB|NL|NS|ON|PE|QC|SK)\b/i);
        return match && match[0].toUpperCase() === provCode;
      });

      renderStoreCards(filtered);
      clearMarkers();
      initMap(filtered, handleMarkerClick);

      const resultsWrapper = document.getElementById("results-wrapper");
      if (resultsWrapper) resultsWrapper.classList.remove("hidden");

      const target = document.getElementById("nearby-stores-list");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  searchInput.addEventListener("input", applyFilters);
  [...serviceCheckboxes, ...typeCheckboxes].forEach(cb => cb.addEventListener("change", applyFilters));
}

function fullProvinceName(code) {
  const map = {
    AB: "Alberta", BC: "British Columbia", MB: "Manitoba",
    NB: "New Brunswick", NL: "Newfoundland", NS: "Nova Scotia",
    ON: "Ontario", PE: "PEI", QC: "Quebec", SK: "Saskatchewan"
  };
  return map[code] || code;
}

function renderStoreCards(stores) {
  const container = document.getElementById("nearby-stores-list");
  const wrapper = document.getElementById("results-wrapper");
  if (!container) return;
  container.innerHTML = "";
  if (wrapper) wrapper.classList.remove("hidden");

  if (stores.length === 0) {
    container.innerHTML = `<div class='text-center text-red-400 font-semibold mt-6'>🚫 No results found. Try adjusting your filters or search.</div>`;
    return;
  }

  const provinces = {};
  for (const store of stores) {
    const province = store["Address"]?.match(/\b(AB|BC|MB|NB|NL|NS|ON|PE|QC|SK)\b/i)?.[0]?.toUpperCase() || "Other";
    if (!provinces[province]) provinces[province] = [];
    provinces[province].push(store);
  }

  Object.entries(provinces).forEach(([prov, stores]) => {
    const section = document.createElement("section");
    section.className = "mb-6";
    section.innerHTML = `<h2 id="${prov}" class="text-2xl font-bold mb-4">${fullProvinceName(prov)} Sports Card Shops</h2>`;

    const ul = document.createElement("ul");
    ul.className = "space-y-4";

    stores.forEach((store, index) => {
      const li = document.createElement("li");
      li.className = "store-card bg-white text-[#221911] rounded-xl shadow-md p-4 border border-neutral-200 hover:shadow-lg transition-shadow duration-300 cursor-pointer";

      const name = displayOrNA(store["Store Name"]);
      const city = displayOrNA(store.City);
      const address = displayOrNA(store.Address);
      const rating = displayOrNA(store.Rating);
      const hours = displayOrNA(store.Hours);
      const phone = displayOrNA(store.Phone);
      const website = isValidUrl(store.Website) ? `<a href="${store.Website}" target="_blank" class="text-red-600 hover:underline">Website</a>` : "N/A";
      const facebook = isValidUrl(store["Social Media Links"]) ? `<a href="${store["Social Media Links"]}" target="_blank" class="text-red-600 hover:underline">Social</a>` : "N/A";
      const services = displayOrNA(store.Services);
      const sports = displayOrNA(store["Sports/TCG Available"]);
      const distance = getDistanceFromUser(store.lat, store.lng);
      const distDisplay = distance !== null ? `<p class="text-sm">📏 ${distance.toFixed(1)} km away</p>` : "";

      li.innerHTML = `
        <h4 class="font-bold text-lg">${name}</h4>
        <p class="text-sm">📍 ${city}</p>
        <p class="text-sm">🏠 ${address}</p>
        <p class="text-sm">⭐ ${rating}</p>
        <p class="text-sm">⏰ ${hours}</p>
        ${distDisplay}
        <div class="store-extra hidden pt-2 text-sm space-y-1">
          <p>📞 ${phone}</p>
          <p>${website} | ${facebook}</p>
          <p>🛠️ ${services}</p>
          <p>🏒 ${sports}</p>
        </div>
      `;

      const ldScript = document.createElement('script');
      ldScript.type = 'application/ld+json';
      ldScript.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name,
        address,
        telephone: phone,
        ...(isValidUrl(store.Website) && { url: store.Website })
      });
      li.appendChild(ldScript);

      li.addEventListener("click", () => {
        const extra = li.querySelector(".store-extra");
        if (extra) extra.classList.toggle("hidden");
        panToMarker(index);
      });

      li.addEventListener("mouseenter", () => highlightMarkerByIndex(index));
      li.addEventListener("mouseleave", () => clearMarkerHighlights());

      ul.appendChild(li);
    });

    section.appendChild(ul);
    container.appendChild(section);
  });
}

function handleMarkerClick(index) {
  const cards = document.querySelectorAll(".store-card");
  const card = cards[index];
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("ring", "ring-orange-400");
    setTimeout(() => card.classList.remove("ring", "ring-orange-400"), 2000);
  }
}

















