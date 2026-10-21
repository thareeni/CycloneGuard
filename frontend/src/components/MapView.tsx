import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LiveWeatherObservation, Shelter, OfficialCycloneSystem } from '../types';
import { Layers, Navigation } from 'lucide-react';

interface MapViewProps {
  weatherStations: LiveWeatherObservation[];
  shelters: Shelter[];
  cycloneSystems?: OfficialCycloneSystem[];
  selectedStationId?: string;
  onSelectStation?: (stationId: string) => void;
  activeEvacuationRoute?: [number, number][];
  activeRouteInfo?: {
    shelterName: string;
    roadDistanceKm?: number;
    durationMinutes?: number;
    isFallback?: boolean;
    disclaimer?: string;
  };
  onClearRoute?: () => void;
  userLocation?: [number, number] | null;
  selectedDistrict?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  weatherStations,
  shelters,
  cycloneSystems = [],
  selectedStationId,
  onSelectStation,
  activeEvacuationRoute,
  activeRouteInfo,
  onClearRoute,
  userLocation,
  selectedDistrict,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const weatherLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const cycloneLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);

  const [showWeather, setShowWeather] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showCycloneLayer, setShowCycloneLayer] = useState(true);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [11.1271, 79.35],
      zoom: 7,
      minZoom: 5,
      maxZoom: 14,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    weatherLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    cycloneLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    userLocationLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Invalidate size once DOM finishes initial rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fit map bounds to encompass all visible markers (shelters and weather stations)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const points: [number, number][] = [];

    if (showShelters && shelters && shelters.length > 0) {
      shelters.forEach((s) => {
        if (typeof s.latitude === 'number' && typeof s.longitude === 'number' && !isNaN(s.latitude) && !isNaN(s.longitude)) {
          points.push([s.latitude, s.longitude]);
        }
      });
    }

    if (showWeather && weatherStations && weatherStations.length > 0) {
      weatherStations.forEach((s) => {
        if (typeof s.latitude === 'number' && typeof s.longitude === 'number' && !isNaN(s.latitude) && !isNaN(s.longitude)) {
          points.push([s.latitude, s.longitude]);
        }
      });
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: selectedDistrict && selectedDistrict !== 'ALL' ? 11 : 8,
      });
    } else {
      mapInstanceRef.current.setView([11.1271, 79.35], 7);
    }
  }, [weatherStations, shelters, showWeather, showShelters, selectedDistrict]);

  // Smoothly pan to selected station
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedStationId) return;
    const target = weatherStations.find(
      (s) => s.stationId.toLowerCase() === selectedStationId.toLowerCase()
    );
    if (target) {
      mapInstanceRef.current.flyTo([target.latitude, target.longitude], 10, {
        duration: 1.0,
      });
    }
  }, [selectedStationId, weatherStations]);

  // Update Weather Station Markers
  useEffect(() => {
    if (!weatherLayerRef.current || !mapInstanceRef.current) return;
    weatherLayerRef.current.clearLayers();

    if (!showWeather) return;

    weatherStations.forEach((station) => {
      const isSelected = station.stationId.toLowerCase() === selectedStationId?.toLowerCase();
      const size = isSelected ? 34 : 26;

      const markerHtml = `
        <div style="
          background: ${isSelected ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' : '#0369a1'};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.9)'};
          box-shadow: ${isSelected ? '0 0 0 4px rgba(56, 189, 248, 0.45), 0 0 16px rgba(14, 165, 233, 0.9)' : '0 2px 6px rgba(0,0,0,0.4)'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: ${isSelected ? '12px' : '10px'};
          cursor: pointer;
        ">
          ${Math.round(station.temperatureCelsius)}°
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-weather-marker',
        html: markerHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: inherit; min-width: 210px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: #38bdf8; font-size: 13px;">${station.locationName}</strong>
            <span style="background: rgba(14, 165, 233, 0.2); color: #38bdf8; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 99px;">
              ${station.district}
            </span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5;">
            <div>🌤️ <strong>Weather Status:</strong> <span style="font-weight: 700; color: #f8fafc;">${station.weatherCondition}</span></div>
            <div>🌡️ <strong>Current Temperature:</strong> ${station.temperatureCelsius.toFixed(1)}°C (Feels ${station.apparentTemperatureCelsius.toFixed(1)}°C)</div>
            <div>💨 <strong>Wind Speed:</strong> ${station.windSpeedKmh.toFixed(1)} km/h (Gusts: ${station.windGustsKmh.toFixed(1)} km/h)</div>
            <div>⏲️ <strong>Barometric Pressure:</strong> ${station.surfacePressureHpa > 0 ? station.surfacePressureHpa.toFixed(1) + ' hPa' : 'N/A'}</div>
            <div>🌧️ <strong>Rainfall:</strong> ${station.rainfallMm.toFixed(1)} mm/h</div>
            <div>⚠️ <strong>Cyclone Risk Index:</strong> <span style="font-weight: 700; color: ${station.cycloneRiskIndex === 'CRITICAL' ? '#ef4444' : station.cycloneRiskIndex === 'HIGH' ? '#f97316' : '#38bdf8'}">${station.cycloneRiskIndex}</span></div>
            <div>📡 <strong>Freshness:</strong> <span style="font-weight: 600; color: ${station.dataFreshness === 'LIVE' ? '#34d399' : '#fbbf24'}">${station.dataFreshness}</span></div>
          </div>
          <div style="font-size: 9px; color: #64748b; margin-top: 6px; border-top: 1px solid #24344d; padding-top: 4px;">
            Source: ${station.metadata?.source || 'Open-Meteo API'} • Observed: ${station.observedAt ? new Date(station.observedAt).toLocaleTimeString() : 'Recent'}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectStation) {
          onSelectStation(station.stationId);
        }
      });

      marker.addTo(weatherLayerRef.current!);
    });
  }, [weatherStations, selectedStationId, showWeather, onSelectStation]);

  // Update Operational Shelters
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
          border: 1.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
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
        <div style="font-family: inherit; min-width: 230px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: #fbbf24; font-size: 13px;">${shelter.name}</strong>
            <span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 99px;">
              ${shelter.status}
            </span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.55;">
            <div>🏛️ <strong>District:</strong> <span style="font-weight: 700; color: #38bdf8;">${shelter.districtName}</span></div>
            <div>👥 <strong>Total Capacity:</strong> ${shelter.totalCapacity.toLocaleString()} persons</div>
            <div>📊 <strong>Occupancy:</strong> <strong style="color: ${shelter.currentOccupancy > 0 ? '#fbbf24' : '#34d399'};">${shelter.currentOccupancy.toLocaleString()}</strong> (${shelter.occupancyPercentage}% full) • <strong>${shelter.availableCapacity.toLocaleString()}</strong> available</div>
            <div>📍 <strong>Address:</strong> ${shelter.address}</div>
            <div>⚡ <strong>Facilities:</strong> Generator: ${shelter.facilities?.hasGenerator ? 'Yes' : 'No'} | Medical: ${shelter.facilities?.hasMedicalPost ? 'Yes' : 'No'} | Water: ${shelter.facilities?.hasDrinkingWater ? 'Yes' : 'No'}</div>
            <div>📞 <strong>Contact:</strong> ${shelter.contactPerson} (${shelter.contactPhone})</div>
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #24344d; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 9px; color: #64748b;">${shelter.dataSource}</span>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: none; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;">
              Directions ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(sheltersLayerRef.current!);
    });
  }, [shelters, showShelters]);

  // Update Verified Cyclone Systems & Tracks
  useEffect(() => {
    if (!cycloneLayerRef.current || !mapInstanceRef.current) return;
    cycloneLayerRef.current.clearLayers();

    if (!showCycloneLayer || !cycloneSystems || cycloneSystems.length === 0) return;

    cycloneSystems.forEach((sys) => {
      // 1. Render historical & forecast tracks
      if (sys.tracks && sys.tracks.length > 0) {
        const latlngs: [number, number][] = sys.tracks.map((t) => [t.latitude, t.longitude]);
        const polyline = L.polyline(latlngs, {
          color: '#ef4444',
          weight: 3.5,
          dashArray: '6, 6',
        });
        polyline.bindPopup(`<strong>${sys.name}</strong> (${sys.classification}) — Track Projection`);
        polyline.addTo(cycloneLayerRef.current!);
      }

      // 2. Render Storm Eye / Center Marker
      if (sys.currentPosition) {
        const eyeHtml = `
          <div style="
            background: #ef4444;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 16px;
            animation: spin 6s linear infinite;
          ">
            🌀
          </div>
        `;
        const eyeIcon = L.divIcon({
          className: 'custom-cyclone-eye',
          html: eyeHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const eyeMarker = L.marker([sys.currentPosition.latitude, sys.currentPosition.longitude], {
          icon: eyeIcon,
        });
        eyeMarker.bindPopup(`
          <div style="padding: 4px;">
            <strong style="color: #ef4444; font-size: 13px;">🌀 ${sys.name}</strong>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">
              <div>Classification: <strong>${sys.classification}</strong></div>
              <div>Max Sustained Wind: <strong>${sys.currentPosition.maxSustainedWindKmh} km/h</strong></div>
              <div>Source: <strong>${sys.officialSource}</strong></div>
            </div>
          </div>
        `);
        eyeMarker.addTo(cycloneLayerRef.current!);
      }
    });
  }, [cycloneSystems, showCycloneLayer]);

  // Update Active Evacuation Route Layer
  useEffect(() => {
    if (!routeLayerRef.current || !mapInstanceRef.current) return;
    routeLayerRef.current.clearLayers();

    if (activeEvacuationRoute && activeEvacuationRoute.length > 1) {
      const isGeodesic = activeRouteInfo?.isFallback;
      const polyline = L.polyline(activeEvacuationRoute, {
        color: isGeodesic ? '#f59e0b' : '#a855f7',
        weight: 5,
        opacity: 0.9,
        dashArray: isGeodesic ? '8, 8' : undefined,
      });

      polyline.bindPopup(`
        <div style="padding: 4px;">
          <strong style="color: #a855f7;">Evacuation Route Corridor</strong>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">
            <div>Destination: <strong>${activeRouteInfo?.shelterName || 'Designated Shelter'}</strong></div>
            <div>Distance: <strong>${activeRouteInfo?.roadDistanceKm || 'N/A'} km</strong></div>
            <div>Est. Travel Time: <strong>${activeRouteInfo?.durationMinutes || 'N/A'} mins</strong></div>
            <div style="margin-top: 4px; color: #f59e0b; font-size: 10px;">⚠️ Real-time road flood status unverified.</div>
          </div>
        </div>
      `);

      polyline.addTo(routeLayerRef.current!);

      // Fit map bounds to encompass the route
      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [activeEvacuationRoute, activeRouteInfo]);

  // Update User Current Location Marker
  useEffect(() => {
    if (!userLocationLayerRef.current || !mapInstanceRef.current) return;
    userLocationLayerRef.current.clearLayers();

    if (!userLocation) return;

    const markerHtml = `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          background: rgba(56, 189, 248, 0.45);
          border-radius: 50%;
          animation: pulse-ring 2s infinite ease-out;
        "></div>
        <div style="
          width: 14px;
          height: 14px;
          background: #0284c7;
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(14, 165, 233, 0.9);
          z-index: 2;
        "></div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'custom-user-location-marker',
      html: markerHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker(userLocation, { icon: customIcon });
    marker.bindPopup(`
      <div style="padding: 4px; font-family: inherit; min-width: 180px;">
        <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
          <strong style="color: #38bdf8; font-size: 12px;">📍 Your Current Location</strong>
        </div>
        <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4;">
          <div>GPS: <strong>${userLocation[0].toFixed(4)}°N, ${userLocation[1].toFixed(4)}°E</strong></div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">Active routing origin for nearest shelters.</div>
        </div>
      </div>
    `);
    marker.addTo(userLocationLayerRef.current);

    mapInstanceRef.current.flyTo(userLocation, 11, { duration: 1.2 });
  }, [userLocation]);

  return (
    <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '0.5rem' }}>
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
          <Layers size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>
            Tamil Nadu Coastal Geospatial Operational Map
          </h3>
        </div>

        {/* Layer Filters & Active Route Alert */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#38bdf8' }}>
            <input
              type="checkbox"
              checked={showWeather}
              onChange={(e) => setShowWeather(e.target.checked)}
            />
            <span>Live Stations ({weatherStations.length})</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#fbbf24' }}>
            <input
              type="checkbox"
              checked={showShelters}
              onChange={(e) => setShowShelters(e.target.checked)}
            />
            <span>Shelters ({shelters.length})</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#ef4444' }}>
            <input
              type="checkbox"
              checked={showCycloneLayer}
              onChange={(e) => setShowCycloneLayer(e.target.checked)}
            />
            <span>Cyclone Tracks ({cycloneSystems.length})</span>
          </label>

          {activeEvacuationRoute && onClearRoute && (
            <button
              onClick={onClearRoute}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#f87171',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              Clear Route
            </button>
          )}
        </div>
      </div>

      {activeRouteInfo && (
        <div
          style={{
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '0.375rem',
            padding: '0.45rem 0.75rem',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#e9d5ff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Navigation size={14} color="#c084fc" />
            <span>
              Active Evacuation Route to <strong>{activeRouteInfo.shelterName}</strong>: {activeRouteInfo.roadDistanceKm} km (~{activeRouteInfo.durationMinutes} mins)
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>
            {activeRouteInfo.isFallback ? '⚡ Straight-line corridor' : '🛣️ OSRM Road Network'}
          </span>
        </div>
      )}

      <div ref={mapContainerRef} className="map-container" />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.5rem',
          fontSize: '0.72rem',
          color: '#64748b',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          🗺️ Leaflet / OpenStreetMap Base Map • Full 14-District Tamil Nadu Coastal Corridor
        </div>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          <span>🔵 Coastal Stations</span>
          <span>🏠 Multipurpose Shelters</span>
          <span style={{ color: '#ef4444' }}>🌀 Storm System</span>
          <span style={{ color: '#a855f7' }}>🟣 Evacuation Route</span>
          {userLocation && <span style={{ color: '#38bdf8' }}>📍 Your Location</span>}
        </div>
      </div>
    </div>
  );
};
