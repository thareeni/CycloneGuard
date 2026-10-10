import React from 'react';
import {
  LiveWeatherObservation,
  CycloneStatusResponse,
  Shelter,
  NavigationTab,
} from '../types';
import { LiveWeatherCard } from '../components/LiveWeatherCard';
import { CycloneStatusBanner } from '../components/CycloneStatusBanner';
import { DataSourceLegend } from '../components/DataSourceLegend';
import { MapView } from '../components/MapView';
import {
  Wind,
  Gauge,
  CloudRain,
  AlertTriangle,
  ArrowRight,
  Droplets,
} from 'lucide-react';

interface DashboardViewProps {
  stations: LiveWeatherObservation[];
  selectedStation: LiveWeatherObservation | undefined;
  onSelectStation: (stationId: string) => void;
  cycloneData: CycloneStatusResponse | null;
  shelters: Shelter[];
  onNavigateTab: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  cycloneData,
  shelters,
  onNavigateTab,
}) => {
  // Aggregate Risk Metrics
  const maxWind = stations.length > 0
    ? Math.max(...stations.map((s) => s.windSpeedKmh))
    : 0;
  const maxGust = stations.length > 0
    ? Math.max(...stations.map((s) => s.windGustsKmh))
    : 0;
  const minPressure = stations.length > 0
    ? Math.min(...stations.filter((s) => s.surfacePressureHpa > 0).map((s) => s.surfacePressureHpa))
    : 1012;
  const highRiskStations = stations.filter(
    (s) => s.cycloneRiskIndex === 'HIGH' || s.cycloneRiskIndex === 'CRITICAL'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Provenance Legend */}
      <DataSourceLegend />

      {/* Official IMD Cyclone Status / Warnings */}
      <CycloneStatusBanner cycloneData={cycloneData} />

      {/* Coastal Risk Overview KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        {/* Stations Monitored */}
        <div className="card" style={{ padding: '1rem', background: '#11192a' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.3rem' }}>
            Monitored Coastal Stations
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
            {stations.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>Locations</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            Chennai, Nagapattinam, Cuddalore corridor
          </div>
        </div>

        {/* Max Sustained Wind */}
        <div className="card" style={{ padding: '1rem', background: '#11192a' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.3rem' }}>
            Peak Sustained Wind
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: maxWind > 45 ? '#f59e0b' : '#f8fafc' }}>
            {maxWind.toFixed(1)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>km/h</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            Peak gust recorded: {maxGust.toFixed(1)} km/h
          </div>
        </div>

        {/* Lowest Surface Pressure */}
        <div className="card" style={{ padding: '1rem', background: '#11192a' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.3rem' }}>
            Lowest Barometric Pressure
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: minPressure < 1005 ? '#f59e0b' : '#f8fafc' }}>
            {minPressure > 0 ? minPressure.toFixed(1) : '—'} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>hPa</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            {minPressure < 1005 ? '⚠️ Atmospheric depression alert' : 'Nominal coastal isobar gradient'}
          </div>
        </div>

        {/* High Risk Alerts */}
        <div className="card" style={{ padding: '1rem', background: '#11192a' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.3rem' }}>
            High / Critical Risk Stations
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: highRiskStations.length > 0 ? '#ef4444' : '#10b981' }}>
            {highRiskStations.length}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: highRiskStations.length > 0 ? '#ef4444' : '#10b981' }}>
              {highRiskStations.length > 0 ? 'Alert Active' : 'All Normal'}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            {highRiskStations.length > 0 ? 'Vigilance advised for fishermen' : 'No emergency thresholds breached'}
          </div>
        </div>
      </div>

      {/* Selected Location Latest Weather Details Spotlight */}
      {selectedStation && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, #131d2e 0%, #0e1624 100%)',
          border: '1px solid #1e2e47',
          padding: '1.5rem',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-live">
                  <span className="pulse-dot"></span> LIVE OPEN-METEO
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: selectedStation.cycloneRiskIndex === 'NORMAL' ? '#10b981' : '#f59e0b',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.25rem',
                }}>
                  {selectedStation.cycloneRiskIndex} RISK
                </span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                {selectedStation.locationName}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {selectedStation.district} District • Coordinates: {selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
                {selectedStation.temperatureCelsius.toFixed(1)}°C
              </div>
              <div style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>
                {selectedStation.weatherCondition} (Feels {selectedStation.apparentTemperatureCelsius.toFixed(1)}°C)
              </div>
            </div>
          </div>

          {/* Metric Blocks Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ background: '#090e1a', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1a273b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                <Wind size={15} color="#38bdf8" /> 10m Wind Speed
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                {selectedStation.windSpeedKmh.toFixed(1)} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>km/h</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Bearing: {selectedStation.windDirectionDeg}°
              </div>
            </div>

            <div style={{ background: '#090e1a', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1a273b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                <AlertTriangle size={15} color="#f59e0b" /> Peak Gusts
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                {selectedStation.windGustsKmh.toFixed(1)} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>km/h</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Structural turbulence potential
              </div>
            </div>

            <div style={{ background: '#090e1a', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1a273b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                <CloudRain size={15} color="#60a5fa" /> Hourly Rainfall
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                {selectedStation.rainfallMm.toFixed(1)} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>mm/h</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Precip: {selectedStation.precipitationMm.toFixed(1)} mm
              </div>
            </div>

            <div style={{ background: '#090e1a', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1a273b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                <Gauge size={15} color="#a78bfa" /> Barometric Pressure
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                {selectedStation.surfacePressureHpa.toFixed(1)} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>hPa</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Cyclone depression indicator
              </div>
            </div>

            <div style={{ background: '#090e1a', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1a273b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                <Droplets size={15} color="#38bdf8" /> Relative Humidity
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                {selectedStation.humidityPct}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                WMO code: {selectedStation.weatherCode}
              </div>
            </div>
          </div>

          {/* Provenance and Quick Navigation Strip */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#64748b',
            borderTop: '1px solid #1a273b',
            paddingTop: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <div>
              Data source: <strong style={{ color: '#cbd5e1' }}>{selectedStation.metadata.source}</strong> •
              Last synchronized: <strong style={{ color: '#cbd5e1' }}>{new Date(selectedStation.metadata.lastUpdated).toLocaleTimeString()} IST</strong>
            </div>

            <button
              onClick={() => onNavigateTab('risk-assessment')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <span>View Rule-Based Risk Assessment</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Coastal Weather Summary Cards */}
      <section>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              Tamil Nadu Coastal Weather Stations
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Click any station to focus detailed telemetry and synchronize map inspection.
            </p>
          </div>
        </div>

        <div className="grid-cards">
          {stations.map((st) => (
            <LiveWeatherCard
              key={st.stationId}
              observation={st}
              isSelected={st.stationId === selectedStation?.stationId}
              onSelect={() => onSelectStation(st.stationId)}
            />
          ))}
        </div>
      </section>

      {/* Small Interactive Map Preview with Jump Button */}
      <section>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              Geospatial Operations Preview
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Interactive preview map of coastal telemetry stations and emergency shelters.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('live-map')}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          >
            <span>Open Full Interactive Map & Tracking</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ height: '360px' }}>
          <MapView
            weatherStations={stations}
            shelters={shelters}
            cycloneSystems={cycloneData?.systems}
            selectedStationId={selectedStation?.stationId}
            onSelectStation={onSelectStation}
          />
        </div>
      </section>
    </div>
  );
};
