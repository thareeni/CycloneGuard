import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DataSourceLegend } from './components/DataSourceLegend';
import { CycloneStatusBanner } from './components/CycloneStatusBanner';
import { LiveWeatherCard } from './components/LiveWeatherCard';
import { MapView } from './components/MapView';
import { SheltersTable } from './components/SheltersTable';
import { ReliefInventoryTable } from './components/ReliefInventoryTable';
import { api } from './services/api';
import {
  LiveWeatherObservation,
  CycloneStatusResponse,
  Shelter,
  ReliefInventoryItem,
  SystemHealthResponse,
} from './types';
import { AlertCircle, Home, Package } from 'lucide-react';

export function App() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [weatherStations, setWeatherStations] = useState<LiveWeatherObservation[]>([]);
  const [cycloneData, setCycloneData] = useState<CycloneStatusResponse | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [inventory, setInventory] = useState<ReliefInventoryItem[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('chennai');
  const [activeTab, setActiveTab] = useState<'shelters' | 'inventory'>('shelters');
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, weatherRes, cycloneRes, sheltersRes, inventoryRes] = await Promise.all([
        api.getHealth().catch((e) => {
          console.warn('Health check failed:', e);
          return null;
        }),
        api.getCoastalWeather(forceRefresh),
        api.getCycloneStatus(),
        api.getShelters(),
        api.getInventory(),
      ]);

      if (healthRes) setHealth(healthRes);
      setWeatherStations(weatherRes);
      setCycloneData(cycloneRes);
      setShelters(sheltersRes);
      setInventory(inventoryRes);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      console.error('Data fetch error:', err);
      setError(err.message || 'Unable to connect to CycloneGuard backend service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      fetchAllData();
    }, 300000);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        health={health}
        loading={loading}
        onRefresh={() => fetchAllData(true)}
        lastUpdated={lastUpdated}
      />

      <main className="main-content">
        {/* Error notification */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <AlertCircle size={20} color="#ef4444" />
            <div style={{ fontSize: '0.85rem', color: '#fecaca' }}>
              <strong>Connection Warning:</strong> {error} Ensure backend is running at <code style={{ color: '#fff' }}>http://localhost:5000</code>.
            </div>
          </div>
        )}

        {/* Data Governance Legend */}
        <DataSourceLegend />

        {/* Official Cyclone Status Banner */}
        <CycloneStatusBanner cycloneData={cycloneData} />

        {/* Live Weather Cards Section */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  Live Coastal Meteorological Telemetry
                </h2>
                <span className="badge badge-live">
                  <span className="pulse-dot"></span> Open-Meteo Real-Time
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Real-time automated weather observations for high-vulnerability coastal districts of Tamil Nadu.
              </p>
            </div>
          </div>

          <div className="grid-cards">
            {weatherStations.map((station) => (
              <LiveWeatherCard
                key={station.stationId}
                observation={station}
                isSelected={station.stationId === selectedStationId}
                onSelect={() => setSelectedStationId(station.stationId)}
              />
            ))}
          </div>
        </section>

        {/* Geospatial Map + Operational Hubs Layout */}
        <section style={{ marginBottom: '2rem' }}>
          <MapView
            weatherStations={weatherStations}
            shelters={shelters}
            cycloneSystems={cycloneData?.systems}
            selectedStationId={selectedStationId}
            onSelectStation={(id) => setSelectedStationId(id)}
          />
        </section>

        {/* Ground Operational Management: Shelters & Relief Inventory */}
        <section>
          <div className="tabs-header">
            <button
              onClick={() => setActiveTab('shelters')}
              className={`tab-btn ${activeTab === 'shelters' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Home size={16} />
              <span>Emergency Shelters ({shelters.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Package size={16} />
              <span>Relief Inventory Stock ({inventory.length})</span>
            </button>
          </div>

          {activeTab === 'shelters' ? (
            <SheltersTable shelters={shelters} />
          ) : (
            <ReliefInventoryTable inventory={inventory} />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        background: '#090d16',
        borderTop: '1px solid #1a273b',
        padding: '1.5rem 1rem',
        textAlign: 'center',
        fontSize: '0.78rem',
        color: '#64748b',
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <p style={{ marginBottom: '0.25rem', color: '#94a3b8' }}>
            <strong>CycloneGuard</strong> — Real-Time Cyclone Disaster Management System
          </p>
          <p>
            Data sources: Open-Meteo Real-Time Weather • India Meteorological Department (RSMC New Delhi) • Tamil Nadu State Disaster Management Authority (TNSDMA)
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
