
// Load and parse the store CSV
async function loadStores() {
  const response = await fetch('/data/alberta_card_store_directory_combined.csv');
  const csvText = await response.text();

  const rows = csvText.split('\n').slice(1); // Skip header
  const container = document.getElementById('store-list');
  container.innerHTML = '';

  rows.forEach(row => {
    const cols = row.split(',');

    const [
      store_name,
      city,
      address,
      phone,
      rating,
      website,
      hours,
      source,
      facebook
    ] = cols;

    if (!store_name || store_name.toLowerCase().includes('for sale')) return;

    const card = document.createElement('div');
    card.className = 'rounded-xl bg-[#f4ede7] p-4 mb-4 shadow';

    card.innerHTML = `
      <h3 class="text-lg font-bold text-[#1c140d]">${store_name}</h3>
      <p class="text-sm text-[#9c6f49]">${city || ''}</p>
      <p class="text-sm text-[#1c140d]">${address || ''}</p>
      ${phone ? `<p class="text-sm text-[#1c140d]">📞 ${phone}</p>` : ''}
      ${website ? `<p class="text-sm"><a href="${website}" target="_blank" class="text-blue-600 underline">Website</a></p>` : ''}
      ${facebook ? `<p class="text-sm"><a href="${facebook}" target="_blank" class="text-blue-600 underline">Facebook</a></p>` : ''}
    `;

    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', loadStores);
