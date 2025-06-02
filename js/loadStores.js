export async function loadStoresFromSheet() {
  const sheetId = '14ZIoX33de58g7GOBojG_Xr-P7goPJhE1S-hDylXUi3I';
  const gid = '1588938698';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

  const response = await fetch(url);
  const text = await response.text();
  const rows = text.trim().split('\n').slice(1);

  return rows.map(row => {
    const [name, address, city, province, postal, phone, lat, lng] = row.split(',');
    return {
      name,
      address,
      city,
      province,
      postal,
      phone,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    };
  });
}