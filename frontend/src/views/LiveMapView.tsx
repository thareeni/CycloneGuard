import React, { useState } from 'react';
import {
  LiveWeatherObservation,
  CycloneStatusResponse,
  Shelter,
  NearestShelterRecommendation,
  CoastalDistrict,
} from '../types';
import { MapView } from '../components/MapView';
import { api } from '../services/api';
import {
  Wind,
  Gauge,
  CloudRain,
  ShieldCheck,
  ShieldAlert,
  Navigation,
  Locate,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

interface LiveMapViewProps {
  stations: LiveWeatherObservation[];
  selectedStation: LiveWeatherObservation | undefined;
  onSelectStation: (stationId: string) => void;
  cycloneData: CycloneStatusResponse | null;
  shelters: Shelter[];
  selectedDistrict?: string;
  districts?: CoastalDistrict[];
  onSelectDistrict?: (districtName: string) => void;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  cycloneData,
  shelters,
  selectedDistrict = 'ALL',
  districts: _districts = [],
  onSelectDistrict,
}) => {
  const normalizeDistrict = (name?: string) => {
    if (!name) return '';
    const clean = name.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.includes('kanya') || clean.includes('kanni')) return 'kanniyakumari';
    return clean;
  };

  const isDistrictFiltered = selectedDistrict !== 'ALL';

  const displayedStations = isDistrictFiltered
    ? stations.filter((s) => normalizeDistrict(s.district) === normalizeDistrict(selectedDistrict))
    : stations;

  const displayedShelters = isDistrictFiltered
    ? shelters.filter((s) => normalizeDistrict(s.districtName) === normalizeDistrict(selectedDistrict))
    : shelters;

  const [activeSideTab, setActiveSideTab] = useState<'station' | 'cyclone' | 'evacuation'>('station');

  // Geolocation state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [originType, setOriginType] = useState<'station' | 'user'>('station');

  // Evacuation routing state
  const [loadingNearest, setLoadingNearest] = useState<boolean>(false);
  const [nearestShelters, setNearestShelters] = useState<NearestShelterRecommendation[]>([]);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number | 'ALL'>('ALL');
  const [shelterLimit, setShelterLimit] = useState<number>(50);
  const [activeRouteGeometry, setActiveRouteGeometry] = useState<[number, number][] | undefined>(undefined);
  const [activeRouteInfo, setActiveRouteInfo] = useState<{
    shelterName: string;
    roadDistanceKm?: number;
    durationMinutes?: number;
    isFallback?: boolean;
    disclaimer?: string;
  } | undefined>(undefined);

  // Acquire Browser Geolocation with explicit permission handling
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser geolocation is not supported on this device/browser.');
      return;
    }
    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);
        setOriginType('user');
        setIsLocating(false);
        // Automatically compute nearest shelters from user coordinates
        handleFindNearest(selectedRadiusKm, shelterLimit, [lat, lng]);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access or select a coastal station.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('GPS position unavailable. Please check device location settings.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default:
            setLocationError('Failed to retrieve device location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Resolve current active origin coordinates
  const getActiveOrigin = (
    overrideOrigin?: [number, number]
  ): { lat: number; lng: number; label: string; isUser: boolean } | null => {
    if (overrideOrigin) {
      return {
        lat: overrideOrigin[0],
        lng: overrideOrigin[1],
        label: `Your GPS Location (${overrideOrigin[0].toFixed(3)}°N, ${overrideOrigin[1].toFixed(3)}°E)`,
        isUser: true,
      };
    }
    if (originType === 'user' && userLocation) {
      return {
        lat: userLocation[0],
        lng: userLocation[1],
        label: `Your GPS Location (${userLocation[0].toFixed(3)}°N, ${userLocation[1].toFixed(3)}°E)`,
        isUser: true,
      };
    }
    if (selectedStation) {
      return {
        lat: selectedStation.latitude,
        lng: selectedStation.longitude,
        label: `${selectedStation.locationName} (${selectedStation.district})`,
        isUser: false,
      };
    }
    return null;
  };

  const handleFindNearest = async (
    customRadius?: number | 'ALL',
    customLimit?: number,
    customOrigin?: [number, number]
  ) => {
    const origin = getActiveOrigin(customOrigin);
    if (!origin) return;

    setLoadingNearest(true);
    try {
      const radiusVal = customRadius !== undefined ? customRadius : selectedRadiusKm;
      const limitVal = customLimit !== undefined ? customLimit : shelterLimit;
      const radiusParam = radiusVal === 'ALL' ? undefined : radiusVal;
      const recs = await api.getNearestShelters(
        origin.lat,
        origin.lng,
        limitVal,
        radiusParam
      );
      setNearestShelters(recs);
    } catch (err: any) {
      console.warn('Failed to fetch nearest shelters:', err.message);
    } finally {
      setLoadingNearest(false);
    }
  };

  const handlePlotRoute = async (rec: NearestShelterRecommendation) => {
    const origin = getActiveOrigin();
    if (!origin) return;

    try {
      const routeRes = await api.getRouteToShelter(
        origin.lat,
        origin.lng,
        rec.shelter.id
      );

      if (routeRes && routeRes.route && routeRes.route.geometry) {
        setActiveRouteGeometry(routeRes.route.geometry);
        setActiveRouteInfo({
          shelterName: rec.shelter.name,
          roadDistanceKm: routeRes.route.roadDistanceKm,
          durationMinutes: routeRes.route.durationMinutes,
          isFallback: routeRes.route.status === 'FALLBACK_GEODESIC',
          disclaimer: routeRes.safetyDisclaimer,
        });
      }
    } catch (err: any) {
      // Fallback: draw straight-line
      setActiveRouteGeometry([
        [origin.lat, origin.lng],
        [rec.shelter.latitude, rec.shelter.longitude],
      ]);
      setActiveRouteInfo({
        shelterName: rec.shelter.name,
        roadDistanceKm: rec.straightLineDistanceKm,
        durationMinutes: Math.round((rec.straightLineDistanceKm * 60) / 35),
        isFallback: true,
        disclaimer: 'Straight-line corridor shown.',
      });
    }
  };

  const handleClearRoute = () => {
    setActiveRouteGeometry(undefined);
    setActiveRouteInfo(undefined);
  };

  const activeOrigin = getActiveOrigin();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
            Live Geospatial Map & Cyclone Tracking
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Interactive Bay of Bengal coastal corridor mapping • Real-time station telemetry, OSRM routing & IMD/GDACS storm feeds.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              borderColor: userLocation ? '#38bdf8' : '#24344d',
              color: userLocation ? '#38bdf8' : '#f1f5f9',
              background: userLocation ? 'rgba(56, 189, 248, 0.12)' : '#162032',
              cursor: isLocating ? 'wait' : 'pointer',
            }}
            title="Locate via device GPS"
          >
            <Locate size={14} className={isLocating ? 'spin' : ''} />
            <span>
              {isLocating
                ? 'Acquiring GPS...'
                : userLocation
                ? `GPS Active (${userLocation[0].toFixed(2)}°, ${userLocation[1].toFixed(2)}°)`
                : 'Use My Current Location'}
            </span>
          </button>

          <span className="badge badge-live">
            <span className="pulse-dot"></span> LEAFLET / OSM ACTIVE
          </span>
          <span className="badge badge-official">
            DUAL CYCLONE GATEWAY
          </span>
        </div>
      </div>

      {/* Main Split Grid Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(340px, 0.9fr)',
          gap: '1.25rem',
        }}
      >
        {/* Left: Map View */}
        <div>
          <MapView
            weatherStations={displayedStations}
            shelters={displayedShelters}
            cycloneSystems={cycloneData?.systems}
            selectedStationId={selectedStation?.stationId}
            onSelectStation={onSelectStation}
            activeEvacuationRoute={activeRouteGeometry}
            activeRouteInfo={activeRouteInfo}
            onClearRoute={handleClearRoute}
            userLocation={userLocation}
            selectedDistrict={selectedDistrict}
          />

          {/* Quick Station Jump Strip below map */}
          <div className="card" style={{ padding: '0.85rem 1rem', marginTop: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.65rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {isDistrictFiltered ? `${selectedDistrict} District Station (${displayedStations.length})` : `14 Coastal Monitoring Stations (${stations.length})`}
                </span>
                {isDistrictFiltered && onSelectDistrict && (
                  <button
                    onClick={() => onSelectDistrict('ALL')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                  >
                    Show All
                  </button>
                )}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Click to pan map & inspect telemetry
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.45rem',
                flexWrap: 'wrap',
              }}
            >
              {displayedStations.map((s) => {
                const isSelected = s.stationId.toLowerCase() === selectedStation?.stationId.toLowerCase();
                return (
                  <button
                    key={s.stationId}
                    onClick={() => {
                      onSelectStation(s.stationId);
                      if (originType === 'station') {
                        // Clear previous active route when switching station
                        handleClearRoute();
                      }
                    }}
                    style={{
                      background: isSelected ? '#0284c7' : '#162032',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid #24344d',
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{s.district}</span>
                    <span
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontSize: '0.68rem',
                      }}
                    >
                      {Math.round(s.temperatureCelsius)}°C
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Inspection Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              background: '#0d131f',
              padding: '0.25rem',
              borderRadius: '0.5rem',
              border: '1px solid #1f293d',
              gap: '0.25rem',
            }}
          >
            <button
              onClick={() => setActiveSideTab('station')}
              style={{
                flex: 1,
                padding: '0.5rem 0.5rem',
                background: activeSideTab === 'station' ? '#1e293b' : 'transparent',
                border: 'none',
                borderRadius: '0.375rem',
                color: activeSideTab === 'station' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeSideTab === 'station' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              📍 Station Weather
            </button>
            <button
              onClick={() => setActiveSideTab('cyclone')}
              style={{
                flex: 1,
                padding: '0.5rem 0.5rem',
                background: activeSideTab === 'cyclone' ? '#1e293b' : 'transparent',
                border: 'none',
                borderRadius: '0.375rem',
                color: activeSideTab === 'cyclone' ? '#ef4444' : '#94a3b8',
                fontWeight: activeSideTab === 'cyclone' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              🌀 Cyclone Feed
            </button>
            <button
              onClick={() => {
                setActiveSideTab('evacuation');
                if (nearestShelters.length === 0) handleFindNearest();
              }}
              style={{
                flex: 1,
                padding: '0.5rem 0.5rem',
                background: activeSideTab === 'evacuation' ? '#1e293b' : 'transparent',
                border: 'none',
                borderRadius: '0.375rem',
                color: activeSideTab === 'evacuation' ? '#a855f7' : '#94a3b8',
                fontWeight: activeSideTab === 'evacuation' ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              🛣️ Evacuation
            </button>
          </div>

          {/* TAB 1: Selected Station Telemetry */}
          {activeSideTab === 'station' && selectedStation && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '0.85rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                    {selectedStation.district} District
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.15rem' }}>
                    {selectedStation.locationName}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                    GPS: {selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                    {selectedStation.temperatureCelsius.toFixed(1)}°C
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {selectedStation.weatherCondition}
                  </div>
                </div>
              </div>

              {/* Atmospheric Parameters Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#0e1726', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 600 }}>
                    <Wind size={14} /> <span>10m Sustained Wind</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.3rem' }}>
                    {selectedStation.windSpeedKmh.toFixed(1)}{' '}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>km/h</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Direction: {selectedStation.windDirectionDeg}°
                  </div>
                </div>

                <div style={{ background: '#0e1726', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f97316', fontSize: '0.72rem', fontWeight: 600 }}>
                    <Wind size={14} /> <span>Peak Wind Gusts</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.3rem' }}>
                    {selectedStation.windGustsKmh.toFixed(1)}{' '}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>km/h</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Turbulence Indicator
                  </div>
                </div>

                <div style={{ background: '#0e1726', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7', fontSize: '0.72rem', fontWeight: 600 }}>
                    <Gauge size={14} /> <span>Surface Pressure</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.3rem' }}>
                    {selectedStation.surfacePressureHpa > 0 ? selectedStation.surfacePressureHpa.toFixed(1) : 'N/A'}{' '}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>hPa</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {selectedStation.surfacePressureHpa < 1000 ? 'Depression Gradient' : 'Nominal Coastal Barometer'}
                  </div>
                </div>

                <div style={{ background: '#0e1726', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#06b6d4', fontSize: '0.72rem', fontWeight: 600 }}>
                    <CloudRain size={14} /> <span>Hourly Precipitation</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.3rem' }}>
                    {selectedStation.rainfallMm.toFixed(1)}{' '}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>mm</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Precip: {selectedStation.precipitationMm.toFixed(1)} mm
                  </div>
                </div>
              </div>

              {/* Evacuation Quick Action */}
              <button
                onClick={() => {
                  setOriginType('station');
                  setActiveSideTab('evacuation');
                  handleFindNearest();
                }}
                className="btn btn-secondary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                <Navigation size={14} color="#a855f7" />
                <span>Find Nearest Shelters from this Station</span>
              </button>
            </div>
          )}

          {/* TAB 2: Cyclone Tracking Gateway */}
          {activeSideTab === 'cyclone' && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <ShieldAlert size={18} color="#ef4444" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                  Official Cyclone Feeds
                </h3>
              </div>

              {cycloneData?.integration && (
                <div
                  style={{
                    background: '#0d1527',
                    border: '1px solid #1f2d47',
                    borderRadius: '0.375rem',
                    padding: '0.85rem',
                    marginBottom: '1rem',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Primary Authority:</div>
                  <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
                    {cycloneData.integration.provider}
                  </strong>
                  <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Secondary Fallback:</div>
                  <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '0.5rem' }}>
                    {cycloneData.integration.secondaryProvider || 'GDACS Severe Weather Service'}
                  </strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', borderTop: '1px solid #1e293b', paddingTop: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Status:</span>
                    <span
                      style={{
                        color:
                          cycloneData.integration.status === 'ACTIVE_CYCLONE_TRACKED'
                            ? '#ef4444'
                            : '#34d399',
                        fontWeight: 700,
                      }}
                    >
                      {cycloneData.integration.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{ color: '#64748b' }}>Freshness:</span>
                    <span style={{ color: '#38bdf8' }}>{cycloneData.integration.dataFreshness || 'LIVE'}</span>
                  </div>
                </div>
              )}

              {cycloneData && cycloneData.systems.length > 0 ? (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem' }}>
                    Active Tracked Storms ({cycloneData.systems.length})
                  </h4>
                  {cycloneData.systems.map((sys) => (
                    <div
                      key={sys.officialCycloneId}
                      style={{
                        background: '#1c1917',
                        border: '1px solid #7f1d1d',
                        borderRadius: '0.375rem',
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        fontSize: '0.78rem',
                      }}
                    >
                      <strong style={{ color: '#f87171', fontSize: '0.95rem' }}>🌀 {sys.name}</strong>
                      <div style={{ color: '#cbd5e1', marginTop: '0.35rem' }}>
                        <div>Basin: {sys.basin}</div>
                        <div>Classification: {sys.classification}</div>
                        {sys.currentPosition && (
                          <div>
                            Position: {sys.currentPosition.latitude.toFixed(2)}°N, {sys.currentPosition.longitude.toFixed(2)}°E (Wind: {sys.currentPosition.maxSustainedWindKmh} km/h)
                          </div>
                        )}
                        <div>Tracks logged: {sys.tracks?.length || 0} trackpoints</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '0.375rem',
                    padding: '0.85rem',
                    textAlign: 'center',
                  }}
                >
                  <ShieldCheck size={28} color="#34d399" style={{ margin: '0 auto 0.4rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                    No Active Cyclonic Systems
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                    Verified via official feeds: Zero active tropical storms or deep depressions detected over Bay of Bengal / Tamil Nadu maritime corridor.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Evacuation & Nearest Shelter Routing */}
          {activeSideTab === 'evacuation' && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Navigation size={18} color="#a855f7" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                    Nearest Shelter Routing
                  </h3>
                </div>
                <button
                  onClick={() => handleFindNearest()}
                  disabled={loadingNearest}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                >
                  {loadingNearest ? 'Computing...' : 'Recalculate'}
                </button>
              </div>

              {/* Origin Mode Selector */}
              <div
                style={{
                  background: '#0d131f',
                  border: '1px solid #1f293d',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Routing Origin
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setOriginType('station');
                      if (selectedStation) {
                        handleFindNearest(selectedRadiusKm, shelterLimit, [selectedStation.latitude, selectedStation.longitude]);
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: '130px',
                      padding: '0.4rem 0.6rem',
                      background: originType === 'station' ? '#1e293b' : 'transparent',
                      border: originType === 'station' ? '1px solid #38bdf8' : '1px solid #24344d',
                      borderRadius: '0.25rem',
                      color: originType === 'station' ? '#38bdf8' : '#cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: originType === 'station' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>📍 Coastal Station</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedStation ? selectedStation.locationName : 'None selected'}
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      if (!userLocation) {
                        handleLocateUser();
                      } else {
                        setOriginType('user');
                        handleFindNearest(selectedRadiusKm, shelterLimit, userLocation);
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: '130px',
                      padding: '0.4rem 0.6rem',
                      background: originType === 'user' ? '#1e293b' : 'transparent',
                      border: originType === 'user' ? '1px solid #a855f7' : '1px solid #24344d',
                      borderRadius: '0.25rem',
                      color: originType === 'user' ? '#c084fc' : '#cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: originType === 'user' ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Locate size={12} className={isLocating ? 'spin' : ''} />
                      <span>{isLocating ? 'Locating...' : 'My Current Location'}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                      {userLocation ? `${userLocation[0].toFixed(3)}°N, ${userLocation[1].toFixed(3)}°E` : 'Click to acquire GPS'}
                    </div>
                  </button>
                </div>

                {locationError && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '0.25rem',
                      padding: '0.4rem 0.6rem',
                      fontSize: '0.7rem',
                      color: '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <span>⚠️ {locationError}</span>
                    <button
                      onClick={() => setLocationError(null)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Radius & Limit Filters */}
              <div
                style={{
                  background: '#0e1726',
                  border: '1px solid #1e293b',
                  borderRadius: '0.375rem',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Radius:</label>
                  <select
                    value={selectedRadiusKm}
                    onChange={(e) => {
                      const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                      setSelectedRadiusKm(val);
                      handleFindNearest(val, shelterLimit);
                    }}
                    style={{
                      background: '#162032',
                      border: '1px solid #24344d',
                      color: '#f8fafc',
                      fontSize: '0.72rem',
                      padding: '0.25rem 0.45rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={25}>Within 25 km</option>
                    <option value={50}>Within 50 km</option>
                    <option value={100}>Within 100 km</option>
                    <option value="ALL">All Distances (Statewide)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Limit:</label>
                  <select
                    value={shelterLimit}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setShelterLimit(val);
                      handleFindNearest(selectedRadiusKm, val);
                    }}
                    style={{
                      background: '#162032',
                      border: '1px solid #24344d',
                      color: '#f8fafc',
                      fontSize: '0.72rem',
                      padding: '0.25rem 0.45rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={3}>Top 3</option>
                    <option value={10}>Top 10</option>
                    <option value={25}>Top 25</option>
                    <option value={50}>All (50 Max)</option>
                  </select>
                </div>

                <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 700 }}>
                  {nearestShelters.length} Available Shelters
                </div>
              </div>

              {/* Shelter List */}
              {nearestShelters.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {nearestShelters.map((rec, idx) => {
                    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${rec.shelter.latitude},${rec.shelter.longitude}${
                      activeOrigin ? `&origin=${activeOrigin.lat},${activeOrigin.lng}` : ''
                    }`;

                    return (
                      <div
                        key={rec.shelter.id}
                        style={{
                          background: '#0e1726',
                          border: '1px solid #1e293b',
                          borderRadius: '0.375rem',
                          padding: '0.75rem',
                          fontSize: '0.78rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                              #{idx + 1} NEAREST
                            </span>
                            <strong style={{ color: '#f8fafc', display: 'block', marginTop: '0.25rem' }}>
                              {rec.shelter.name}
                            </strong>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                              {rec.shelter.districtName} District • Capacity: {rec.shelter.totalCapacity} (Available: {rec.shelter.availableCapacity})
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem', color: '#cbd5e1', fontSize: '0.72rem', background: '#162032', padding: '0.4rem 0.6rem', borderRadius: '4px', flexWrap: 'wrap' }}>
                          <div>Straight: <strong>{rec.straightLineDistanceKm} km</strong></div>
                          {rec.roadDistanceKm && <div>Road: <strong>{rec.roadDistanceKm} km</strong></div>}
                          {rec.estimatedDurationMinutes && <div>Est: <strong>~{rec.estimatedDurationMinutes} mins</strong></div>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.68rem', color: rec.routingStatus === 'OSRM_ROAD_NETWORK' ? '#34d399' : '#fbbf24' }}>
                            {rec.routingStatus === 'OSRM_ROAD_NETWORK' ? '🛣️ OSRM Road Geometry' : '⚡ Geodesic Corridor'}
                          </span>

                          <div style={{ display: 'flex', gap: '0.45rem' }}>
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.72rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                textDecoration: 'none',
                                color: '#38bdf8',
                                borderColor: 'rgba(56, 189, 248, 0.4)',
                              }}
                              title="Open turn-by-turn directions in Google Maps"
                            >
                              <ExternalLink size={12} />
                              <span>Google Maps</span>
                            </a>

                            <button
                              onClick={() => handlePlotRoute(rec)}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
                            >
                              Plot on Map
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Prominent Evacuation Route Safety Advisory */}
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.12)',
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      <AlertTriangle size={15} color="#f59e0b" />
                      <span>OFFICIAL EVACUATION SAFETY ADVISORY</span>
                    </div>
                    Evacuation corridors are simulated using road network geometry (OSRM) and geodesic calculations. <strong>These routes DO NOT reflect dynamic flash flood inundation, breached river embankments, coastal storm surges, or downed power transmission lines.</strong> Evacuees must verify road passability with local District Disaster Management Authorities (DDMA Toll-Free: <strong>1077</strong> / Emergency: <strong>112</strong>) or TNSDMA before transit.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#64748b', fontSize: '0.78rem' }}>
                  Click "Recalculate" to find nearest available shelters.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
