let markers = [];
let map; // Make map accessible outside initMap
let geocoder; // Declare geocoder globally
let searchMarker = null; // Optional: handle repeated searches

export function initMap(stores) {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5, lng: -113.5 },
    zoom: 6,
  });

  geocoder = new google.maps.Geocoder();

  markers = stores.map((store) => {
    return new google.maps.Marker({
      position: { lat: parseFloat(store.lat), lng: parseFloat(store.lng) },
      map,
      title: store["Store Name"] || "Store",
    });
  });

  return map; // ✅ Needed by main.js
}

export function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}

export function searchLocation() {
  const input = document.getElementById("location-input") || document.getElementById("search-input");
  if (!input || !input.value) return;

  geocoder.geocode({ address: input.value }, (results, status) => {
    if (status === "OK" && results[0]) {
      const location = results[0].geometry.location;
      map.setCenter(location);
      map.setZoom(12);

      if (searchMarker) searchMarker.setMap(null);
      searchMarker = new google.maps.Marker({
        map,
        position: location,
        title: input.value,
      });
    } else {
      alert("Location not found: " + status);
    }
  });
}
