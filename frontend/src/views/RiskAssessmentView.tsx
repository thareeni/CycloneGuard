import React, { useState, useEffect, useRef } from 'react';
import {
  LiveWeatherObservation,
  RuleBasedRiskAssessment,
  RiskFactor,
  DistrictRiskSummary,
  CoastalDistrict,
} from '../types';
import { api } from '../services/api';
import {
  Info,
  RefreshCw,
  Wind,
  CloudRain,
} from 'lucide-react';

interface RiskAssessmentViewProps {
  stations: LiveWeatherObservation[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  districts?: CoastalDistrict[];
  selectedDistrict?: string;
  onSelectDistrict?: (districtName: string) => void;
}

export const RiskAssessmentView: React.FC<RiskAssessmentViewProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  districts: _districts = [],
  selectedDistrict: _selectedDistrict = 'ALL',
  onSelectDistrict: _onSelectDistrict,
}) => {
  const [assessment, setAssessment] = useState<RuleBasedRiskAssessment | null>(null);
  const [districtSummaries, setDistrictSummaries] = useState<DistrictRiskSummary[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [loadingSummaries, setLoadingSummaries] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cached assessments map to avoid redundant in-flight API requests when toggling stations
  const cachedAssessments = useRef<Map<string, RuleBasedRiskAssessment>>(new Map());

  const selectedStation = stations.find(
    (s) => s.stationId.toLowerCase() === selectedStationId.toLowerCase()
  ) || stations[0];

  // Fetch Statewide District Risk Summaries once or on explicit refresh
  useEffect(() => {
    let mounted = true;
    const fetchSummaries = async () => {
      setLoadingSummaries(true);
      try {
        const data = await api.getDistrictRiskSummaries();
        if (mounted && Array.isArray(data)) {
          setDistrictSummaries(data);
        }
      } catch (err: any) {
        console.warn('District summaries fetch warning:', err.message);
      } finally {
        if (mounted) setLoadingSummaries(false);
      }
    };
    fetchSummaries();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch Station Risk Assessment with Stale-While-Revalidate (prevents flickering)
  useEffect(() => {
    if (!selectedStationId) return;

    let mounted = true;
    const targetId = selectedStationId.toLowerCase();

    // 1. Immediately display cached or locally derived assessment if available (Zero UI flicker)
    if (cachedAssessments.current.has(targetId)) {
      setAssessment(cachedAssessments.current.get(targetId)!);
    } else if (selectedStation) {
      // Immediate deterministic fallback
      const initialFallback = computeClientAssessment(selectedStation);
      setAssessment(initialFallback);
      cachedAssessments.current.set(targetId, initialFallback);
    }

    const fetchAssessment = async () => {
      setIsUpdating(true);
      setError(null);
      try {
        const data = await api.getRiskAssessment(targetId);
        if (mounted && data && data.stationId.toLowerCase() === targetId) {
          setAssessment(data);
          cachedAssessments.current.set(targetId, data);
        }
      } catch (err: any) {
        console.warn('Backend assessment API note, preserving deterministic local assessment:', err.message);
      } finally {
        if (mounted) setIsUpdating(false);
      }
    };

    fetchAssessment();
    return () => {
      mounted = false;
    };
  }, [selectedStationId]); // Primitive string dependency prevents infinite loop re-renders!

  // Dual 100-point physical client calculation (Identical to backend openMeteoService)
  function computeClientAssessment(obs: LiveWeatherObservation): RuleBasedRiskAssessment {
    // 1. Cyclone Impact Factors (Max 40 wind, 30 gust, 30 pressure = 100)
    let wScore = obs.windSpeedKmh >= 62 ? 40 : obs.windSpeedKmh >= 45 ? 28 : obs.windSpeedKmh >= 30 ? 16 : obs.windSpeedKmh >= 15 ? 8 : 4;
    let gScore = obs.windGustsKmh >= 90 ? 30 : obs.windGustsKmh >= 65 ? 22 : obs.windGustsKmh >= 45 ? 14 : obs.windGustsKmh >= 20 ? 6 : 2;
    let pScore = obs.surfacePressureHpa <= 0 ? 0 : obs.surfacePressureHpa < 992 ? 30 : obs.surfacePressureHpa < 998 ? 24 : obs.surfacePressureHpa < 1004 ? 16 : obs.surfacePressureHpa < 1010 ? 6 : 2;

    const cycloneTotal = Math.min(100, wScore + gScore + pScore);
    const cycloneCat = cycloneTotal >= 75 ? 'CRITICAL' : cycloneTotal >= 50 ? 'HIGH' : cycloneTotal >= 25 ? 'MODERATE' : 'LOW';

    const cycloneFactors: RiskFactor[] = [
      {
        factor: '10m Sustained Wind Speed',
        measuredValue: `${obs.windSpeedKmh.toFixed(1)} km/h`,
        threshold: '< 30 km/h: Normal; 30-44: Squally; 45-61: Gale; >= 62: Cyclonic',
        score: wScore,
        maxScore: 40,
        severity: obs.windSpeedKmh >= 62 ? 'CRITICAL' : obs.windSpeedKmh >= 45 ? 'HIGH' : obs.windSpeedKmh >= 30 ? 'ELEVATED' : 'NORMAL',
        rationale: obs.windSpeedKmh >= 62
          ? 'IMD Cyclonic threshold exceeded. Major risk to shipping, thatched roofs, and trees.'
          : obs.windSpeedKmh >= 30
          ? 'Squally coastal wind detected. Small craft warning recommended.'
          : 'Sustained winds within normal baseline atmospheric levels.',
      },
      {
        factor: 'Peak Wind Gusts',
        measuredValue: `${obs.windGustsKmh.toFixed(1)} km/h`,
        threshold: '< 45 km/h: Low; 45-64: Elevated; 65-89: Severe; >= 90: Destructive',
        score: gScore,
        maxScore: 30,
        severity: obs.windGustsKmh >= 90 ? 'CRITICAL' : obs.windGustsKmh >= 65 ? 'HIGH' : obs.windGustsKmh >= 45 ? 'ELEVATED' : 'NORMAL',
        rationale: obs.windGustsKmh >= 65
          ? 'Turbulent gusts capable of structural damage, uprooting trees, and snapping cables.'
          : 'Peak gusts pose minimal structural threat.',
      },
      {
        factor: 'Barometric Surface Pressure',
        measuredValue: obs.surfacePressureHpa > 0 ? `${obs.surfacePressureHpa.toFixed(1)} hPa` : 'Sensor Offline / N/A',
        threshold: '> 1008 hPa: Stable; 1004-1008: Low; 998-1003: Depression; < 998: Deep Low / Cyclone',
        score: pScore,
        maxScore: 30,
        severity: obs.surfacePressureHpa < 998 ? 'HIGH' : obs.surfacePressureHpa < 1004 ? 'ELEVATED' : 'NORMAL',
        rationale: obs.surfacePressureHpa < 998
          ? 'Deep barometric depression indicating cyclonic circulation in coastal corridor.'
          : 'Surface pressure indicates standard coastal atmospheric gradient.',
      },
    ];

    // 2. Rainfall Impact Factors (Max 60 rate, 40 volume = 100)
    let rRateScore = obs.rainfallMm >= 35 ? 60 : obs.rainfallMm >= 15.6 ? 50 : obs.rainfallMm >= 7.6 ? 40 : obs.rainfallMm >= 2.5 ? 25 : obs.rainfallMm > 0 ? 12 : 0;
    const precipVol = obs.precipitationMm || 0;
    let rVolScore = precipVol > 30 ? 40 : precipVol > 15 ? 30 : precipVol > 5 ? 20 : precipVol > 0 ? 10 : 0;

    const rainfallTotal = Math.min(100, rRateScore + rVolScore);
    const rainfallCat = rainfallTotal >= 75 ? 'TORRENTIAL' : rainfallTotal >= 50 ? 'HEAVY' : rainfallTotal >= 25 ? 'MODERATE' : 'LOW';

    const rainfallFactors: RiskFactor[] = [
      {
        factor: 'Hourly Rainfall Rate (Intensity)',
        measuredValue: `${obs.rainfallMm.toFixed(1)} mm/h`,
        threshold: '0: Nil; 0.1-2.4: Light; 2.5-7.5: Moderate; 7.6-15.5: Rather Heavy; 15.6-34.9: Heavy; >= 35: Torrential',
        score: rRateScore,
        maxScore: 60,
        severity: obs.rainfallMm >= 35 ? 'CRITICAL' : obs.rainfallMm >= 15.6 ? 'HIGH' : obs.rainfallMm >= 2.5 ? 'ELEVATED' : 'NORMAL',
        rationale: obs.rainfallMm >= 15.6
          ? 'Heavy localized precipitation. Significant waterlogging and canal surge hazard.'
          : 'Light to moderate rainfall within manageable drainage limits.',
      },
      {
        factor: 'Cumulative Moisture Volume',
        measuredValue: `${precipVol.toFixed(1)} mm`,
        threshold: '< 5 mm: Low; 5-15 mm: Moderate; 15-30 mm: Significant; > 30 mm: Severe Waterlogging',
        score: rVolScore,
        maxScore: 40,
        severity: precipVol > 30 ? 'CRITICAL' : precipVol > 15 ? 'HIGH' : precipVol > 5 ? 'ELEVATED' : 'NORMAL',
        rationale: precipVol > 15
          ? 'Substantial cumulative precipitation. Water accumulation in low-lying coastal pockets.'
          : 'Cumulative moisture volume within normal seasonal absorption bounds.',
      },
    ];

    const compositeScore = Math.min(100, Math.round(cycloneTotal * 0.6 + rainfallTotal * 0.4));
    const compositeCat = compositeScore >= 80 ? 'CRITICAL' : compositeScore >= 55 ? 'HIGH' : compositeScore >= 35 ? 'ELEVATED' : compositeScore >= 20 ? 'MODERATE' : 'LOW';

    return {
      stationId: obs.stationId,
      locationName: obs.locationName,
      district: obs.district,
      assessedAt: new Date().toISOString(),
      methodology: 'Dual Rule-Based Meteorological Matrices (IMD / WMO Thresholds) — Non-ML',
      cycloneScore: cycloneTotal,
      cycloneCategory: cycloneCat,
      cycloneSummary: cycloneTotal >= 50 ? 'Active cyclonic squalls detected.' : 'Nominal coastal wind conditions.',
      cycloneFactors,
      rainfallScore: rainfallTotal,
      rainfallCategory: rainfallCat,
      rainfallSummary: rainfallTotal >= 50 ? 'Heavy precipitation inundation hazard.' : 'Dry or light seasonal showers.',
      rainfallFactors,
      overallScore: compositeScore,
      riskCategory: compositeCat,
      summaryExplanation: `Cyclone Impact: ${cycloneTotal}/100 (${cycloneCat}) • Rainfall Impact: ${rainfallTotal}/100 (${rainfallCat})`,
      actionRecommendation: compositeScore >= 50 ? 'Alert district response teams; prepare multipurpose shelters for potential evacuees.' : 'Maintain routine coastal surveillance.',
      contributingFactors: [...cycloneFactors, ...rainfallFactors],
      geographicExposure: {
        coastalZone: 'Tamil Nadu Coastline',
        coastalProximityKm: 1.5,
        isHighRiskCoastalZone: true,
        unlinkedDatasetsNotice:
          'Physical inundation depth, storm surge run-up, high-resolution bathymetry, and census block structural building vulnerability require unlinked TNSDMA GIS / Survey of India datasets. Current scores quantify pure atmospheric meteorological hazard.',
      },
      dataQuality: {
        windAvailable: true,
        gustAvailable: true,
        pressureAvailable: obs.surfacePressureHpa > 0,
        rainAvailable: true,
        missingParamsCount: obs.surfacePressureHpa <= 0 ? 1 : 0,
      },
    };
  }

  const getCycloneColor = (score: number) => {
    if (score >= 75) return '#ef4444'; // CRITICAL
    if (score >= 50) return '#f97316'; // HIGH
    if (score >= 25) return '#fbbf24'; // MODERATE
    return '#10b981'; // LOW
  };

  const getRainfallColor = (score: number) => {
    if (score >= 75) return '#9333ea'; // TORRENTIAL
    if (score >= 50) return '#3b82f6'; // HEAVY
    if (score >= 25) return '#06b6d4'; // MODERATE
    return '#10b981'; // LOW
  };

  const currentCycloneScore = assessment?.cycloneScore ?? selectedStation?.cycloneScore ?? 12;
  const currentCycloneCat = assessment?.cycloneCategory ?? selectedStation?.cycloneCategory ?? 'LOW';
  const currentRainfallScore = assessment?.rainfallScore ?? selectedStation?.rainfallScore ?? 8;
  const currentRainfallCat = assessment?.rainfallCategory ?? selectedStation?.rainfallCategory ?? 'LOW';

  const cycloneColor = getCycloneColor(currentCycloneScore);
  const rainfallColor = getRainfallColor(currentRainfallScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
              Statewide Meteorological Impact & Risk Assessment
            </h2>
            {isUpdating && (
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Syncing...
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Two distinct 100-point physical atmospheric scoring engines covering all 14 coastal districts of Tamil Nadu.
          </p>
        </div>

        {/* Station Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Inspect District Station:</span>
          <select
            value={selectedStationId}
            onChange={(e) => onSelectStation(e.target.value)}
            style={{
              background: '#0d1524',
              color: '#f1f5f9',
              border: '1px solid #24344d',
              borderRadius: '0.375rem',
              padding: '0.4rem 0.75rem',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {stations.map((s) => (
              <option key={s.stationId} value={s.stationId}>
                {s.district} — {s.locationName.split('&')[0]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prominent Non-ML Physical Impact Disclaimer */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid #334155',
          borderRadius: '0.5rem',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}
      >
        <Info size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              TWO INDEPENDENT 100-PT INDICES
            </span>
            <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' }}>
              NON-AI / NON-ML
            </span>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              PURE METEOROLOGICAL HAZARDS
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45, margin: 0 }}>
            <strong>SCIENTIFIC DISCLOSURE:</strong> CycloneGuard separates wind/cyclonic barometric hazards from precipitation inundation hazards into two distinct 100-point metrics. These scores evaluate live atmospheric measurements from Open-Meteo against official IMD/WMO meteorological thresholds. They do <strong style={{ color: '#f8fafc' }}>NOT predict structural building collapse, coastal storm surge depth, or certified evacuation mandates</strong>, which require unlinked bathymetry, digital elevation models (DEM), and census ward vulnerability datasets.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ color: '#f87171', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* SECTION 1: TWO SEPARATE 100-POINT IMPACT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.25rem' }}>
        {/* SCORE A: CYCLONE IMPACT SCORE (0 - 100) */}
        <div className="card" style={{ padding: '1.25rem', background: '#0d1527', border: `1px solid ${cycloneColor}55` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                <Wind size={18} color={cycloneColor} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Cyclone Impact Score
                </h3>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Atmospheric Dynamics: Sustained Wind (40) + Peak Gusts (30) + Barometric Deficit (30)
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#090e1a',
                padding: '0.5rem 0.85rem',
                borderRadius: '0.375rem',
                border: `1px solid ${cycloneColor}`,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: cycloneColor, lineHeight: 1 }}>
                  {currentCycloneScore}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>/ 100</div>
              </div>
              <div>
                <span
                  style={{
                    background: `${cycloneColor}22`,
                    color: cycloneColor,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'inline-block',
                  }}
                >
                  {currentCycloneCat}
                </span>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>IMD Wind Hazard</div>
              </div>
            </div>
          </div>

          {/* Contributing Cyclone Factors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {(assessment?.cycloneFactors || []).map((f, i) => (
              <div
                key={i}
                style={{
                  background: '#070b14',
                  border: '1px solid #1a273b',
                  borderRadius: '0.375rem',
                  padding: '0.65rem 0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9' }}>{f.factor}</span>
                  <span style={{ fontSize: '0.72rem', color: cycloneColor, fontWeight: 700 }}>
                    {f.score} / {f.maxScore} pts
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  <span>Reading: <strong style={{ color: '#f8fafc' }}>{f.measuredValue}</strong></span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{f.threshold}</span>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#cbd5e1', margin: 0, lineHeight: 1.35 }}>
                  {f.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* SCORE B: RAINFALL IMPACT SCORE (0 - 100) */}
        <div className="card" style={{ padding: '1.25rem', background: '#0d1527', border: `1px solid ${rainfallColor}55` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                <CloudRain size={18} color={rainfallColor} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Rainfall Impact Score
                </h3>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Precipitation Inundation: Hourly Intensity Rate (60) + Cumulative Volume (40)
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#090e1a',
                padding: '0.5rem 0.85rem',
                borderRadius: '0.375rem',
                border: `1px solid ${rainfallColor}`,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: rainfallColor, lineHeight: 1 }}>
                  {currentRainfallScore}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>/ 100</div>
              </div>
              <div>
                <span
                  style={{
                    background: `${rainfallColor}22`,
                    color: rainfallColor,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'inline-block',
                  }}
                >
                  {currentRainfallCat}
                </span>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>Inundation Index</div>
              </div>
            </div>
          </div>

          {/* Contributing Rainfall Factors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {(assessment?.rainfallFactors || []).map((f, i) => (
              <div
                key={i}
                style={{
                  background: '#070b14',
                  border: '1px solid #1a273b',
                  borderRadius: '0.375rem',
                  padding: '0.65rem 0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9' }}>{f.factor}</span>
                  <span style={{ fontSize: '0.72rem', color: rainfallColor, fontWeight: 700 }}>
                    {f.score} / {f.maxScore} pts
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  <span>Reading: <strong style={{ color: '#f8fafc' }}>{f.measuredValue}</strong></span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{f.threshold}</span>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#cbd5e1', margin: 0, lineHeight: 1.35 }}>
                  {f.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: Statewide 14-District Comparative Matrix */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
              Statewide 14-District Risk Assessment Matrix
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Comparative overview across all Tamil Nadu coastal administrative districts with distinct Cyclone and Rainfall scores.
            </p>
          </div>
          <button
            onClick={() => {
              setLoadingSummaries(true);
              api.getDistrictRiskSummaries(true).then((d) => {
                setDistrictSummaries(d);
                setLoadingSummaries(false);
              });
            }}
            disabled={loadingSummaries}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} style={{ animation: loadingSummaries ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#0a101d', borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '0.65rem 0.85rem' }}>District</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Monitoring Station</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Wind (km/h)</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Pressure</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Rainfall (mm/h)</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Cyclone Score</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Rainfall Score</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>General Risk</th>
              </tr>
            </thead>
            <tbody>
              {districtSummaries.map((summary) => {
                const isSelected = selectedStation?.stationId.toLowerCase() === summary.stationId.toLowerCase();
                const cColor = getCycloneColor(summary.cycloneScore || summary.overallScore);
                const rColor = getRainfallColor(summary.rainfallScore || 8);
                const gColor = getCycloneColor(summary.overallScore);

                return (
                  <tr
                    key={summary.districtId}
                    onClick={() => onSelectStation(summary.stationId)}
                    style={{
                      borderBottom: '1px solid #162032',
                      background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <strong style={{ color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                        {summary.districtId}. {summary.districtName}
                      </strong>
                      {summary.isHighRiskZone && <span style={{ marginLeft: '4px', fontSize: '10px' }}>⚠️</span>}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#cbd5e1' }}>
                      {summary.locationName.split('&')[0]}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#cbd5e1' }}>
                      {summary.windSpeedKmh.toFixed(1)} <span style={{ color: '#64748b', fontSize: '0.7rem' }}>({summary.windGustsKmh.toFixed(1)})</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#cbd5e1' }}>
                      {summary.surfacePressureHpa > 0 ? `${summary.surfacePressureHpa.toFixed(1)} hPa` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: '#cbd5e1' }}>
                      {summary.rainfallMm.toFixed(1)}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{ color: cColor, fontWeight: 800 }}>
                        {summary.cycloneScore ?? summary.overallScore}/100
                      </span>{' '}
                      <span style={{ fontSize: '0.68rem', color: cColor }}>({summary.cycloneCategory ?? summary.riskCategory})</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span style={{ color: rColor, fontWeight: 800 }}>
                        {summary.rainfallScore ?? 8}/100
                      </span>{' '}
                      <span style={{ fontSize: '0.68rem', color: rColor }}>({summary.rainfallCategory ?? 'LOW'})</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span
                        style={{
                          background: `${gColor}22`,
                          color: gColor,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {summary.riskCategory}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Station Operational Guidance & Rationale */}
      {assessment && (
        <div className="card" style={{ padding: '1.25rem', background: '#0e1627' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span className="badge badge-live" style={{ marginBottom: '0.2rem' }}>
                DISTRICT OPERATIONAL RECOMMENDATION
              </span>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                {assessment.locationName} ({assessment.district} District)
              </h4>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Assessed: {new Date(assessment.assessedAt).toLocaleTimeString()} IST • Source: Open-Meteo Deterministic Pipeline
            </div>
          </div>

          <div
            style={{
              background: '#090e1a',
              borderRadius: '0.375rem',
              padding: '0.85rem 1rem',
              border: '1px solid #1e293b',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.35rem' }}>
              Action Guidance:
            </div>
            <div style={{ color: '#f1f5f9', lineHeight: 1.5 }}>
              {assessment.actionRecommendation}
            </div>
            <div style={{ marginTop: '0.65rem', borderTop: '1px solid #1a273b', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', color: '#94a3b8', fontSize: '0.72rem' }}>
              <div>Zone: <strong style={{ color: '#cbd5e1' }}>{assessment.geographicExposure?.coastalZone || 'Tamil Nadu Coast'}</strong></div>
              <div>Coast Proximity: <strong style={{ color: '#cbd5e1' }}>~{assessment.geographicExposure?.coastalProximityKm || 1.5} km</strong></div>
              <div>Quality: <strong style={{ color: '#34d399' }}>Wind, Gust, Rain Active</strong> {assessment.dataQuality.pressureAvailable ? '• Pressure Active' : '• Pressure Offline'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
