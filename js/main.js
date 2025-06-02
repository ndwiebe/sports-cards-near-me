
// main.js
import { initMap, clearMarkers } from "./map.js";
import { loadStoresFromSheet } from "./loadStores.js";

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
      "bg-white rounded-xl shadow p-4 border border-neutral-200 flex flex-col gap-1";

    const name = store.name || "Unnamed Store";
    const city = store.city || "Unknown City";
    const address = store.address || "N/A";
    const phone = store.phone || "N/A";
    const rating = store.rating || "N/A";
    const website = store.website ? `<a href='${store.website}' class='text-blue-600 underline' target='_blank'>Visit Site</a>` : "N/A";
    const hours = store.hours || "N/A";
    const facebook = store.facebook ? `<a href='${store.facebook}' class='text-blue-600 underline' target='_blank'>Facebook</a>` : "N/A";

    card.innerHTML = `
      <h3 class="text-lg font-bold text-[#1c140d]">${name}</h3>
      <p class="text-sm text-[#5e4735]">${city}</p>
      <p class="text-sm text-[#5e4735]">${address}</p>
      <p class="text-sm text-[#5e4735]">📞 ${phone}</p>
      <p class="text-sm text-[#5e4735]">⭐ Rating: ${rating}</p>
      <div class="text-sm text-[#5e4735] flex gap-2">
        ${website}
        ${facebook}
      </div>
      <p class="text-sm text-[#5e4735]">⏰ ${hours}</p>
    `;

    list.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
