let markers = [];

export function initMap(stores) {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5, lng: -113.5 },
    zoom: 6,
  });

  markers = stores.map((store) => {
    return new google.maps.Marker({
      position: { lat: parseFloat(store.lat), lng: parseFloat(store.lng) },
      map,
      title: store["Store Name"] || "Store",
    });
  });
}

export function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}
