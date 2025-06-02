import { calculateDistance } from './utils.js';

export function initMap(stores) {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 53.5, lng: -113.5 },
    zoom: 6,
  });
  const list = document.getElementById("nearby-stores-list");

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const userLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
      new google.maps.Marker({
        position: userLoc,
        map,
        title: "You are here",
        icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      });

      stores.forEach(store => {
        store.distance = calculateDistance(userLoc.lat, userLoc.lng, store.lat, store.lng);
      });

      stores.sort((a, b) => a.distance - b.distance);

      stores.forEach(store => {
        new google.maps.Marker({
          position: { lat: store.lat, lng: store.lng },
          map,
          title: store.name,
        });

        const li = document.createElement("li");
        li.className = "p-3 border-b cursor-pointer hover:bg-[#f9f9f9]";
        li.innerHTML = `<strong class='block text-base'>${store.name}</strong>
                        <span class='text-sm'>${store.address}</span><br>
                        <span class='text-xs text-gray-500'>${store.distance.toFixed(1)} km away</span>`;
        list.appendChild(li);
      });
    });
  }
}