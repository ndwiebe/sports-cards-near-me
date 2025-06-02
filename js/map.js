// map.js

let markers = [];
let map;

export function initMap(stores) {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5, lng: -113.5 },
    zoom: 6,
  });

  markers = stores.map((store) => {
    const lat = parseFloat(store.lat);
    const lng = parseFloat(store.lng);

    if (isNaN(lat) || isNaN(lng)) return null;

    return new google.maps.Marker({
      position: { lat, lng },
      map,
      title: store["Store Name"] || "Store",
    });
  }).filter(Boolean); // Remove nulls
}

export function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}
