import React, { useState } from 'react';
import {
  LiveWeatherObservation,
  CycloneStatusResponse,
  Shelter,
} from '../types';
import { MapView } from '../components/MapView';
import {
  Wind,
  Gauge,
  CloudRain,
  Droplets,
  Compass,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface LiveMapViewProps {
  stations: LiveWeatherObservation[];
  selectedStation: LiveWeatherObservation | undefined;
  onSelectStation: (stationId: string) => void;
  cycloneData: CycloneStatusResponse | null;
  shelters: Shelter[];
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  cycloneData,
  shelters,
}) => {
  const [activeSideTab, setActiveSideTab] = useState<'station' | 'cyclone'>('station');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
            Live Geospatial Map & Cyclone Tracking
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Interactive Bay of Bengal coastal corridor mapping • Real-time station telemetry & verified IMD RSMC storm feeds.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-live">
            <span className="pulse-dot"></span> LEAFLET / OSM ACTIVE
          </span>
          <span className="badge badge-official">
            IMD RSMC GATEWAY
          </span>
        </div>
      </div>

      {/* Main Split Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(340px, 0.9fr)',
        gap: '1.25rem',
      }}>
        {/* Left: Map View */}
        <div>
          <MapView
            weatherStations={stations}
            shelters={shelters}
            cycloneSystems={cycloneData?.systems}
            selectedStationId={selectedStation?.stationId}
            onSelectStation={onSelectStation}
          />

          {/* Quick Station Jump Strip below map */}
          <div className="card" style={{ padding: '0.85rem 1rem', marginTop: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.65rem',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Coastal Monitoring Stations ({stations.length})
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Click to pan map & inspect telemetry
              </span>
            </div>
            <div style={{
              display: 'flex',
              gap: '0.45rem',
              flexWrap: 'wrap',
              maxHeight: '120px',
              overflowY: 'auto',
              paddingRight: '0.2rem',
            }}>
              {stations.map((st) => {
                const isSelected = st.stationId.toLowerCase() === selectedStation?.stationId.toLowerCase();
                return (
                  <button
                    key={st.stationId}
                    onClick={() => onSelectStation(st.stationId)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.375rem',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid #24344d',
                      background: isSelected ? 'rgba(14, 165, 233, 0.25)' : '#0d1524',
                      color: isSelected ? '#38bdf8' : '#cbd5e1',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>📍 {st.district}</span>
                    <strong style={{ color: isSelected ? '#ffffff' : '#94a3b8' }}>{Math.round(st.temperatureCelsius)}°C</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Inspection & Tracking Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Subtabs for Side Panel */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #1a273b',
            gap: '0.5rem',
            paddingBottom: '0.5rem',
          }}>
            <button
              onClick={() => setActiveSideTab('station')}
              className={`tab-btn ${activeSideTab === 'station' ? 'active' : ''}`}
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
            >
              Selected Location Details
            </button>
            <button
              onClick={() => setActiveSideTab('cyclone')}
              className={`tab-btn ${activeSideTab === 'cyclone' ? 'active' : ''}`}
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
            >
              Cyclone Tracking Feeds
            </button>
          </div>

          {activeSideTab === 'station' ? (
            /* Location Details Panel */
            selectedStation ? (
              <div className="card" style={{ padding: '1.25rem', background: '#0e1627' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span className="badge badge-live" style={{ marginBottom: '0.3rem' }}>
                      <span className="pulse-dot"></span> LIVE OPEN-METEO
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                      {selectedStation.locationName}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {selectedStation.district} District • {selectedStation.latitude.toFixed(2)}°N, {selectedStation.longitude.toFixed(2)}°E
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9' }}>
                      {selectedStation.temperatureCelsius.toFixed(1)}°C
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Feels {selectedStation.apparentTemperatureCelsius.toFixed(1)}°C
                    </div>
                  </div>
                </div>

                {/* Primary Condition & Risk Tag */}
                <div style={{
                  background: '#090e1a',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #1a273b',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38bdf8' }}>
                      {selectedStation.weatherCondition}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      WMO Weather Code: {selectedStation.weatherCode}
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: selectedStation.cycloneRiskIndex === 'NORMAL' ? '#10b981' : '#f59e0b',
                    background: selectedStation.cycloneRiskIndex === 'NORMAL' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.25rem',
                  }}>
                    {selectedStation.cycloneRiskIndex} RISK
                  </span>
                </div>

                {/* Comprehensive Metrics List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#090e1a', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Wind size={14} color="#38bdf8" /> 10m Wind Speed
                    </span>
                    <strong style={{ color: '#f8fafc' }}>{selectedStation.windSpeedKmh.toFixed(1)} km/h</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#090e1a', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={14} color="#f59e0b" /> Peak Gust Speed
                    </span>
                    <strong style={{ color: selectedStation.windGustsKmh > 50 ? '#ef4444' : '#f8fafc' }}>
                      {selectedStation.windGustsKmh.toFixed(1)} km/h
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#090e1a', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Gauge size={14} color="#a78bfa" /> Barometric Pressure
                    </span>
                    <strong style={{ color: '#f8fafc' }}>{selectedStation.surfacePressureHpa.toFixed(1)} hPa</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#090e1a', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CloudRain size={14} color="#60a5fa" /> Current Rainfall
                    </span>
                    <strong style={{ color: '#f8fafc' }}>{selectedStation.rainfallMm.toFixed(1)} mm/h</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#090e1a', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Droplets size={14} color="#38bdf8" /> Relative Humidity
                    </span>
                    <strong style={{ color: '#f8fafc' }}>{selectedStation.humidityPct}%</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#090e1a', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Compass size={14} color="#94a3b8" /> Wind Direction / Bearing
                    </span>
                    <strong style={{ color: '#f8fafc' }}>{selectedStation.windDirectionDeg}°</strong>
                  </div>
                </div>

                {/* Hourly Trend Mini Sparkline */}
                {selectedStation.hourlyForecast.length > 0 && (
                  <div style={{ background: '#090e1a', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Hourly Trend (Next 6 Hours)
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.25rem' }}>
                      {selectedStation.hourlyForecast.slice(0, 6).map((fc, i) => (
                        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            {fc.time.split('T')[1]?.slice(0, 5)}
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                            {Math.round(fc.temperature)}°
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#38bdf8' }}>
                            {fc.windSpeed.toFixed(0)}k
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Provenance Stamp */}
                <div style={{
                  borderTop: '1px solid #1a273b',
                  paddingTop: '0.75rem',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>Source: <strong style={{ color: '#cbd5e1' }}>{selectedStation.metadata.source}</strong></span>
                  <span>Updated: {new Date(selectedStation.metadata.lastUpdated).toLocaleTimeString()} IST</span>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                Click a coastal marker on the map to inspect live telemetry.
              </div>
            )
          ) : (
            /* Cyclone Tracking Panel */
            <div className="card" style={{ padding: '1.25rem', background: '#0e1627' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <ShieldAlert size={20} color="#818cf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Official IMD RSMC Cyclone Feeds
                </h3>
              </div>

              {cycloneData?.integration.status === 'ACTIVE_CYCLONE_TRACKED' && cycloneData.activeSystemsCount > 0 ? (
                <div>
                  <div className="badge" style={{ background: '#ef4444', color: '#fff', marginBottom: '0.75rem' }}>
                    ACTIVE TROPICAL CYCLONE
                  </div>
                  {cycloneData.systems.map((sys, idx) => (
                    <div key={idx} style={{ background: '#090e1a', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                      <h4 style={{ color: '#f87171', fontWeight: 700 }}>{sys.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Classification: {sys.classification}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Basin: {sys.basin}</p>
                      {sys.currentPosition && (
                        <p style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                          Position: {sys.currentPosition.latitude}°N, {sys.currentPosition.longitude}°E | Max Winds: {sys.currentPosition.maxSustainedWindKmh} km/h
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : cycloneData?.integration.status === 'NO_ACTIVE_CYCLONE' ? (
                <div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, marginBottom: '0.3rem' }}>
                      <ShieldCheck size={18} /> Verified: No Active Storm Systems
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      Official IMD RSMC New Delhi observation bulletins report no tropical depressions or cyclones currently active in the Bay of Bengal basin.
                    </p>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Verified via: api.imd.gov.in • Checked at: {new Date(cycloneData.integration.lastCheckedAt).toLocaleTimeString()} IST
                  </div>
                </div>
              ) : (
                /* Pending Credentials */
                <div>
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                      <Info size={16} /> Official IMD Credentials Required
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45, marginBottom: '0.75rem' }}>
                      The integration interface is fully implemented and active in CycloneGuard. In adherence to disaster management safety standards, <strong style={{ color: '#fbbf24' }}>no fake or simulated cyclone paths are generated</strong>.
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      To activate live RSMC bulletins:
                      <ol style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                        <li>Register on <a href="https://api.imd.gov.in" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>api.imd.gov.in</a></li>
                        <li>Contact Nodal Officer Dr. Sankar Nath (<code>sankar.nath@imd.gov.in</code>)</li>
                        <li>Add <code>IMD_API_KEY</code> to <code>backend/.env</code></li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
