// map.js (no changes needed for radius logic, only adding export for distance if needed)
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

    marker._storeId = index; // for matching with card index

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

export function getMapInstance() {
  return map;
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



