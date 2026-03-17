import React, { useEffect, useMemo } from "react";

// District images (Supabase URLs for Gujarat)
const gujaratDistrictImages = {
  Ahmedabad:
    "https://yhupgiuuzhwucmwzfhai.supabase.co/storage/v1/object/public/data/Admin-Map-of-A'Bad-Dist.jpg",
  Anand:
    "https://yhupgiuuzhwucmwzfhai.supabase.co/storage/v1/object/public/data/Admin-Map-of-Anand-District.jpg",
  Aravalli:
    "https://yhupgiuuzhwucmwzfhai.supabase.co/storage/v1/object/public/data/Admin-Map-of-Arvalli-Dist.jpg",
  Banaskantha:
    "https://yhupgiuuzhwucmwzfhai.supabase.co/storage/v1/object/public/data/Admin-Map-of-Banaskantha-Dist.jpg",
  Bharuch:
    "https://yhupgiuuzhwucmwzfhai.supabase.co/storage/v1/object/public/data/Admin-Map-of-Bharuch-Dist.jpg",
  Bhavnagar:
    "https://yhupgiuuzhwucmwzfhai.supabase.co/storage/v1/object/public/data/Admin-Map-of-Bhavnagari-Dist.jpg",
  Botad:
    "https://yhupgiuuzhwucmwzfhai.supabase.co/storage/v1/object/public/data/Admin-Map-of-Botad-Dist.jpg",
  // add more districts here if needed
};

export default function MapView({ filters }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Compute map URL dynamically (case-insensitive)
  const mapUrl = useMemo(() => {
    const state = (filters.state || "").trim().toLowerCase();
    const biomass = (filters.biomass || "").trim().toLowerCase();

    // Case-insensitive rules
    if (state === "gujarat" && biomass === "juliflora") {
      return "https://pranavclimitra001.users.earthengine.app/view/class1fullgujarat";
    }
    if (state === "karnataka" && biomass === "cotton") {
      return "https://pranavclimitra001.users.earthengine.app/view/cotton";
    }
    if (state === "assam" && biomass === "bamboo") {
      return "https://pranavclimitra001.users.earthengine.app/view/bambooinkrabi";
    }

    // Default fallback map
    return "https://pranavclimitra001.users.earthengine.app/view/class1fullgujarat";
  }, [filters.state, filters.biomass]);

  // Determine overlay image
  const overlayImage = useMemo(() => {
    const state = (filters.state || "").trim().toLowerCase();
    const boundary = (filters.boundaries || "").trim().toLowerCase();
    const district = filters.district || "";

    if (state === "gujarat" && boundary === "district boundary" && gujaratDistrictImages[district]) {
      return gujaratDistrictImages[district];
    }
    return null;
  }, [filters.state, filters.boundaries, filters.district]);

  return (
    <div
      style={{
        height: "calc(100vh - 220px)",
        width: "100%",
        overflow: "hidden",
        borderRadius: "12px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        marginTop: "1rem",
        position: "relative", // <-- required for overlay positioning
      }}
    >
      <iframe
        key={mapUrl}
        src={mapUrl}
        title="Earth Engine Map"
        width="100%"
        height="100%"
        style={{
          border: "none",
          borderRadius: "12px",
          transform: "scale(1.02)",
          transformOrigin: "center center",
        }}
        allowFullScreen
      ></iframe>

      {/* Overlay image (shown dynamically) */}
      {overlayImage && (
        <img
          src={overlayImage}
          alt="District Overlay"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: 0.8,
            pointerEvents: "none", // allows map interactions
            borderRadius: "12px",
          }}
        />
      )}
    </div>
  );
}
