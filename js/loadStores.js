// loadStores.js (fetch pre-rendered JSON data)

export async function loadStoreData() {
  try {
    const response = await fetch('/data/stores.json');
    if (!response.ok) throw new Error(`Failed to load store data: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Store data empty');
    return data;
  } catch (error) {
    console.error('Error loading store data:', error);
    try {
      const fallback = await fetch('/data/sample-stores.json');
      if (!fallback.ok) throw new Error(`Failed to load fallback store data: ${fallback.status}`);
      return await fallback.json();
    } catch (fallbackError) {
      console.error('Error loading fallback store data:', fallbackError);
      return [];
    }
  }
}

