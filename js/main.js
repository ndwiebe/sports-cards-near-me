// main.js update to support exact service/type matching
// Make sure these keys exactly match your HTML checkbox values

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

      const matchSearch = name.includes(query) || city.includes(query) || address.includes(query) || postal.includes(query);
      const matchServices = selectedServices.every(service => services.includes(service));
      const matchTypes = selectedTypes.every(type => types.includes(type));
      const distance = getDistanceFromUser(store.lat, store.lng);
      const withinRadius = distance === null || distance <= 50;

      return matchSearch && matchServices && matchTypes && withinRadius;
    });

    renderStoreCards(filtered);
    clearMarkers();
    initMap(filtered, handleMarkerClick);
  };

  provinceLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      const provCode = link.getAttribute("href").substring(1).toUpperCase();
      const filtered = allStores.filter(store => store.Address?.includes(provCode));
      renderStoreCards(filtered);
      clearMarkers();
      initMap(filtered, handleMarkerClick);
      const target = document.getElementById("nearby-stores-list");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  searchInput.addEventListener("input", applyFilters);
  [...serviceCheckboxes, ...typeCheckboxes].forEach(cb => cb.addEventListener("change", applyFilters));
}










