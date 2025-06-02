// main.js
import { initMap, clearMarkers } from "./map.js";
import { loadSheetData } from "./loadStores.js";
import { displayOrNA, isValidUrl } from "./utils.js";

// Replace with your actual Sheet ID and GID
const SHEET_ID = "14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I";
const GID = "1588938698";

let allStores = [];

async function initializeApp() {
  allStores = await loadSheetData({ sheetId: SHEET_ID, gid: GID });
  renderStoreCards(allStores);
  initMap(allStores);

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = allStores.filter((store) => {
        return (
          store["Store Name"]?.toLowerCase().includes(query) ||
          store["City"]?.toLowerCase().includes(query) ||
          store["Address"]?.toLowerCase().includes(query)
        );
      });
      renderStoreCards(filtered);
      clearMarkers();
      initMap(filtered);
    });
  }
}

function renderStoreCards(stores) {
  const list = document.getElementById("nearby-stores-list");
  if (!list) return;
  list.innerHTML = "";

  stores.forEach((store) => {
    const card = document.createElement("li");
    card.className =
      "bg-white rounded-2xl shadow-sm border border-neutral-200 px-4 py-3 text-sm flex flex-col gap-1 hover:shadow-md transition-shadow duration-200";

    const name = displayOrNA(store["Store Name"]);
    const city = displayOrNA(store["City"]);
    const address = displayOrNA(store["Address"]);
    const phone = displayOrNA(store["Phone"]);
    const rating = displayOrNA(store["Rating"]);
    const website = isValidUrl(store["Website"])
      ? `<a href='${store["Website"]}' target='_blank' class='text-red-600 font-medium hover:underline'>Website</a>`
      : "N/A";
    const hours = displayOrNA(store["Hours"]);
    const facebook = isValidUrl(store["Facebook"])
      ? `<a href='${store["Facebook"]}' target='_blank' class='text-red-600 font-medium hover:underline'>Facebook</a>`
      : "N/A";

    card.innerHTML = `
      <h3 class="text-base font-bold text-[#1c140d]">${name}</h3>
      <p>📍 ${city}</p>
      <p>🏠 ${address}</p>
      <p>📞 ${phone}</p>
      <p>⭐ ${rating}</p>
      <p>⏰ ${hours}</p>
      <div class="flex gap-4">
        ${website}
        ${facebook}
      </div>
    `;

    list.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
