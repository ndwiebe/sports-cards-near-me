// loadStores.js

const SHEET_ID = "14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I";
const SHEET_GID = "1588938698";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}`;

export async function loadStoresFromSheet() {
  const response = await fetch(SHEET_URL);
  const text = await response.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  const rows = json.table.rows;

  return rows.map((row) => {
    return {
      name: row.c[0]?.v || "",
      city: row.c[1]?.v || "",
      address: row.c[2]?.v || "",
      phone: row.c[3]?.v || "",
      rating: row.c[4]?.v || "",
      website: row.c[5]?.v || "",
      hours: row.c[6]?.v || "",
      facebook: row.c[7]?.v || "",
      lat: parseFloat(row.c[8]?.v) || null,
      lng: parseFloat(row.c[9]?.v) || null,
    };
  });
}
