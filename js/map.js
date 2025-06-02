// map.js
export function initMap(stores) {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5, lng: -113.5 },
    zoom: 6,
  });

  stores.forEach((store) => {
    new google.maps.Marker({
      position: { lat: parseFloat(store.lat), lng: parseFloat(store.lng) },
      map,
      title: store.name || "Store",
    });
  });
}

export function clearMarkers() {
  // Optionally implemented for dynamic updates
}
