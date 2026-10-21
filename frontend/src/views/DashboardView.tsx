import React, { useState } from 'react';
import {
  LiveWeatherObservation,
  CycloneStatusResponse,
  Shelter,
  NavigationTab,
  CoastalDistrict,
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
  MapPin,
  ExternalLink,
  Phone,
} from 'lucide-react';

interface DashboardViewProps {
  stations: LiveWeatherObservation[];
  selectedStation: LiveWeatherObservation | undefined;
  onSelectStation: (stationId: string) => void;
  cycloneData: CycloneStatusResponse | null;
  shelters: Shelter[];
  onNavigateTab: (tab: NavigationTab) => void;
  districts?: CoastalDistrict[];
  selectedDistrict?: string;
  onSelectDistrict?: (districtName: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  cycloneData,
  shelters,
  onNavigateTab,
  districts = [],
  selectedDistrict = 'ALL',
  onSelectDistrict,
}) => {
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'NORTH' | 'DELTA' | 'SOUTH'>('ALL');

  const normalizeDistrict = (name?: string) => {
    if (!name) return '';
    const clean = name.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.includes('kanya') || clean.includes('kanni')) return 'kanniyakumari';
    return clean;
  };

  const isDistrictFiltered = selectedDistrict !== 'ALL';

  const activeDistrictObj = districts.find(
    (d) => normalizeDistrict(d.name) === normalizeDistrict(selectedDistrict)
  );

  const displayedShelters = isDistrictFiltered
    ? shelters.filter((s) => normalizeDistrict(s.districtName) === normalizeDistrict(selectedDistrict))
    : shelters;

  const districtStations = isDistrictFiltered
    ? stations.filter((st) => normalizeDistrict(st.district) === normalizeDistrict(selectedDistrict))
    : stations;

  const displayedStations = isDistrictFiltered
    ? districtStations
    : stations.filter((st) => {
        if (zoneFilter === 'ALL') return true;
        const id = st.stationId.toLowerCase();
        if (zoneFilter === 'NORTH') {
          return ['chennai', 'tiruvallur', 'chengalpattu', 'villupuram'].includes(id);
        }
        if (zoneFilter === 'DELTA') {
          return ['cuddalore', 'mayiladuthurai', 'nagapattinam'].includes(id);
        }
        if (zoneFilter === 'SOUTH') {
          return ['tiruvarur', 'thanjavur', 'pudukkottai', 'rameshwaram', 'thoothukudi', 'tirunelveli', 'kanyakumari'].includes(id);
        }
        return true;
      });

  // Aggregate Risk Metrics (based on active set)
  const activeMetricsPool = displayedStations.length > 0 ? displayedStations : stations;
  const maxWind = activeMetricsPool.length > 0
    ? Math.max(...activeMetricsPool.map((s) => s.windSpeedKmh))
    : 0;
  const maxGust = activeMetricsPool.length > 0
    ? Math.max(...activeMetricsPool.map((s) => s.windGustsKmh))
    : 0;
  const minPressure = activeMetricsPool.length > 0
    ? Math.min(...activeMetricsPool.filter((s) => s.surfacePressureHpa > 0).map((s) => s.surfacePressureHpa))
    : 1012;
  const highRiskStations = activeMetricsPool.filter(
    (s) => s.cycloneRiskIndex === 'HIGH' || s.cycloneRiskIndex === 'CRITICAL'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Provenance Legend */}
      <DataSourceLegend />

      {/* Official IMD Cyclone Status / Warnings */}
      <CycloneStatusBanner cycloneData={cycloneData} />

      {/* District Operational Status Banner */}
      {selectedDistrict !== 'ALL' && activeDistrictObj && (
        <div
          style={{
            background: 'linear-gradient(135deg, #0e1e38 0%, #0d1527 100%)',
            border: '1px solid #2563eb',
            borderRadius: '0.5rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-official">DISTRICT OPERATIONAL FOCUS</span>
              {activeDistrictObj.isHighRiskZone && (
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                  ⚠️ HIGH RISK COASTAL ZONE
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
              {activeDistrictObj.name} District Command
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Headquarters: <strong style={{ color: '#cbd5e1' }}>{activeDistrictObj.headquarters}</strong> •
              Zone: <span style={{ color: '#38bdf8' }}>{activeDistrictObj.coastalZone}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#162238', padding: '0.5rem 0.85rem', borderRadius: '0.375rem', border: '1px solid #243552' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Emergency Control Room:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Phone size={13} /> {activeDistrictObj.emergencyControlRoomPhone}
              </div>
            </div>

            <div style={{ background: '#162238', padding: '0.5rem 0.85rem', borderRadius: '0.375rem', border: '1px solid #243552' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Shelters in District:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: displayedShelters.length > 0 ? '#34d399' : '#fbbf24' }}>
                {displayedShelters.length} Shelters ({displayedShelters.reduce((acc: number, s: Shelter) => acc + s.availableCapacity, 0)} available spaces)
              </div>
            </div>
          </div>
        </div>
      )}

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
            {isDistrictFiltered ? displayedStations.length : stations.length}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>
              {isDistrictFiltered ? (displayedStations.length === 1 ? 'Station' : 'Stations') : 'Locations'}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            {isDistrictFiltered
              ? `Operational monitoring in ${selectedDistrict} district`
              : 'Across 14 coastal monitoring stations in Tamil Nadu'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                <span className="badge badge-live">
                  <span className="pulse-dot"></span> LIVE OPEN-METEO
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: (selectedStation.cycloneScore ?? selectedStation.riskScore) >= 50 ? '#f87171' : '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.25rem',
                }}>
                  Cyclone Impact: {selectedStation.cycloneScore ?? selectedStation.riskScore ?? 12}/100 ({selectedStation.cycloneCategory ?? 'LOW'})
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: (selectedStation.rainfallScore ?? 8) >= 50 ? '#60a5fa' : '#34d399',
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.25rem',
                }}>
                  Rainfall Impact: {selectedStation.rainfallScore ?? 8}/100 ({selectedStation.rainfallCategory ?? 'LOW'})
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
                {selectedStation.rainfallDescription || (selectedStation.precipitationMm > 0 ? `Precip: ${selectedStation.precipitationMm.toFixed(1)} mm` : 'Nil precipitation')}
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

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => onNavigateTab('live-map')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                <MapPin size={13} color="#38bdf8" />
                <span>Focus on Map</span>
              </button>

              <button
                onClick={() => onNavigateTab('risk-assessment')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                <span>View Risk Assessment</span>
                <ArrowRight size={13} />
              </button>
            </div>
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

          {/* Filter Controls: District Alert Chip or Coastal Zone Filter Chips */}
          {isDistrictFiltered ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid #0284c7',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                }}
              >
                District Focus: <strong>{selectedDistrict}</strong> ({displayedStations.length} station, {displayedShelters.length} shelters)
              </span>
              {onSelectDistrict && (
                <button
                  onClick={() => onSelectDistrict('ALL')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                >
                  Show All Districts
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setZoneFilter('ALL')}
                style={{
                  background: zoneFilter === 'ALL' ? 'rgba(14, 165, 233, 0.2)' : '#162238',
                  border: zoneFilter === 'ALL' ? '1px solid #38bdf8' : '1px solid #283e60',
                  color: zoneFilter === 'ALL' ? '#38bdf8' : '#cbd5e1',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: zoneFilter === 'ALL' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                All ({stations.length})
              </button>
              <button
                onClick={() => setZoneFilter('NORTH')}
                style={{
                  background: zoneFilter === 'NORTH' ? 'rgba(14, 165, 233, 0.2)' : '#162238',
                  border: zoneFilter === 'NORTH' ? '1px solid #38bdf8' : '1px solid #283e60',
                  color: zoneFilter === 'NORTH' ? '#38bdf8' : '#cbd5e1',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: zoneFilter === 'NORTH' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                North Coast (4)
              </button>
              <button
                onClick={() => setZoneFilter('DELTA')}
                style={{
                  background: zoneFilter === 'DELTA' ? 'rgba(14, 165, 233, 0.2)' : '#162238',
                  border: zoneFilter === 'DELTA' ? '1px solid #38bdf8' : '1px solid #283e60',
                  color: zoneFilter === 'DELTA' ? '#38bdf8' : '#cbd5e1',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: zoneFilter === 'DELTA' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                Central Delta (3)
              </button>
              <button
                onClick={() => setZoneFilter('SOUTH')}
                style={{
                  background: zoneFilter === 'SOUTH' ? 'rgba(14, 165, 233, 0.2)' : '#162238',
                  border: zoneFilter === 'SOUTH' ? '1px solid #38bdf8' : '1px solid #283e60',
                  color: zoneFilter === 'SOUTH' ? '#38bdf8' : '#cbd5e1',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: zoneFilter === 'SOUTH' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                Palk Bay & South (7)
              </button>
            </div>
          )}
        </div>

        {displayedStations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
            <CloudRain size={32} color="#38bdf8" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ color: '#f1f5f9', marginBottom: '0.25rem', fontSize: '1rem' }}>
              No Coastal Weather Stations to Display
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {isDistrictFiltered
                ? `No weather monitoring station is currently mapped for ${selectedDistrict} district.`
                : 'Coastal weather observations are currently synchronizing with Open-Meteo telemetry services.'}
            </p>
          </div>
        ) : (
          <div className="grid-cards">
            {displayedStations.map((st) => (
              <LiveWeatherCard
                key={st.stationId}
                observation={st}
                isSelected={st.stationId.toLowerCase() === selectedStation?.stationId.toLowerCase()}
                onSelect={() => onSelectStation(st.stationId)}
              />
            ))}
          </div>
        )}
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
            <ExternalLink size={14} />
          </button>
        </div>

        <MapView
          weatherStations={displayedStations}
          shelters={displayedShelters}
          cycloneSystems={cycloneData?.systems}
          selectedStationId={selectedStation?.stationId}
          onSelectStation={onSelectStation}
          selectedDistrict={selectedDistrict}
        />
      </section>
    </div>
  );
};
