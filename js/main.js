// main.js (updated with working filtering for province, city, service, card type)
import { initMap, clearMarkers, highlightMarkerByIndex, clearMarkerHighlights, panToMarker } from "./map.js";
import { loadSheetData } from "./loadStores.js";
import { displayOrNA, isValidUrl } from "./utils.js";

const SHEET_ID = "14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I";
const GID = "1588938698";

let allStores = [];
let mapInstance = null;

window.searchLocation = function () {
  const input = document.getElementById("search-input");
  const query = input?.value.trim().toLowerCase();
  if (!query) return renderStoreCards(allStores);

  const filtered = allStores.filter(store =>
    store["Store Name"]?.toLowerCase().includes(query) ||
    store.City?.toLowerCase().includes(query) ||
    store.Address?.toLowerCase().includes(query) ||
    store["Postal Code"]?.toLowerCase().includes(query) ||
    store.Services?.toLowerCase().includes(query) ||
    store["Sports/TCG Available"]?.toLowerCase().includes(query)
  );

  renderStoreCards(filtered);
  clearMarkers();
  initMap(filtered, handleMarkerClick);

  if (filtered.length > 0) {
    panToMarker(0);
    highlightMarkerByIndex(0);
  }
};

window.initializeApp = async function () {
  try {
    allStores = await loadSheetData({ sheetId: SHEET_ID, gid: GID });
    renderStoreCards(allStores);
    mapInstance = initMap(allStores, handleMarkerClick);

    document.querySelectorAll("nav a[href^='#']").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const province = link.getAttribute("href").replace("#", "").toUpperCase();
        const filtered = allStores.filter(store =>
          store["Address"]?.toUpperCase().includes(province)
        );
        renderStoreCards(filtered);
        clearMarkers();
        initMap(filtered, handleMarkerClick);
        if (filtered.length > 0) {
          panToMarker(0);
        }
      });
    });

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", () => searchLocation());
    }
  } catch (err) {
    console.error("Failed to load app:", err);
  }
};

function renderStoreCards(stores) {
  const container = document.getElementById("nearby-stores-list");
  if (!container) return;
  container.innerHTML = "";

  const group = document.createElement("div");
  group.className = "space-y-6";
  stores.forEach((store, index) => {
    const li = document.createElement("div");
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

    li.innerHTML = `
      <h4 class="font-bold text-lg">${name}</h4>
      <p class="text-sm">📍 ${city}</p>
      <p class="text-sm">🏠 ${address}</p>
      <p class="text-sm">⭐ ${rating}</p>
      <p class="text-sm">⏰ ${hours}</p>
      <div class="store-extra hidden pt-2 text-sm space-y-1">
        <p>📞 ${phone}</p>
        <p>${website} | ${facebook}</p>
        <p>🛠️ ${services}</p>
        <p>🏒 ${sports}</p>
      </div>
    `;

    li.addEventListener("click", () => {
      const extra = li.querySelector(".store-extra");
      if (extra) extra.classList.toggle("hidden");
      panToMarker(index);
    });
    li.addEventListener("mouseenter", () => highlightMarkerByIndex(index));
    li.addEventListener("mouseleave", () => clearMarkerHighlights());

    group.appendChild(li);
  });

  container.appendChild(group);
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
















