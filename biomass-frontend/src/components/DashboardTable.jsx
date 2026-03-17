import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import "./DashboardTable.css";

// CSV URLs for different talukas
const CSV_URLS = {
  "Bhuj": "https://docs.google.com/spreadsheets/d/1KtLDFUhL_lqKL4PEWS7Bli5GQ4eFQWbWKdM1x4Jxhss/export?format=csv&gid=0",
  "Nakhatrana": "https://docs.google.com/spreadsheets/d/1G_XtwHMD2c6LPNKw9_Wbe0MorPuQ4ODdwCBuH8LGGxA/export?format=csv&gid=0"
};

// District -> Taluka mapping
const DISTRICT_TALUKA_MAP = {
  "Kutch": ["Bhuj", "Nakhatrana"]
};

export default function DashboardTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states - ORDER: District first, then Taluka
  const [districtFilter, setDistrictFilter] = useState(""); // Default to "All Districts"
  const [talukaFilter, setTalukaFilter] = useState(""); // Selected taluka
  const [searchTerm, setSearchTerm] = useState("");
  const [quantityFilter, setQuantityFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [densityFilter, setDensityFilter] = useState("");
  const [biomassRangeFilter, setBiomassRangeFilter] = useState("");
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Available talukas based on selected district
  const availableTalukas = useMemo(() => {
    if (!districtFilter) {
      // If "All Districts" selected, show all talukas
      return Object.keys(CSV_URLS);
    }
    return DISTRICT_TALUKA_MAP[districtFilter] || [];
  }, [districtFilter]);

  // Reset taluka when district changes
  useEffect(() => {
    if (districtFilter && !availableTalukas.includes(talukaFilter)) {
      setTalukaFilter("");
    }
  }, [districtFilter, availableTalukas, talukaFilter]);

  // Handle manual CSV file upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.warn("CSV parsing warnings:", results.errors);
        }
        if (results.data && results.data.length > 0) {
          setData(results.data);
          setLoading(false);
        } else {
          setError("CSV file appears to be empty or has no valid data rows");
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`CSV parsing error: ${err.message}`);
        setLoading(false);
      },
    });
  };

  // Helper function to fetch CSV from a URL
  const fetchCSV = async (url) => {
    const urls = [
      url,
      url.replace('/export?format=csv', '/gviz/tq?tqx=out:csv'),
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];
    
    let csvText = null;
    let lastError = null;
    
    // Try each URL until one works
    for (const fetchUrl of urls) {
      try {
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv',
          },
          mode: 'cors',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        csvText = await response.text();
        
        // Check if we got valid CSV (not an HTML error page)
        if (csvText && csvText.trim() && !csvText.trim().startsWith('<!')) {
          return csvText; // Success!
        } else {
          throw new Error('Received invalid CSV data');
        }
      } catch (err) {
        lastError = err;
        console.warn(`Failed to fetch from ${fetchUrl}:`, err.message);
        continue; // Try next URL
      }
    }
    
    throw lastError || new Error("All fetch attempts failed");
  };

  // Parse CSV text
  const parseCSV = (csvText) => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.warn("CSV parsing warnings:", results.errors);
          }
          resolve(results.data || []);
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  };

  // Fetch and parse CSV data based on selected district/taluka
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine which talukas to load data from
        let talukasToLoad = [];
        
        if (!districtFilter || districtFilter === "") {
          // If "All Districts" selected, load all talukas from all available CSV sources
          talukasToLoad = Object.keys(CSV_URLS);
        } else if (!talukaFilter || talukaFilter === "") {
          // If district selected but "All Talukas" selected, load all talukas for that district
          talukasToLoad = DISTRICT_TALUKA_MAP[districtFilter] || [];
        } else {
          // Specific taluka selected
          talukasToLoad = [talukaFilter];
        }
        
        if (talukasToLoad.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }
        
        // Fetch data from all selected talukas
        const fetchPromises = talukasToLoad.map(async (taluka) => {
          const url = CSV_URLS[taluka];
          if (!url) {
            console.warn(`No CSV URL found for taluka: ${taluka}`);
            return [];
          }
          
          try {
            const csvText = await fetchCSV(url);
            const data = await parseCSV(csvText);
            // Add taluka information to each row for tracking
            return data.map(row => ({
              ...row,
              _Taluka: taluka, // Internal field to track which taluka this row came from
            }));
          } catch (err) {
            console.error(`Error fetching data for ${taluka}:`, err);
            return [];
          }
        });
        
        // Wait for all fetches to complete and combine data
        const allDataArrays = await Promise.all(fetchPromises);
        const combinedData = allDataArrays.flat();
        
        if (combinedData.length > 0) {
          setData(combinedData);
          setLoading(false);
        } else {
          setError("No data could be loaded from the selected sources");
          setLoading(false);
        }
      } catch (err) {
        const errorMessage = err.message || "Failed to fetch CSV. Please ensure the Google Sheets are published as 'Anyone with the link can view'";
        setError(errorMessage);
        setLoading(false);
        console.error("CSV fetch error:", err);
      }
    };

    fetchData();
  }, [districtFilter, talukaFilter]);

  // Get available districts (from DISTRICT_TALUKA_MAP)
  const uniqueDistricts = useMemo(() => {
    return Object.keys(DISTRICT_TALUKA_MAP);
  }, []);

  const uniqueVillages = useMemo(() => {
    let villages = data;
    
    // If a specific taluka is selected, filter villages by that taluka
    if (talukaFilter) {
      villages = villages.filter(row => {
        const rowTaluka = row._Taluka || row.Taluka || row.taluka || row.TALUKA || "";
        return rowTaluka.toString().toLowerCase() === talukaFilter.toLowerCase();
      });
    }
    
    // Extract unique village names
    const villageList = [...new Set(villages.map(row => 
      row.Village || row.village || row.VILLAGE || ""
    ).filter(Boolean))];
    
    return villageList.sort();
  }, [data, talukaFilter]);

  const uniqueDensityCategories = useMemo(() => {
    const categories = [...new Set(data.map(row => 
      row.Density_Category || row.density_category || row.DENSITY_CATEGORY || 
      row["Density Category"] || ""
    ).filter(Boolean))];
    return categories.sort();
  }, [data]);

  const uniqueBiomassRanges = useMemo(() => {
    // Handle both "Biomass_Range" and "Fixed_Density_tons_per_ha" columns
    const ranges = [...new Set(data.map(row => {
      const range = row.Biomass_Range || row.biomass_range || row.BIOMASS_RANGE || 
                    row["Biomass Range"] || 
                    row.Fixed_Density_tons_per_ha || row.fixed_density_tons_per_ha ||
                    row["Fixed Density tons per ha"] || "";
      return range;
    }).filter(Boolean))];
    return ranges.sort();
  }, [data]);

  // Get quantity/biomass column name (handle variations for both spreadsheets)
  const quantityColumn = useMemo(() => {
    if (data.length === 0) return null;
    const firstRow = data[0];
    return Object.keys(firstRow).find(
      key => 
        key.toLowerCase().includes("quantity") || 
        key.toLowerCase().includes("qty") ||
        key.toLowerCase().includes("biomass_tons") ||
        key.toLowerCase().includes("biomass tons") ||
        key.toLowerCase().includes("prosopis_biomass_tons") ||
        key.toLowerCase().includes("prosopis_biomass") ||
        key.toLowerCase().includes("prosopis biomass") ||
        key.toLowerCase().includes("per hectare")
    ) || null;
  }, [data]);

  // Get all column names
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Global search
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(val =>
          String(val || "").toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Taluka filter - filter by taluka when showing combined data
    if (talukaFilter) {
      filtered = filtered.filter(row => {
        // Check the internal _Taluka field or actual taluka column
        const rowTaluka = row._Taluka || row.Taluka || row.taluka || row.TALUKA || "";
        return rowTaluka.toString().toLowerCase() === talukaFilter.toLowerCase();
      });
    }

    // District filter - data is already filtered by district via taluka selection
    // No need to filter again as we fetch data based on selected taluka (which belongs to a district)

    // Village filter
    if (villageFilter) {
      filtered = filtered.filter(row => {
        const village = (row.Village || row.village || row.VILLAGE || "").toString();
        return village.toLowerCase() === villageFilter.toLowerCase();
      });
    }

    // Density Category filter
    if (densityFilter) {
      filtered = filtered.filter(row => {
        const density = (
          row.Density_Category || row.density_category || row.DENSITY_CATEGORY || 
          row["Density Category"] || ""
        ).toString();
        return density.toLowerCase() === densityFilter.toLowerCase();
      });
    }

    // Biomass Range filter - handle both column name variations
    if (biomassRangeFilter) {
      filtered = filtered.filter(row => {
        const range = (
          row.Biomass_Range || row.biomass_range || row.BIOMASS_RANGE || 
          row["Biomass Range"] || 
          row.Fixed_Density_tons_per_ha || row.fixed_density_tons_per_ha ||
          row["Fixed Density tons per ha"] || ""
        ).toString();
        return range.toLowerCase() === biomassRangeFilter.toLowerCase();
      });
    }

    // Quantity filter (range filter)
    if (quantityFilter && quantityColumn) {
      const [min, max] = quantityFilter.split("-").map(v => parseFloat(v.trim()));
      filtered = filtered.filter(row => {
        const qty = parseFloat(row[quantityColumn] || 0);
        if (!isNaN(min) && !isNaN(max)) {
          return qty >= min && qty <= max;
        } else if (!isNaN(min)) {
          return qty >= min;
        }
        return true;
      });
    }

    // Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        // Handle numeric values
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }
        
        // Handle string values
        const aStr = String(aVal || "").toLowerCase();
        const bStr = String(bVal || "").toLowerCase();
        
        if (sortConfig.direction === "asc") {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return filtered;
  }, [data, searchTerm, talukaFilter, districtFilter, villageFilter, densityFilter, biomassRangeFilter, quantityFilter, quantityColumn, sortConfig]);

  // Handle column sort
  const handleSort = (columnKey) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setTalukaFilter("");
    setDistrictFilter(""); // Reset to "All Districts"
    setVillageFilter("");
    setQuantityFilter("");
    setDensityFilter("");
    setBiomassRangeFilter("");
    setSortConfig({ key: null, direction: "asc" });
  };

  // Don't show message anymore - data will load automatically when "All Districts" is selected

  if (loading) {
    const loadingMessage = districtFilter && !talukaFilter 
      ? `Loading data for all talukas in ${districtFilter}...`
      : !districtFilter
      ? "Loading data for all districts..."
      : talukaFilter
      ? `Loading data for ${talukaFilter} taluka...`
      : "Loading data...";
    
    return (
      <div className="dashboard-table-container">
        <div className="table-loading">{loadingMessage}</div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="dashboard-table-container">
        <div className="table-error">
          <p><strong>Error loading data:</strong> {error}</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            <strong>Alternative:</strong> Upload a CSV file manually
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{
              marginTop: '1rem',
              padding: '0.5rem',
              border: '1px solid var(--accent)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          />
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
            <strong>Tip:</strong> To fix the Google Sheets issue, ensure the sheet is published as 
            "Anyone with the link can view" in Google Sheets settings.
          </p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="dashboard-table-container">
        <div className="table-error">No data available</div>
      </div>
    );
  }

  return (
    <div className="dashboard-table-container">
      <div className="dashboard-header">
        <h2>Data Dashboard</h2>
        <p className="data-count">
          Showing {filteredAndSortedData.length} of {data.length} records
        </p>
      </div>

      {/* Filters Section */}
      <div className="dashboard-filters">
        <div className="filter-group">
          <label>District:</label>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Districts</option>
            {uniqueDistricts.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Taluka:</label>
          <select
            value={talukaFilter}
            onChange={(e) => setTalukaFilter(e.target.value)}
            className="filter-select"
            disabled={availableTalukas.length === 0}
          >
            <option value="">All Talukas</option>
            {availableTalukas.map(taluka => (
              <option key={taluka} value={taluka}>{taluka}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Global Search:</label>
          <input
            type="text"
            placeholder="Search across all columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Village:</label>
          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Villages</option>
            {uniqueVillages.map(village => (
              <option key={village} value={village}>{village}</option>
            ))}
          </select>
        </div>

        {/* {quantityColumn && (
          <div className="filter-group">
            <label>Quantity/Biomass (Range):</label>
            <input
              type="text"
              placeholder="Min-Max (e.g., 1000-5000)"
              value={quantityFilter}
              onChange={(e) => setQuantityFilter(e.target.value)}
              className="filter-input"
            />
          </div>
        )} */}

        <div className="filter-group">
          <label>Density Category:</label>
          <select
            value={densityFilter}
            onChange={(e) => setDensityFilter(e.target.value)}
            className="filter-select"
            disabled={data.length === 0}
          >
            <option value="">All Categories</option>
            {uniqueDensityCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Quantity per Hectare:</label>
          <select
            value={biomassRangeFilter}
            onChange={(e) => setBiomassRangeFilter(e.target.value)}
            className="filter-select"
            disabled={data.length === 0}
          >
            <option value="">All Ranges</option>
            {uniqueBiomassRanges.map(range => (
              <option key={range} value={range}>{range}</option>
            ))}
          </select>
        </div>

        <button onClick={clearFilters} className="clear-filters-btn">
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th className="serial-no-header">S.No</th>
              {columns.map(column => (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  className={`sortable ${sortConfig.key === column ? `sorted-${sortConfig.direction}` : ""}`}
                >
                  {column}
                  {sortConfig.key === column && (
                    <span className="sort-indicator">
                      {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="no-data">
                  No data matches your filters
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((row, idx) => (
                <tr key={idx}>
                  <td className="serial-no-cell">{idx + 1}</td>
                  {columns.map(column => (
                    <td key={column}>
                      {row[column] !== null && row[column] !== undefined
                        ? String(row[column])
                        : ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
