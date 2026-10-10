import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LiveWeatherObservation, Shelter, OfficialCycloneSystem } from '../types';
import { Layers } from 'lucide-react';

interface MapViewProps {
  weatherStations: LiveWeatherObservation[];
  shelters: Shelter[];
  cycloneSystems?: OfficialCycloneSystem[];
  selectedStationId?: string;
  onSelectStation?: (stationId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  weatherStations,
  shelters,
  cycloneSystems = [],
  selectedStationId,
  onSelectStation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const weatherLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const cycloneLayerRef = useRef<L.LayerGroup | null>(null);

  const [showWeather, setShowWeather] = useState(true);
  const [showShelters, setShowShelters] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered on Tamil Nadu coastal region
    const map = L.map(mapContainerRef.current, {
      center: [11.6, 80.0],
      zoom: 7,
      minZoom: 5,
      maxZoom: 14,
    });

    // Dark-themed friendly or standard OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    weatherLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    cycloneLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Weather Station Markers
  useEffect(() => {
    if (!weatherLayerRef.current || !mapInstanceRef.current) return;

    weatherLayerRef.current.clearLayers();

    if (!showWeather) return;

    weatherStations.forEach((station) => {
      const isSelected = station.stationId === selectedStationId;

      const markerHtml = `
        <div style="
          background: ${isSelected ? '#38bdf8' : '#0284c7'};
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px rgba(2, 132, 199, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
        ">
          ${Math.round(station.temperatureCelsius)}°
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-weather-marker',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: #38bdf8; font-size: 14px;">${station.locationName}</strong>
            <span style="background: rgba(14, 165, 233, 0.2); color: #38bdf8; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 99px;">
              LIVE API
            </span>
          </div>
          <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
            <div>🌡️ <strong>Temp:</strong> ${station.temperatureCelsius.toFixed(1)}°C (Feels ${station.apparentTemperatureCelsius.toFixed(1)}°C)</div>
            <div>💨 <strong>Wind:</strong> ${station.windSpeedKmh.toFixed(1)} km/h (Gusts: ${station.windGustsKmh.toFixed(1)} km/h)</div>
            <div>🌧️ <strong>Rain:</strong> ${station.rainfallMm.toFixed(1)} mm/h</div>
            <div>⏱️ <strong>Pressure:</strong> ${station.surfacePressureHpa.toFixed(1)} hPa</div>
            <div>⚠️ <strong>Risk Assessment:</strong> <span style="color: ${station.cycloneRiskIndex === 'NORMAL' ? '#10b981' : '#f59e0b'}; font-weight: 600;">${station.cycloneRiskIndex}</span></div>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 6px; border-top: 1px solid #24344d; padding-top: 4px;">
            Source: Open-Meteo • Last: ${new Date(station.metadata.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectStation) onSelectStation(station.stationId);
      });

      marker.addTo(weatherLayerRef.current!);
    });
  }, [weatherStations, selectedStationId, showWeather, onSelectStation]);

  // Update Operational Shelter Markers
  useEffect(() => {
    if (!sheltersLayerRef.current || !mapInstanceRef.current) return;

    sheltersLayerRef.current.clearLayers();

    if (!showShelters) return;

    shelters.forEach((shelter) => {
      const markerHtml = `
        <div style="
          background: #d97706;
          width: 22px;
          height: 22px;
          border-radius: 4px;
          border: 2px solid #fef3c7;
          box-shadow: 0 0 8px rgba(217, 119, 6, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
        ">
          🏠
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-shelter-marker',
        html: markerHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([shelter.latitude, shelter.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: inherit; min-width: 220px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: #fbbf24; font-size: 13px;">${shelter.name}</strong>
            <span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 99px;">
              OPERATIONAL
            </span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5;">
            <div>📍 ${shelter.address}</div>
            <div>👥 <strong>Capacity:</strong> ${shelter.totalCapacity} (Current: ${shelter.currentOccupancy})</div>
            <div>⚡ <strong>Generator:</strong> ${shelter.facilities.hasGenerator ? 'Yes' : 'No'} | <strong>Medical:</strong> ${shelter.facilities.hasMedicalPost ? 'Yes' : 'No'}</div>
            <div>📞 <strong>Contact:</strong> ${shelter.contactPerson} (${shelter.contactPhone})</div>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 6px; border-top: 1px solid #24344d; padding-top: 4px;">
            Managed by: ${shelter.dataSource}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(sheltersLayerRef.current!);
    });
  }, [shelters, showShelters]);

  // Update Official Cyclone Tracks (strictly when valid verified data exists)
  useEffect(() => {
    if (!cycloneLayerRef.current || !mapInstanceRef.current) return;

    cycloneLayerRef.current.clearLayers();

    if (cycloneSystems && cycloneSystems.length > 0) {
      cycloneSystems.forEach((sys) => {
        if (sys.tracks && sys.tracks.length > 0) {
          const latlngs: [number, number][] = sys.tracks.map((t) => [t.latitude, t.longitude]);
          const polyline = L.polyline(latlngs, {
            color: '#ef4444',
            weight: 3,
            dashArray: '5, 5',
          });
          polyline.bindPopup(`<strong>${sys.name}</strong> (${sys.classification}) - Track`);
          polyline.addTo(cycloneLayerRef.current!);
        }
      });
    }
  }, [cycloneSystems]);

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>
            Tamil Nadu Coastal Geospatial Operational Map
          </h3>
        </div>

        {/* Layer Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#38bdf8' }}>
            <input
              type="checkbox"
              checked={showWeather}
              onChange={(e) => setShowWeather(e.target.checked)}
            />
            <span>Live Coastal Stations (Open-Meteo)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#fbbf24' }}>
            <input
              type="checkbox"
              checked={showShelters}
              onChange={(e) => setShowShelters(e.target.checked)}
            />
            <span>Operational Shelters (Ground Ops)</span>
          </label>
        </div>
      </div>

      <div ref={mapContainerRef} className="map-container" />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.5rem',
        fontSize: '0.72rem',
        color: '#64748b',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          🗺️ Leaflet / OpenStreetMap Base Map • Focused on Tamil Nadu coastline corridor
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>🔵 Coastal Station (Click for live data)</span>
          <span>🏠 Emergency Shelter</span>
        </div>
      </div>
    </div>
  );
};
