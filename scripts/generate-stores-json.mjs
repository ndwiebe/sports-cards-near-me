import { writeFile, readFile } from 'fs/promises';

const SHEET_ID = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
const GID = '1588938698';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed with ${res.status}`);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  const rows = json.table.rows || [];
  const data = rows
    .map(row => ({
      "Store Name": row.c[0]?.v?.trim() || "",
      "City": row.c[1]?.v?.trim() || "",
      "Address": row.c[2]?.v?.trim() || "",
      "Rating": row.c[3]?.v ?? "",
      "Hours": row.c[4]?.v ?? "",
      "Phone": row.c[5]?.v ?? "",
      "Website": row.c[6]?.v ?? "",
      "Social Media Links": row.c[7]?.v ?? "",
      "Services": row.c[8]?.v ?? "",
      "Sports/TCG Available": row.c[9]?.v ?? "",
      "lat": parseFloat(row.c[10]?.v) || null,
      "lng": parseFloat(row.c[11]?.v) || null,
    }))
    .filter(r => r.lat !== null && r.lng !== null);
  await writeFile('data/stores.json', JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.length} stores to data/stores.json`);
} catch (err) {
  console.warn(
    'Could not fetch store data from Google Sheets; using local sample data instead:',
    err.message
  );
  try {
    const fallback = JSON.parse(await readFile('data/sample-stores.json', 'utf8'));
    await writeFile('data/stores.json', JSON.stringify(fallback, null, 2));
    console.log(`Wrote ${fallback.length} sample stores to data/stores.json`);
  } catch (fallbackErr) {
    console.error('Failed to load fallback data:', fallbackErr.message);
    await writeFile('data/stores.json', '[]');
  }
}
