// loadStores.js
export async function loadStoresFromSheet() {
  const response = await fetch(
    "https://opensheet.elk.sh/14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I/Stores"
  );
  const data = await response.json();
  return data.map((row) => ({
    name: row["Store Name"],
    city: row["City"],
    address: row["Address"],
    phone: row["Phone"],
    rating: row["Rating"],
    website: row["Website"],
    hours: row["Hours"],
    facebook: row["Facebook"],
    lat: row["Latitude"],
    lng: row["Longitude"],
  }));
}
