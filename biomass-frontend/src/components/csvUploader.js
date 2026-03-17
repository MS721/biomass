import Papa from "papaparse";

function cleanValue(val) {
  if (val === undefined || val === null) return null;
  let v = String(val).trim();
  v = v.replace(/^\{+|"|\}+$/g, "");
  v = v.replace(/[\u0000-\u001F]+/g, "");
  v = v.replace(/,,+/g, ",");
  v = v.replace(/\s+/g, " ");
  return v === "" ? null : v;
}

export async function uploadCSVToSupabase(file) {
  if (!file) return { success: false, message: "No file provided." };

  try {
    const parsed = await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ";", 
        complete: resolve,
        error: reject,
      });
    });

    for (let rawRow of parsed.data) {
      let row = {};
      Object.keys(rawRow).forEach((key) => {
        row[key] = cleanValue(rawRow[key]);
      });

      const num = (v) => (v === null || v === "" ? 0 : Number(v));

      // CRITICAL: Keys must match the double-quoted names in SQL exactly
      const insertRow = {
        filename: file.name,
        "Name": row["Name"],
        "Ph no": row["Ph no"],
        "DATE OF SURVEY": row["DATE OF SURVEY"],
        "TIME OF SURVEY": row["TIME OF SURVEY"],
        "GPS COORDINATES": row["GPS COORDINATES"],
        "STATE": row["STATE"],
        "DISTRICT": row["DISTRICT"],
        "TALUKA": row["TALUKA"],
        "VILLAGE": row["VILLAGES"] || row["VILLAGE"], 
        "GRID ID": row["GRID ID"],
        "GCP ID": row["GCP ID"],
        "JULIFLORA COUNT": num(row["JULIFLORA COUNT"]),
        "OTHER SPECIES COUNT": num(row["OTHER SPECIES COUNT"]),
        "JULIFLORA DENSITY": num(row["JULIFLORA DENSITY"]),
        "PLANT PHOTO": row["PLANT PHOTO"] ? row["PLANT PHOTO"].split(" ") : [],
        "ACKNOWLEDGEMENT": row["ACKNOWLEDGEMENT"],
        data: row, 
      };

      const { error } = await supabase
        .from("biomass_collection")
        .insert(insertRow);

      if (error) throw error;
    }
    return { success: true, message: "Database updated successfully!" };
  } catch (err) {
    console.error("Upload Error:", err.message);
    return { success: false, message: "Upload failed: " + err.message };
  }
}
