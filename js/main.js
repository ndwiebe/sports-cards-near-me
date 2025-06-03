import { initMap, clearMarkers } from "./map.js";
import { loadSheetData } from "./loadStores.js";
import { displayOrNA, isValidUrl } from "./utils.js";

const SHEET_ID = "14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I";
const GID = "1588938698";

let allStores = [];

async function initializeApp() {
  try {
    allStores = await loadSheetData({ sheetId: SHEET_ID, gid: GID });

    if (!Array.isArray(allStores) || allStores.length === 0) {
      console.warn("No store data loaded or sheet is empty.");
      const list = document.getElementById("nearby-stores-list");
      if (list) {
        list.innerHTML = `<li class="text-red-600">⚠️ No store data found. Check your sheet or console for errors.</li>`;
      }
      return;
    }

    console.log("✅ Loaded stores:", allStores);
    renderStoreCards(allStores);
    console.log("First store object:", allStores[0]);
    initMap(allStores);

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allStores.filter((store) => {
          return (
            store["Store Name"]?.toLowerCase().includes(query) ||
            store.City?.toLowerCase().includes(query) ||
            store.Address?.toLowerCase().includes(query)
          );
        });
        renderStoreCards(filtered);
        clearMarkers();
        initMap(filtered);
      });
    } else {
      console.warn("No #search-input element found.");
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
      "bg-white rounded-2xl shadow-md p-4 border border-neutral-200 hover:shadow-lg transition-shadow duration-300";

    const name = displayOrNA(store["Store Name"]);
    const city = displayOrNA(store.City);
    const address = displayOrNA(store.Address);
    const phone = displayOrNA(store.Phone);
    const rating = displayOrNA(store.Rating);
    const hours = displayOrNA(store.Hours);

    const website = isValidUrl(store.Website)
      ? `<a href="${store.Website}" target="_blank" class="text-red-600 hover:underline">Website</a>`
      : "N/A";

    const facebook = isValidUrl(store.Facebook)
      ? `<a href="${store.Facebook}" target="_blank" class="text-red-600 hover:underline">Facebook</a>`
      : "N/A";

    card.innerHTML = `
      <h3 class="font-bold text-lg">${name}</h3>
      <p class="text-sm text-[#5e4735]">📍 ${city}</p>
      <p class="text-sm text-[#5e4735]">🏠 ${address}</p>
      <p class="text-sm text-[#5e4735]">📞 ${phone}</p>
      <p class="text-sm text-[#5e4735]">⭐ Rating: ${rating}</p>
      <p class="text-sm text-[#5e4735]">⏰ Hours: ${hours}</p>
      <div class="text-sm flex gap-4">${website} | ${facebook}</div>
    `;
    list.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
