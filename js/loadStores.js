// loadStores.js

const DEFAULT_HEADERS = [
  "Store Name", "City", "Address", "Phone", "Rating",
  "Website", "Hours", "Facebook", "lat", "lng"
];

/**
 * Load data from a public Google Sheet using GViz endpoint.
 * @param {Object} options
 * @param {string} options.sheetId - The Sheet ID from the Google Sheet URL.
 * @param {string} options.gid - The tab's GID number from the URL.
 * @param {string[]} [options.fieldMap] - Optional custom field mapping by column index.
 * @returns {Promise<Object[]>} Parsed store data.
 */
export async function loadSheetData({ sheetId, gid, fieldMap = DEFAULT_HEADERS }) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status}`);
    }

    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows;

    const stores = rows.map((row) => {
      const obj = {};
      fieldMap.forEach((key, i) => {
        const val = row.c[i]?.v;
        obj[key] =
          typeof val === "string" ? val.trim() :
          (key === "lat" || key === "lng") ? parseFloat(val) || null :
          val ?? "";
      });
      return obj;
    });

    // Only keep stores with valid coordinates
    return stores.filter((row) => typeof row.lat === "number" && typeof row.lng === "number");
    
  } catch (error) {
    console.error("Error loading sheet data:", error);
    return [];
  }
}

/**
 * Submit a form to a Google Form endpoint.
 * @param {string} formUrl - Google Form POST URL (not the public link).
 * @param {Object} formData - Key-value pairs matching entry IDs in the Google Form.
 * @returns {Promise<boolean>} Whether the submission succeeded.
 */
export async function submitStoreForm(formUrl, formData) {
  try {
    const formBody = new URLSearchParams();
    for (const key in formData) {
      formBody.append(key, formData[key]);
    }

    const response = await fetch(formUrl, {
      method: "POST",
      mode: "no-cors", // Required for Google Form
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    return true; // Assume success since no-cors doesn’t provide a response
  } catch (err) {
    console.error("Error submitting form:", err);
    return false;
  }
}
