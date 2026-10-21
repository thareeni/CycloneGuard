import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
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
  CoastalDistrict,
  AuthUser,
} from './types';
import { AlertCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [selectedStationId, setSelectedStationId] = useState<string>('chennai');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');

  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [districts, setDistricts] = useState<CoastalDistrict[]>([]);
  const [weatherStations, setWeatherStations] = useState<LiveWeatherObservation[]>([]);
  const [cycloneData, setCycloneData] = useState<CycloneStatusResponse | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [inventory, setInventory] = useState<ReliefInventoryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => api.getCurrentUser());
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, districtsRes, weatherRes, cycloneRes, sheltersRes, inventoryRes, userRes] =
        await Promise.all([
          api.getHealth().catch((e) => {
            console.warn('Health check failed:', e);
            return null;
          }),
          api.getDistricts().catch(() => []),
          api.getCoastalWeather(forceRefresh),
          api.getCycloneStatus(),
          api.getShelters(),
          api.getInventory(),
          api.getMe().catch(() => null),
        ]);

      if (healthRes) setHealth(healthRes);
      if (districtsRes && districtsRes.length > 0) setDistricts(districtsRes);
      setWeatherStations(weatherRes);
      setCycloneData(cycloneRes);
      setShelters(sheltersRes);
      setInventory(inventoryRes);

      if (userRes) {
        setCurrentUser((prev) => {
          if (
            !prev ||
            prev.id !== userRes.id ||
            prev.role !== userRes.role ||
            prev.email !== userRes.email ||
            prev.assignedDistrict !== userRes.assignedDistrict
          ) {
            return userRes;
          }
          return prev; // Maintain referential stability to avoid re-triggering effects
        });
        setSessionExpired(false);
      } else if (localStorage.getItem('cycloneguard_auth_token')) {
        // Token was present but validation failed
        api.logout();
        setCurrentUser(null);
        setSessionExpired(true);
      }
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      console.error('Data fetch error:', err);
      setError(err.message || 'Unable to connect to CycloneGuard backend service.');
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = Boolean(currentUser);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();

      // Auto-refresh interval every 5 minutes
      const interval = setInterval(() => {
        fetchAllData();
      }, 300000);

      return () => clearInterval(interval);
    }
  }, [fetchAllData, isAuthenticated]);

  // Synchronize district selection with coastal stations
  const handleSelectDistrict = (districtName: string) => {
    // If user is a DISTRICT_OFFICIAL, enforce their assigned jurisdiction
    if (currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict) {
      districtName = currentUser.assignedDistrict;
    }

    setSelectedDistrict(districtName);
    if (districtName === 'ALL') return;

    const matchingDistrict = districts.find(
      (d) => d.name.toLowerCase() === districtName.toLowerCase()
    );

    if (matchingDistrict) {
      setSelectedStationId(matchingDistrict.stationId);
    } else {
      const matchingStation = weatherStations.find(
        (s) => s.district.toLowerCase() === districtName.toLowerCase()
      );
      if (matchingStation) {
        setSelectedStationId(matchingStation.stationId);
      }
    }
  };

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setSessionExpired(false);
    if (user.role === 'DISTRICT_OFFICIAL' && user.assignedDistrict) {
      setSelectedDistrict(user.assignedDistrict);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  // If session is unauthenticated, display the full-page Disaster Operational Login screen first.
  // Do not expose the operational dashboard, sidebar, or protected views until authentication succeeds.
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} sessionExpired={sessionExpired} />;
  }

  const selectedStation =
    weatherStations.find(
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
        onSelectStation={(id) => {
          setSelectedStationId(id);
          const st = weatherStations.find((s) => s.stationId.toLowerCase() === id.toLowerCase());
          if (st) setSelectedDistrict(st.district);
        }}
        health={health}
        isOpenMobile={isMobileNavOpen}
        onToggleMobile={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Top Header Navbar with Centralized District Selector & RBAC */}
        <Navbar
          health={health}
          loading={loading}
          onRefresh={() => fetchAllData(true)}
          lastUpdated={lastUpdated}
          pageTitle={getPageTitle(activeTab)}
          onToggleMobile={() => setIsMobileNavOpen(!isMobileNavOpen)}
          districts={districts}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={handleSelectDistrict}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        {/* Viewport Content */}
        <main className="content-area">
          {/* Connection Error Banner */}
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '0.5rem',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <AlertCircle size={20} color="#ef4444" />
              <div style={{ fontSize: '0.85rem', color: '#fecaca' }}>
                <strong>Connection Alert:</strong> {error} Ensure backend is running at{' '}
                <code style={{ color: '#fff' }}>http://localhost:5000</code>.
              </div>
            </div>
          )}

          {/* Conditional Multi-Page Single-Page Views */}
          {activeTab === 'dashboard' && (
            <DashboardView
              stations={weatherStations}
              selectedStation={selectedStation}
              onSelectStation={(id) => {
                setSelectedStationId(id);
                const st = weatherStations.find((s) => s.stationId.toLowerCase() === id.toLowerCase());
                if (st) setSelectedDistrict(st.district);
              }}
              cycloneData={cycloneData}
              shelters={shelters}
              onNavigateTab={(tab) => setActiveTab(tab)}
              districts={districts}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={handleSelectDistrict}
            />
          )}

          {activeTab === 'live-map' && (
            <LiveMapView
              stations={weatherStations}
              selectedStation={selectedStation}
              onSelectStation={(id) => {
                setSelectedStationId(id);
                const st = weatherStations.find((s) => s.stationId.toLowerCase() === id.toLowerCase());
                if (st) setSelectedDistrict(st.district);
              }}
              cycloneData={cycloneData}
              shelters={shelters}
            />
          )}

          {activeTab === 'risk-assessment' && (
            <RiskAssessmentView
              stations={weatherStations}
              selectedStationId={selectedStationId}
              onSelectStation={(id) => {
                setSelectedStationId(id);
                const st = weatherStations.find((s) => s.stationId.toLowerCase() === id.toLowerCase());
                if (st) setSelectedDistrict(st.district);
              }}
              districts={districts}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={handleSelectDistrict}
            />
          )}

          {activeTab === 'shelters-relief' && (
            <SheltersReliefView
              shelters={shelters}
              inventory={inventory}
              selectedDistrict={selectedDistrict}
              currentUser={currentUser}
            />
          )}
        </main>

        {/* Footer */}
        <footer
          style={{
            background: '#090d16',
            borderTop: '1px solid #1a273b',
            padding: '1.25rem 1rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#64748b',
            marginTop: 'auto',
          }}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <p style={{ marginBottom: '0.25rem', color: '#94a3b8' }}>
              <strong>CycloneGuard</strong> — Real-Time Cyclone Disaster Management System
            </p>
            <p>
              Coverage: All 14 Coastal Districts of Tamil Nadu (TNSCZMA) • Open-Meteo Real-Time Weather • India Meteorological Department (RSMC New Delhi) • GDACS Secondary Public Fallback • MongoDB Atlas MERN Logistics • Leaflet & OpenStreetMap
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
