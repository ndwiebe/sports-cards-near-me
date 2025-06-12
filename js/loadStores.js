// loadStores.js
const DEFAULT_HEADERS = [
  "Store Name", "City", "Address", "Rating", "Hours",
  "Phone", "Website", "Social Media Links", "Services", "Sports/TCG Available",
  "lat", "lng"
];

export async function loadSheetData({ sheetId, gid, fieldMap = DEFAULT_HEADERS }) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch sheet data: ${response.status}`);

    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows;

    return rows.map(row => {
      const obj = {};
      fieldMap.forEach((key, i) => {
        const val = row.c[i]?.v;
        obj[key] =
          typeof val === "string" ? val.trim() :
          (key === "lat" || key === "lng") ? parseFloat(val) || null :
          val ?? "";
      });
      return obj;
    }).filter(row => row.lat !== null && row.lng !== null);
  } catch (error) {
    console.error("Error loading sheet data:", error);
    return [];
  }
}


