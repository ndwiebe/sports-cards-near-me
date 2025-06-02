export function initMapWithStores(stores) {
  const map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 53.5, lng: -113.5 },
    zoom: 6,
  });

  const storeList = document.getElementById('nearby-stores-list');
  storeList.innerHTML = '';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        map.setCenter(userPos);
        map.setZoom(10);

        new google.maps.Marker({
          position: userPos,
          map,
          title: 'You are here',
          icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        });

        const sortedStores = stores
          .map(store => ({
            ...store,
            distance: getDistance(userPos, { lat: store.lat, lng: store.lng }),
          }))
          .sort((a, b) => a.distance - b.distance);

        renderMarkersAndList(map, sortedStores);
      },
      error => {
        console.warn('Geolocation error:', error);
        renderMarkersAndList(map, stores);
      }
    );
  } else {
    renderMarkersAndList(map, stores);
  }
}

function renderMarkersAndList(map, stores) {
  const storeList = document.getElementById('nearby-stores-list');
  stores.forEach(store => {
    const { lat, lng, name, address, city, province, postal } = store;

    new google.maps.Marker({
      position: { lat, lng },
      map,
      title: name,
    });

    const li = document.createElement('li');
    li.className = 'border p-2 rounded bg-[#f4ede7]';
    li.innerHTML = `<strong>${name}</strong><br>${address}, ${city}, ${province} ${postal}`;
    storeList.appendChild(li);
  });
}

function getDistance(p1, p2) {
  const toRad = deg => deg * (Math.PI / 180);
  const R = 6371;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) *
      Math.cos(toRad(p2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
