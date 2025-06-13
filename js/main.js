// main.js (updated version with no radius filtering)
import { initMap, clearMarkers, searchLocation, highlightMarkerByIndex, clearMarkerHighlights, getMapInstance, panToMarker } from "./map.js";
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
    mapInstance = initMap(allStores, handleMarkerClick);

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const match = allStores.find((store) => {
          return (
            store["Store Name"]?.toLowerCase().includes(query) ||
            store.City?.toLowerCase().includes(query) ||
            store.Address?.toLowerCase().includes(query) ||
            store["Postal Code"]?.toLowerCase().includes(query)
          );
        });

        renderStoreCards(allStores);
        clearMarkers();
        initMap(allStores, handleMarkerClick);

        if (match) {
          const index = allStores.indexOf(match);
          panToMarker(index);
          highlightMarkerByIndex(index);
        }
      });
    }
  } catch (error) {
    console.error("💥 Failed to initialize app:", error);
  }
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

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name,
        address: {
          "@type": "PostalAddress",
          streetAddress: address,
          addressLocality: city,
          addressRegion: prov,
          addressCountry: "CA"
        },
        telephone: phone,
        url: isValidUrl(store.Website) ? store.Website : undefined,
        geo: {
          "@type": "GeoCoordinates",
          latitude: store.lat,
          longitude: store.lng
        }
      };
      const schema = document.createElement("script");
      schema.type = "application/ld+json";
      schema.textContent = JSON.stringify(structuredData);
      li.appendChild(schema);

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














