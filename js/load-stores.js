// js/load-stores.js

// === Configuration ===
const DATA_URL = 'data/alberta_card_store_directory_combined.json';

// === Utility: Fetch Store Data ===
async function fetchStores() {
  const res = await fetch(DATA_URL);
  return await res.json();
}

// === Utility: Pick Featured Store (changes weekly) ===
function getWeeklyFeaturedStore(stores) {
  const weekNumber = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24 * 7));
  return stores[weekNumber % stores.length];
}

// === Render: Featured Store of the Week ===
function renderFeaturedStore(store) {
  const html = `
    <div class="flex items-stretch justify-between gap-4 rounded-xl">
      <div class="flex flex-[2_2_0px] flex-col gap-4">
        <div class="flex flex-col gap-1">
          <p class="text-[#9c6f49] text-sm font-normal leading-normal">Featured</p>
          <p class="text-[#1c140d] text-base font-bold leading-tight">${store.name}</p>
          <p class="text-[#9c6f49] text-sm font-normal leading-normal">${store.city || ''}, ${store.province || 'AB'}</p>
        </div>
        <a href="${store.website || '#'}" target="_blank">
          <button class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-8 px-4 flex-row-reverse bg-[#f4ede7] text-[#1c140d] text-sm font-medium leading-normal w-fit">
            <span class="truncate">View Store</span>
          </button>
        </a>
      </div>
      <div class="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl flex-1" style='background-image: url("${store.image || 'https://via.placeholder.com/300x200?text=Card+Shop'}");'></div>
    </div>
  `;
  document.getElementById('featured-store').innerHTML = html;
}

// === Render: Top Rated Stores ===
function renderTopRated(stores) {
  const top = stores.slice(0, 5);
  const html = top.map(store => `
    <div class="flex h-full flex-1 flex-col gap-4 rounded-lg min-w-40">
      <div class="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-xl flex flex-col" style='background-image: url("${store.image || 'https://via.placeholder.com/200'}");'></div>
      <div>
        <p class="text-[#1c140d] text-base font-medium leading-normal">${store.name}</p>
        <p class="text-[#9c6f49] text-sm font-normal leading-normal">${store.rating || '4.5'} • ${store.reviews || '10'} reviews</p>
      </div>
    </div>
  `).join('');
  document.getElementById('top-rated-stores').innerHTML = html;
}

// === Render: Region Cards ===
function renderRegions(stores) {
  const cities = [...new Set(stores.map(s => s.city).filter(Boolean))];
  const html = cities.map(city => `
    <div class="flex flex-1 gap-3 rounded-lg border border-[#e8dace] bg-[#fcfaf8] p-4 items-center">
      <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg w-10 shrink-0" style='background-image: url("https://via.placeholder.com/60")'></div>
      <h2 class="text-[#1c140d] text-base font-bold leading-tight">${city}</h2>
    </div>
  `).join('');
  document.getElementById('region-cards').innerHTML = html;
}

// === Render: Store Filters & List ===
function renderCityFilters(stores) {
  const cities = [...new Set(stores.map(s => s.city).filter(Boolean))];
  const filters = cities.map(city => `<button class="px-3 py-1 rounded-lg bg-[#f4ede7] text-sm" onclick="filterByCity('${city}')">${city}</button>`).join('');
  document.getElementById('city-filters').innerHTML = filters;
}

function filterByCity(city) {
  fetchStores().then(stores => {
    const filtered = stores.filter(s => s.city === city);
    renderStoreList(filtered);
  });
}

function renderStoreList(stores) {
  const html = stores.map(store => `
    <div class="border border-[#e8dace] p-4 rounded-lg">
      <h3 class="text-[#1c140d] text-base font-bold">${store.name}</h3>
      <p class="text-[#9c6f49] text-sm">${store.city || ''}, ${store.province || 'AB'}</p>
      ${store.website ? `<a href="${store.website}" target="_blank" class="text-sm text-blue-600">Visit Website</a>` : ''}
    </div>
  `).join('');
  document.getElementById('store-list').innerHTML = html;
}

// === On Load ===
fetchStores().then(stores => {
  const featured = getWeeklyFeaturedStore(stores);
  renderFeaturedStore(featured);
  renderTopRated(stores);
  renderRegions(stores);
  renderCityFilters(stores);
  renderStoreList(stores);
});

}

document.addEventListener('DOMContentLoaded', loadStores);
