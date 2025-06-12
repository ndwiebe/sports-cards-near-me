// main.js
import { initMap, clearMarkers, searchLocation } from "./map.js";
import { loadSheetData } from "./loadStores.js";
import { displayOrNA, isValidUrl } from "./utils.js";

const SHEET_ID = "14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I";
const GID = "1588938698";

let allStores = [];
window.searchLocation = searchLocation;

export async function initializeApp() {
  try {
    allStores = await loadSheetData({ sheetId: SHEET_ID, gid: GID });
    window.allStores = allStores;

    if (!Array.isArray(allStores) || allStores.length === 0) {
      const list = document.getElementById("nearby-stores-list");
      if (list) {
        list.innerHTML = `<li class="text-red-600">⚠️ No store data found. Check your sheet or console for errors.</li>`;
      }
      return;
    }

    renderStoreCards(allStores);
    const map = initMap(allStores);
    window.map = map;

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allStores.filter(store =>
          store["Store Name"]?.toLowerCase().includes(query) ||
          store.City?.toLowerCase().includes(query) ||
          store.Address?.toLowerCase().includes(query)
        );
        renderStoreCards(filtered);
        clearMarkers();
        initMap(filtered);
      });
    }
  } catch (error) {
    console.error("💥 Failed to initialize app:", error);
  }
}

function renderStoreCards(stores) {
  const list = document.getElementById("nearby-stores-list");
  list.innerHTML = "";

  stores.forEach((store) => {
    const card = document.createElement("li");
    card.className =
      "store-card bg-white rounded-2xl shadow-md p-4 border border-neutral-200 hover:shadow-lg transition-shadow duration-300";

    const websiteLink = store.Website && isValidUrl(store.Website)
      ? `<a href="${store.Website}" target="_blank" class="text-red-600 hover:underline">${store.Website}</a>`
      : "N/A";

    const socialLink = store["Social Media Links"] && isValidUrl(store["Social Media Links"])
      ? `<a href="${store["Social Media Links"]}" target="_blank" class="text-red-600 hover:underline">${store["Social Media Links"]}</a>`
      : "N/A";

    card.innerHTML = `
      <h3 class="font-bold text-lg">${displayOrNA(store["Store Name"])}</h3>
      <p class="text-sm text-[#5e4735]">📍 ${displayOrNA(store.City)}</p>
      <p class="text-sm text-[#5e4735]">🏠 ${displayOrNA(store.Address)}</p>
      <p class="text-sm text-[#5e4735]">⭐ Rating: ${displayOrNA(store.Rating)}</p>
      <p class="text-sm text-[#5e4735]">⏰ Hours: ${displayOrNA(store.Hours)}</p>
      <div class="store-extra hidden mt-3 space-y-1">
        <p class="text-sm text-[#5e4735]">📞 Phone: ${displayOrNA(store.Phone)}</p>
        <p class="text-sm text-[#5e4735]">🔗 Website: ${websiteLink}</p>
        <p class="text-sm text-[#5e4735]">💬 Social: ${socialLink}</p>
        <p class="text-sm text-[#5e4735]">🛠️ Services: ${displayOrNA(store.Services)}</p>
        <p class="text-sm text-[#5e4735]">🏈 Sports/TCG: ${displayOrNA(store["Sports/TCG Available"])}</p>
      </div>
    `;

    list.appendChild(card);
  });
}


