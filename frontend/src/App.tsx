import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { LiveMapView } from './views/LiveMapView';
import { RiskAssessmentView } from './views/RiskAssessmentView';
import { SheltersReliefView } from './views/SheltersReliefView';
import { api } from './services/api';
import {
  LiveWeatherObservation,
  CycloneStatusResponse,
  Shelter,
  ReliefInventoryItem,
  SystemHealthResponse,
  NavigationTab,
} from './types';
import { AlertCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [selectedStationId, setSelectedStationId] = useState<string>('chennai');

  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [weatherStations, setWeatherStations] = useState<LiveWeatherObservation[]>([]);
  const [cycloneData, setCycloneData] = useState<CycloneStatusResponse | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [inventory, setInventory] = useState<ReliefInventoryItem[]>([]);
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

    // Auto-refresh interval every 5 minutes
    const interval = setInterval(() => {
      fetchAllData();
    }, 300000);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  const selectedStation = weatherStations.find(
    (s) => s.stationId.toLowerCase() === selectedStationId.toLowerCase()
  ) || weatherStations[0];

  const getPageTitle = (tab: NavigationTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Command Dashboard';
      case 'live-map':
        return 'Live Map & Cyclone Tracking';
      case 'risk-assessment':
        return 'Meteorological Risk Assessment';
      case 'shelters-relief':
        return 'Shelters & Relief Logistics';
      default:
        return 'CycloneGuard';
    }
  };

  return (
    <div className="app-shell">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        stations={weatherStations}
        selectedStationId={selectedStationId}
        onSelectStation={(id) => setSelectedStationId(id)}
        health={health}
        isOpenMobile={isMobileNavOpen}
        onToggleMobile={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Top Header Navbar */}
        <Navbar
          health={health}
          loading={loading}
          onRefresh={() => fetchAllData(true)}
          lastUpdated={lastUpdated}
          pageTitle={getPageTitle(activeTab)}
          onToggleMobile={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        {/* Viewport Content */}
        <main className="content-area">
          {/* Connection Error Banner */}
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
                <strong>Connection Alert:</strong> {error} Ensure backend is running at <code style={{ color: '#fff' }}>http://localhost:5000</code>.
              </div>
            </div>
          )}

          {/* Conditional Multi-Page Single-Page Views */}
          {activeTab === 'dashboard' && (
            <DashboardView
              stations={weatherStations}
              selectedStation={selectedStation}
              onSelectStation={(id) => setSelectedStationId(id)}
              cycloneData={cycloneData}
              shelters={shelters}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'live-map' && (
            <LiveMapView
              stations={weatherStations}
              selectedStation={selectedStation}
              onSelectStation={(id) => setSelectedStationId(id)}
              cycloneData={cycloneData}
              shelters={shelters}
            />
          )}

          {activeTab === 'risk-assessment' && (
            <RiskAssessmentView
              stations={weatherStations}
              selectedStationId={selectedStationId}
              onSelectStation={(id) => setSelectedStationId(id)}
            />
          )}

          {activeTab === 'shelters-relief' && (
            <SheltersReliefView
              shelters={shelters}
              inventory={inventory}
              selectedDistrict={selectedStation?.district}
            />
          )}
        </main>

        {/* Footer */}
        <footer style={{
          background: '#090d16',
          borderTop: '1px solid #1a273b',
          padding: '1.25rem 1rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#64748b',
          marginTop: 'auto',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <p style={{ marginBottom: '0.25rem', color: '#94a3b8' }}>
              <strong>CycloneGuard</strong> — Real-Time Cyclone Disaster Management System
            </p>
            <p>
              Data Provenance: Open-Meteo Real-Time Weather • India Meteorological Department (RSMC New Delhi) • Tamil Nadu State Disaster Management Authority (TNSDMA)
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
