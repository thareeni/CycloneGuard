import React from 'react';
import { Wind, Droplets, Gauge, CloudRain, Compass, AlertCircle } from 'lucide-react';
import { LiveWeatherObservation } from '../types';

interface LiveWeatherCardProps {
  observation: LiveWeatherObservation;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const LiveWeatherCard: React.FC<LiveWeatherCardProps> = ({
  observation,
  isSelected,
  onSelect,
}) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'ELEVATED': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const riskColor = getRiskColor(observation.cycloneRiskIndex);

  return (
    <div
      onClick={onSelect}
      className="card"
      style={{
        cursor: onSelect ? 'pointer' : 'default',
        border: isSelected ? '1px solid #38bdf8' : '1px solid #24344d',
        background: isSelected ? 'rgba(22, 32, 50, 0.95)' : 'rgba(17, 24, 39, 0.85)',
        boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.2)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        {/* Header: Name + Live Badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
              {observation.locationName}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {observation.district} District • {observation.latitude.toFixed(2)}°N, {observation.longitude.toFixed(2)}°E
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
            <span className="badge badge-live">
              <span className="pulse-dot"></span> LIVE API
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: riskColor,
                background: `rgba(${riskColor === '#ef4444' ? '239, 68, 68' : '16, 185, 129'}, 0.12)`,
                padding: '0.15rem 0.45rem',
                borderRadius: '0.25rem',
              }}
            >
              {observation.cycloneRiskIndex} RISK
            </span>
          </div>
        </div>

        {/* Primary Metrics: Temp & Weather */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          border: '1px solid rgba(36, 52, 77, 0.6)',
        }}>
          <div>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
              {observation.temperatureCelsius.toFixed(1)}°C
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
              Feels {observation.apparentTemperatureCelsius.toFixed(1)}°C
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8', display: 'block' }}>
              {observation.weatherCondition}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              WMO Code {observation.weatherCode}
            </span>
          </div>
        </div>

        {/* Detailed Grid: Wind, Gusts, Rain, Pressure */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.65rem',
          marginBottom: '1rem',
        }}>
          {/* Wind Speed */}
          <div style={{ background: '#0d1524', padding: '0.6rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #1c2a3f' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
              <Wind size={14} color="#38bdf8" /> Wind Speed (10m)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: observation.windSpeedKmh > 40 ? '#f59e0b' : '#f1f5f9' }}>
              {observation.windSpeedKmh.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>km/h</span>
            </div>
          </div>

          {/* Wind Gusts */}
          <div style={{ background: '#0d1524', padding: '0.6rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #1c2a3f' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
              <AlertCircle size={14} color="#f59e0b" /> Peak Gusts
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: observation.windGustsKmh > 50 ? '#ef4444' : '#f1f5f9' }}>
              {observation.windGustsKmh.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>km/h</span>
            </div>
          </div>

          {/* Rainfall */}
          <div style={{ background: '#0d1524', padding: '0.6rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #1c2a3f' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
              <CloudRain size={14} color="#60a5fa" /> Current Rain
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: observation.rainfallMm > 10 ? '#38bdf8' : '#f1f5f9' }}>
              {observation.rainfallMm.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>mm/h</span>
            </div>
          </div>

          {/* Surface Pressure */}
          <div style={{ background: '#0d1524', padding: '0.6rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #1c2a3f' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
              <Gauge size={14} color="#a78bfa" /> Barometric Pressure
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: observation.surfacePressureHpa < 1005 ? '#f59e0b' : '#f1f5f9' }}>
              {observation.surfacePressureHpa.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>hPa</span>
            </div>
          </div>
        </div>

        {/* Secondary: Humidity & Direction */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94a3b8', padding: '0 0.2rem', marginBottom: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Droplets size={13} color="#38bdf8" /> Humidity: <strong style={{ color: '#cbd5e1' }}>{observation.humidityPct}%</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Compass size={13} color="#94a3b8" /> Bearing: <strong style={{ color: '#cbd5e1' }}>{observation.windDirectionDeg}°</strong>
          </span>
        </div>

        {/* Hourly Forecast Strip */}
        {observation.hourlyForecast.length > 0 && (
          <div style={{
            background: 'rgba(10, 16, 28, 0.6)',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #1a273b',
          }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', fontWeight: 600 }}>
              Forecast Trend (Next 6h)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.25rem', overflowX: 'auto' }}>
              {observation.hourlyForecast.slice(0, 6).map((fc, i) => (
                <div key={i} style={{ textAlign: 'center', minWidth: '40px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                    {fc.time.split('T')[1]?.slice(0, 5) || fc.time}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#f1f5f9' }}>
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
      </div>

      {/* Footer Provenance Stamp */}
      <div style={{
        marginTop: '0.85rem',
        paddingTop: '0.6rem',
        borderTop: '1px solid #1a273b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.68rem',
        color: '#64748b',
      }}>
        <span>Source: <strong>Open-Meteo</strong></span>
        <span>{observation.metadata.cached ? '⚡ Cached (Redis)' : '🟢 Fresh API'}</span>
      </div>
    </div>
  );
};
