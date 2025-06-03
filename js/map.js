let markers = [];
let map; // Make map accessible outside initMap
let geocoder; // Declare geocoder globally

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
}

export function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}

// 🔍 Add this to enable search by city/postal code
export function searchLocation() {
  const input = document.getElementById("location-input").value;
  if (!input) return;

  geocoder.geocode({ address: input }, (results, status) => {
    if (status === "OK" && results[0]) {
      const location = results[0].geometry.location;
      map.setCenter(location);
      map.setZoom(12);
      new google.maps.Marker({
        map,
        position: location,
        title: input,
      });
    } else {
      alert("Location not found: " + status);
    }
  });
}
