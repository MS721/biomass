import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import FormPage from "./components/FormPage";
import DashboardTable from "./components/DashboardTable";
import "./App.css";

export default function App() {
  const [filters, setFilters] = useState({
    biomass: "",
    state: "",
    district: "",
    industry: "",
    boundaries: "",
    csv: null
  });

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <div className="app-root">
              <div className="bg-layer" />
              <Sidebar filters={filters} setFilters={setFilters} />
              <main className="main-content">
                <div className="map-card">
                  <MapView filters={filters} />
                </div>
                <DashboardTable />
              </main>
            </div>
          } 
        />
        <Route path="/form" element={<FormPage />} />
      </Routes>
    </Router>
  );
}