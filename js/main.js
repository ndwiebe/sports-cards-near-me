// main.js with hover-to-highlight map markers
import { initMap, clearMarkers, searchLocation, highlightMarkerByIndex, clearMarkerHighlights } from "./map.js";
import { loadSheetData } from "./loadStores.js";
import { displayOrNA, isValidUrl } from "./utils.js";

const SHEET_ID = "14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I";
const GID = "1588938698";

let allStores = [];
let mapInstance = null;
window.searchLocation = searchLocation;

export async function initializeApp() {
  try {
    allStores = await loadSheetData({ sheetId: SHEET_ID, gid: GID });
    if (!Array.isArray(allStores) || allStores.length === 0) {
      document.getElementById("nearby-stores-list").innerHTML = `<li class="text-red-600">⚠️ No store data found.</li>`;
      return;
    }

    renderStoreCards(allStores);
    mapInstance = initMap(allStores);

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allStores.filter((store) => {
          return (
            store["Store Name"]?.toLowerCase().includes(query) ||
            store.City?.toLowerCase().includes(query) ||
            store.Address?.toLowerCase().includes(query) ||
            store["Postal Code"]?.toLowerCase().includes(query)
          );
        });

        renderStoreCards(filtered);
        clearMarkers();
        initMap(filtered);

        const match = filtered.find((s) => s.Address?.match(/\b(AB|BC|MB|NB|NL|NS|ON|PE|QC|SK)\b/i));
        if (match) {
          const province = match.Address.match(/\b(AB|BC|MB|NB|NL|NS|ON|PE|QC|SK)\b/i)?.[0]?.toUpperCase();
          if (province) {
            const section = document.getElementById(province);
            if (section) {
              setTimeout(() => section.scrollIntoView({ behavior: "smooth" }), 200);
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("💥 Failed to initialize app:", error);
  }
}

function renderStoreCards(stores) {
  const container = document.getElementById("nearby-stores-list");
  if (!container) return;
  container.innerHTML = "";

  const provinces = {};
  for (const store of stores) {
    const province = store["Address"]?.match(/\b(AB|BC|MB|NB|NL|NS|ON|PE|QC|SK)\b/i)?.[0]?.toUpperCase() || "Other";
    if (!provinces[province]) provinces[province] = [];
    provinces[province].push(store);
  }

  Object.entries(provinces).forEach(([prov, stores]) => {
    const section = document.createElement("section");
    section.className = "mb-6";
    section.innerHTML = `<h3 id="${prov}" class="text-2xl font-bold mb-4">${prov}</h3>`;

    const ul = document.createElement("ul");
    ul.className = "space-y-4";

    stores.forEach((store, index) => {
      const li = document.createElement("li");
      li.className =
        "store-card bg-white text-[#221911] rounded-xl shadow-md p-4 border border-neutral-200 hover:shadow-lg transition-shadow duration-300 cursor-pointer";

      const name = displayOrNA(store["Store Name"]);
      const city = displayOrNA(store.City);
      const address = displayOrNA(store.Address);
      const rating = displayOrNA(store.Rating);
      const hours = displayOrNA(store.Hours);
      const phone = displayOrNA(store.Phone);
      const website = isValidUrl(store.Website)
        ? `<a href="${store.Website}" target="_blank" class="text-red-600 hover:underline">Website</a>`
        : "N/A";
      const facebook = isValidUrl(store["Social Media Links"])
        ? `<a href="${store["Social Media Links"]}" target="_blank" class="text-red-600 hover:underline">Social</a>`
        : "N/A";
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
      });

      li.addEventListener("mouseenter", () => highlightMarkerByIndex(index));
      li.addEventListener("mouseleave", () => clearMarkerHighlights());

      ul.appendChild(li);
    });

    section.appendChild(ul);
    container.appendChild(section);
  });
}







