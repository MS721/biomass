import React from "react";

export default function FormPage() {
  const koboFormUrl = import.meta.env.VITE_KOBO_FORM_URL;

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ 
        padding: "10px 20px", 
        background: "#2c3e50", 
        color: "white", 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Juliflora Data Collection</h2>
        <button 
          onClick={() => window.close()} 
          style={{ cursor: "pointer", padding: "5px 15px", borderRadius: "4px", border: "none" }}
        >
          Close Form
        </button>
      </div>
      
      {koboFormUrl ? (
        <iframe
          src={koboFormUrl}
          title="Kobo Survey"
          style={{ flex: 1, width: "100%", border: "none" }}
        />
      ) : (
        <div style={{ padding: "20px", textAlign: "center" }}>
          Loading Form... Please ensure VITE_KOBO_FORM_URL is set in Vercel.
        </div>
      )}
    </div>
  );
}
