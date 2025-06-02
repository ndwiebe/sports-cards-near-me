
let map;
let markers = [];

export function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

export function initMap(storeData) {
  const mapElement = document.getElementById("map");
  if (!mapElement) return;

  map = new google.maps.Map(mapElement, {
    center: { lat: 53.5444, lng: -113.4909 },
    zoom: 6,
  });

  const bounds = new google.maps.LatLngBounds();
  const geocoder = new google.maps.Geocoder();

  storeData.forEach((store) => {
    if (!store.address || store.address === "N/A") return;

    geocoder.geocode({ address: store.address }, (results, status) => {
      if (status === "OK" && results[0]) {
        const position = results[0].geometry.location;

        const marker = new google.maps.Marker({
          map,
          position,
          title: store.name,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<strong>${store.name}</strong><br>${store.address || ""}`,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });

        markers.push(marker);
        bounds.extend(position);
        map.fitBounds(bounds);
      } else {
        console.warn("Geocode failed for:", store.name, status);
      }
    });
  });
}
