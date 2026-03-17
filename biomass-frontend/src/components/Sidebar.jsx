import React, { useState, useEffect } from "react";
import "./Sidebar.css"; 
import * as XLSX from 'xlsx';

export default function Sidebar({ filters, setFilters }) {
  // 1. UPDATE THESE TWO VALUES
  const KOBO_USERNAME = process.env.REACT_APP_KOBO_USERNAME;
const ASSET_UID = process.env.REACT_APP_ASSET_UID;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const states = ["Andhra Pradesh", "Gujarat", "Assam", "Karnataka", "Tamil Nadu"];
  const biomassTypes = ["Maize", "Rice", "Juliflora", "Bamboo", "Cotton"];
  const industries = ["Steel Plants", "Other Industries", "Rice Mill"];
  const boundaryOptions = ["District Boundary", "Forest Boundary", "Districts", "Taluka", "Village", "Block"];

  const districtsData = {
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari"],
    "Assam": ["Baksa", "Barpeta"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
    "Karnataka": ["Bengaluru", "Mysuru"],
    "Tamil Nadu": ["Chennai", "Coimbatore"]
  };

  const [districts, setDistricts] = useState([]);
  const [csvStatus, setCsvStatus] = useState("");

  const handle = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (filters.state && districtsData[filters.state]) {
      setDistricts(districtsData[filters.state]);
      handle("district", "");
    } else {
      setDistricts([]);
      handle("district", "");
    }
  }, [filters.state]);

  const getV = (obj, key) => {
    if (!obj) return "";
    if (obj[key] !== undefined) return obj[key];
    const lowerKey = key.toLowerCase().replace(/ /g, "_");
    const found = Object.keys(obj).find(k => 
      k.toLowerCase() === key.toLowerCase() || 
      k.toLowerCase().replace(/ /g, "_") === lowerKey
    );
    return found ? obj[found] : "";
  };

  /**
   * Logic to create a clickable Excel Hyperlink using the download_url from MongoDB
   */
  const createKoboV2Hyperlink = (photoName, submissionId, attachments) => {
    if (!photoName) return "";

    // Look for the attachment where the filename matches or the media_file_basename matches
    const fileMeta = attachments.find(a => 
      a.media_file_basename === photoName || 
      (a.filename && a.filename.endsWith(photoName))
    );
    
    // If we have a direct download_url from your MongoDB, use it
    if (fileMeta && fileMeta.download_url) {
      return {
        t: 's', // type: string
        v: "View Image", // display text
        l: { Target: fileMeta.download_url, Tooltip: `Open photo: ${photoName}` } 
      };
    }
    
    return photoName; // Fallback if no metadata found
  };

  const handleDownloadKoboData = async () => {
    setCsvStatus("Building Excel with 10+ images...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/submissions`);
      const data = await response.json();
      const submissions = Array.isArray(data) ? data : (data.data || []);

      if (submissions.length === 0) {
        setCsvStatus("No data found.");
        return;
      }

      const mainSheet = [];
      const imageSheet = [];

      submissions.forEach((item, idx) => {
        const p = item.payload || item;
        const sIndex = idx + 1;
        const sId = p._id || item._id; 
        const attachments = p._attachments || [];

        // 1. MAP ALL SURVEY INFORMATION (Main Sheet)
        mainSheet.push({
          "Name": getV(p, "Name"),
          "Ph no": getV(p, "Ph_no") || getV(p, "Ph no"),
          "DATE OF SURVEY": getV(p, "DATE_OF_SURVEY") || getV(p, "DATE OF SURVEY"),
          "TIME OF SURVEY": getV(p, "TIME_OF_SURVEY") || getV(p, "TIME OF SURVEY"),
          "GPS COORDINATES": getV(p, "GPS_COORDINATES") || getV(p, "GPS COORDINATES"),
          "STATE": getV(p, "STATE"),
          "DISTRICT": getV(p, "DISTRICT"),
          "TALUKA": getV(p, "TALUKA"),
          "VILLAGE": getV(p, "VILLAGES") || getV(p, "VILLAGE"),
          "GRID ID": getV(p, "GRID_ID") || getV(p, "GRID ID"),
          "GCP ID": getV(p, "GCP_ID") || getV(p, "GCP ID"),
          "JULIFLORA COUNT": getV(p, "JULIFLORA_COUNT") || getV(p, "JULIFLORA COUNT"),
          "OTHER SPECIES COUNT": getV(p, "OTHER_SPECIES_COUNT") || getV(p, "OTHER SPECIES COUNT"),
          "JULIFLORA DENSITY": getV(p, "JULIFLORA_DENSITY") || getV(p, "JULIFLORA DENSITY"),
          "REMARKS": getV(p, "REMARKS"),
          "_id": sId,
          "Kobo_Username": KOBO_USERNAME,
          "_index": sIndex
        });

        // 2. MAP ALL IMAGES IN REPEAT GROUP (Second Sheet)
        const repeatGroup = p.group_mm89q62 || p.Group || [];
        if (Array.isArray(repeatGroup)) {
          repeatGroup.forEach((entry, gIdx) => {
            const photoName = entry["group_mm89q62/PLANT_PHOTO"] || entry["PLANT_PHOTO"] || getV(entry, "PLANT PHOTO");
            
            if (photoName) {
              imageSheet.push({
                "Group/PLANT PHOTO (Click to Open)": createKoboV2Hyperlink(photoName, sId, attachments),
                "Filename": photoName,
                "_parent_index": sIndex,
                "_submission_id": sId,
                "Username": KOBO_USERNAME
              });
            }
          });
        }
      });

      // 3. GENERATE WORKBOOK
      const wb = XLSX.utils.book_new();
      
      const wsMain = XLSX.utils.json_to_sheet(mainSheet);
      const wsImages = XLSX.utils.json_to_sheet(imageSheet);

      XLSX.utils.book_append_sheet(wb, wsMain, "Survey_Data");
      if (imageSheet.length > 0) {
        XLSX.utils.book_append_sheet(wb, wsImages, "Images_Repeat_Group");
      }

      // 4. DOWNLOAD
      XLSX.writeFile(wb, `Biomass_Full_Report_${new Date().getTime()}.xlsx`);
      setCsvStatus("Download Complete!");

    } catch (e) {
      console.error(e);
      setCsvStatus("Error during export.");
    }
  };

  return (
    <header className="sidebar-root">
      <div className="navbar">
        <div className="brand"><h2>Dashboard</h2></div>
        <div style={{ color: "gray", fontSize: ".9rem" }}>India · Biomass Map</div>
      </div>
      <div className="filters-row">
        <div className="filter"><label>Biomass Type</label>
          <select value={filters.biomass} onChange={e => handle("biomass", e.target.value)}>
            <option value="">Select</option>
            {biomassTypes.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="filter"><label>State</label>
          <select value={filters.state} onChange={e => handle("state", e.target.value)}>
            <option value="">Select</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter"><label>District</label>
          <select value={filters.district} disabled={!districts.length} onChange={e => handle("district", e.target.value)}>
            <option value="">Select</option>
            {districts.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter"><label>Industries</label>
          <select value={filters.industry} onChange={e => handle("industry", e.target.value)}>
            <option value="">Select</option>
            {industries.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div className="filter"><label>Boundaries</label>
          <select value={filters.boundaries || ""} onChange={e => handle("boundaries", e.target.value)}>
            <option value="">Select</option>
            {boundaryOptions.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div className="field-collection-center">
        <label>Field Collection</label>
        <button onClick={() => window.open("/form", "_blank")}>Open Juliflora Form</button>
        <button onClick={handleDownloadKoboData}>Download Submissions</button>
        {csvStatus && <p className="csv-status">{csvStatus}</p>}
      </div>
    </header>
  );
}