// map.js (filtered-compatible version — no radius logic, supports dynamic refresh)
let markers = [];
let map;
let geocoder;
let searchMarker = null;

export function initMap(stores, onMarkerClick = null) {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5, lng: -113.5 },
    zoom: 6,
  });

  geocoder = new google.maps.Geocoder();
  clearMarkers();

  markers = stores.map((store, index) => {
    const marker = new google.maps.Marker({
      position: { lat: parseFloat(store.lat), lng: parseFloat(store.lng) },
      map,
      title: store["Store Name"] || "Store",
    });

    marker._storeId = index;

    if (typeof onMarkerClick === "function") {
      marker.addListener("click", () => {
        onMarkerClick(index);
      });
    }

    return marker;
  });

  return map;
}

export function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}

export function highlightMarkerByIndex(index) {
  markers.forEach((marker, i) => {
    marker.setAnimation(null);
    if (i === index) {
      marker.setAnimation(google.maps.Animation.BOUNCE);
      map.panTo(marker.getPosition());
    }
  });
}

export function clearMarkerHighlights() {
  markers.forEach((marker) => marker.setAnimation(null));
}

export function panToMarker(index) {
  const marker = markers[index];
  if (marker && marker.getPosition) {
    map.panTo(marker.getPosition());
    map.setZoom(14);
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1400);
  }
}

export function getMapInstance() {
  return map;
}






