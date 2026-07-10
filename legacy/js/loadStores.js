// loadStores.js (fetch pre-rendered JSON data)

export async function loadStoreData() {
  try {
    const response = await fetch('/data/stores.json');
    if (!response.ok) throw new Error(`Failed to load store data: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error loading store data:', error);
    return [];
  }
}

