// main.js
import { initMap, clearMarkers } from "./map.js";
import { loadStoresFromSheet } from "./loadStores.js";
import { displayOrNA, isValidUrl } from "./utils.js";

let allStores = [];

async function initializeApp() {
  allStores = await loadStoresFromSheet();
  renderStoreCards(allStores);
  initMap(allStores);

  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allStores.filter((store) => {
      return (
        store.name?.toLowerCase().includes(query) ||
        store.city?.toLowerCase().includes(query) ||
        store.address?.toLowerCase().includes(query)
      );
    });
    renderStoreCards(filtered);
    clearMarkers();
    initMap(filtered);
  });
}

function renderStoreCards(stores) {
  const list = document.getElementById("store-list");
  list.innerHTML = "";

  stores.forEach((store) => {
    const card = document.createElement("div");
    card.className =
      "bg-white rounded-2xl shadow-md p-5 border border-neutral-200 flex flex-col gap-2 hover:shadow-lg transition-shadow duration-300";

    const name = displayOrNA(store.name);
    const city = displayOrNA(store.city);
    const address = displayOrNA(store.address);
    const phone = displayOrNA(store.phone);
    const rating = displayOrNA(store.rating);
    const website = isValidUrl(store.website)
      ? `<a href='${store.website}' class='text-red-600 font-medium hover:underline' target='_blank'>Website</a>`
      : "N/A";
    const hours = displayOrNA(store.hours);
    const facebook = isValidUrl(store.facebook)
      ? `<a href='${store.facebook}' class='text-red-600 font-medium hover:underline' target='_blank'>Facebook</a>`
      : "N/A";

    card.innerHTML = `
      <h3 class="text-lg font-bold text-[#1c140d]">${name}</h3>
      <p class="text-sm text-[#5e4735]">📍 ${city}</p>
      <p class="text-sm text-[#5e4735]">🏠 ${address}</p>
      <p class="text-sm text-[#5e4735]">📞 ${phone}</p>
      <p class="text-sm text-[#5e4735]">⭐ Rating: ${rating}</p>
      <div class="text-sm text-[#5e4735] flex gap-4">
        ${website}
        ${facebook}
      </div>
      <p class="text-sm text-[#5e4735]">⏰ Hours: ${hours}</p>
    `;

    list.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
