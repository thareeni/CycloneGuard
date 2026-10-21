import axios from 'axios';
import { z } from 'zod';
import { config } from '../config/env';
import { cacheService } from '../config/redis';
import { dbService } from '../config/database';
import {
  CoastalStation,
  LiveWeatherObservation,
  TAMIL_NADU_COASTAL_STATIONS,
  HourlyForecastPoint,
  RuleBasedRiskAssessment,
  RiskFactor,
  DistrictRiskSummary,
} from '../types/weather';
import { TAMIL_NADU_COASTAL_DISTRICTS } from '../constants/districts';

// Zod schema to validate real Open-Meteo API payload
const OpenMeteoSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string().optional(),
  current: z.object({
    time: z.string(),
    interval: z.number().optional(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    apparent_temperature: z.number().optional(),
    is_day: z.number().optional(),
    precipitation: z.number().optional(),
    rain: z.number().optional(),
    weather_code: z.number().optional(),
    surface_pressure: z.number().optional(),
    wind_speed_10m: z.number(),
    wind_direction_10m: z.number().optional(),
    wind_gusts_10m: z.number().optional(),
  }),
  hourly: z
    .object({
      time: z.array(z.string()),
      temperature_2m: z.array(z.number()),
      precipitation: z.array(z.number()).optional(),
      rain: z.array(z.number()).optional(),
      wind_speed_10m: z.array(z.number()),
      wind_gusts_10m: z.array(z.number()).optional(),
    })
    .optional(),
});

function decodeWmoWeather(code: number): string {
  switch (code) {
    case 0: return 'Clear Sky';
    case 1: return 'Mainly Clear';
    case 2: return 'Partly Cloudy';
    case 3: return 'Overcast';
    case 45: return 'Fog';
    case 48: return 'Depositing Rime Fog';
    case 51: return 'Light Drizzle';
    case 53: return 'Moderate Drizzle';
    case 55: return 'Dense Drizzle';
    case 61: return 'Slight Rain';
    case 63: return 'Moderate Rain';
    case 65: return 'Heavy Rain';
    case 71: return 'Slight Snow';
    case 80: return 'Slight Rain Showers';
    case 81: return 'Moderate Rain Showers';
    case 82: return 'Violent Rain Showers';
    case 95: return 'Thunderstorm';
    case 96: return 'Thunderstorm with Slight Hail';
    case 99: return 'Thunderstorm with Heavy Hail';
    default: return `Weather condition code ${code}`;
  }
}

export function getRainfallDescription(rainfallMm: number, precipMm: number, weatherCode: number): string {
  if (rainfallMm > 0) {
    if (rainfallMm >= 35) return `${rainfallMm.toFixed(1)} mm/h (Torrential Inundation)`;
    if (rainfallMm >= 15) return `${rainfallMm.toFixed(1)} mm/h (Heavy Rainfall)`;
    if (rainfallMm >= 5) return `${rainfallMm.toFixed(1)} mm/h (Moderate Rain)`;
    return `${rainfallMm.toFixed(1)} mm/h (Light Showers)`;
  }
  if (precipMm > 0) {
    return `${precipMm.toFixed(1)} mm (Preceding Interval Accumulated Volume)`;
  }
  if ([51, 53, 55].includes(weatherCode)) {
    return '0.0 mm/h (Trace Drizzle detected by sensor; volume < 0.1 mm)';
  }
  if ([61, 80].includes(weatherCode)) {
    return '0.0 mm/h (Passing Showers detected; trace volume)';
  }
  return '0.0 mm/h (Nil Precipitation)';
}

function computeCycloneRiskIndex(
  windSpeedKmh: number,
  gustsKmh: number,
  pressureHpa: number,
  rainfallMm: number
): 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' {
  // Classification aligned with IMD wind and pressure criteria
  if (windSpeedKmh >= 62 || gustsKmh >= 90 || (pressureHpa > 0 && pressureHpa < 990)) {
    return 'CRITICAL'; // Cyclonic Storm threshold
  }
  if (windSpeedKmh >= 45 || gustsKmh >= 65 || (pressureHpa > 0 && pressureHpa < 1000) || rainfallMm >= 60) {
    return 'HIGH'; // Deep Depression / Heavy Squall
  }
  if (windSpeedKmh >= 30 || gustsKmh >= 45 || (pressureHpa > 0 && pressureHpa < 1006) || rainfallMm >= 20) {
    return 'ELEVATED'; // Depression / Strong Coastal Breeze
  }
  return 'NORMAL';
}

export class OpenMeteoService {
  /**
   * Fetch live weather data for a single coastal station
   */
  public async getStationWeather(station: CoastalStation, forceRefresh = false): Promise<LiveWeatherObservation> {
    const cacheKey = `cycloneguard:weather:station:${station.id}`;

    // 1. Check Redis Cache
    if (!forceRefresh) {
      const cached = await cacheService.get<LiveWeatherObservation>(cacheKey);
      if (cached) {
        return {
          ...cached,
          dataFreshness: 'CACHED',
          metadata: {
            ...cached.metadata,
            cached: true,
          },
        };
      }
    }

    // 2. Fetch from real Open-Meteo API
    const params = {
      latitude: station.latitude,
      longitude: station.longitude,
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'is_day',
        'precipitation',
        'rain',
        'weather_code',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      hourly: [
        'temperature_2m',
        'precipitation',
        'rain',
        'wind_speed_10m',
        'wind_gusts_10m',
      ].join(','),
      forecast_days: 2,
      timezone: 'Asia/Kolkata',
    };

    try {
      const response = await axios.get(config.openMeteo.baseUrl, {
        params,
        timeout: config.openMeteo.timeoutMs,
        headers: {
          'User-Agent': 'CycloneGuard-DisasterManagementSystem/1.0',
        },
      });

      // 3. Validate response format using Zod
      const parsed = OpenMeteoSchema.parse(response.data);
      const curr = parsed.current;

      const hourlyForecast: HourlyForecastPoint[] = [];
      if (parsed.hourly && parsed.hourly.time) {
        // Collect next 12 hourly intervals
        const limit = Math.min(12, parsed.hourly.time.length);
        for (let i = 0; i < limit; i++) {
          hourlyForecast.push({
            time: parsed.hourly.time[i],
            temperature: parsed.hourly.temperature_2m[i] ?? 0,
            rainfall: parsed.hourly.rain?.[i] ?? parsed.hourly.precipitation?.[i] ?? 0,
            windSpeed: parsed.hourly.wind_speed_10m[i] ?? 0,
            windGusts: parsed.hourly.wind_gusts_10m?.[i] ?? 0,
          });
        }
      }

      const windSpeed = curr.wind_speed_10m ?? 0;
      const windGusts = curr.wind_gusts_10m ?? windSpeed;
      const pressure = curr.surface_pressure ?? 1010;
      const rainfall = curr.rain ?? curr.precipitation ?? 0;
      const weatherCode = curr.weather_code ?? 0;

      const observation: LiveWeatherObservation = {
        stationId: station.id,
        locationName: station.name,
        district: station.district,
        latitude: station.latitude,
        longitude: station.longitude,
        temperatureCelsius: curr.temperature_2m,
        apparentTemperatureCelsius: curr.apparent_temperature ?? curr.temperature_2m,
        humidityPct: curr.relative_humidity_2m,
        surfacePressureHpa: pressure,
        windSpeedKmh: windSpeed,
        windDirectionDeg: curr.wind_direction_10m ?? 0,
        windGustsKmh: windGusts,
        rainfallMm: rainfall,
        precipitationMm: curr.precipitation ?? 0,
        weatherCode,
        weatherCondition: decodeWmoWeather(weatherCode),
        isDay: curr.is_day === 1,
        cycloneRiskIndex: computeCycloneRiskIndex(windSpeed, windGusts, pressure, rainfall),
        riskScore: 0,
        riskCategory: 'LOW',
        dataFreshness: 'LIVE',
        rainfallDescription: getRainfallDescription(rainfall, curr.precipitation ?? 0, weatherCode),
        observedAt: curr.time,
        hourlyForecast,
        metadata: {
          source: 'Open-Meteo API',
          originType: 'LIVE_API',
          providerUrl: 'https://open-meteo.com',
          lastUpdated: new Date().toISOString(),
          cached: false,
        },
      };

      // Authoritative deterministic risk score calculation (Single Source of Truth)
      const assessment = this.computeRuleBasedAssessment(observation);
      observation.cycloneScore = assessment.cycloneScore;
      observation.cycloneCategory = assessment.cycloneCategory;
      observation.rainfallScore = assessment.rainfallScore;
      observation.rainfallCategory = assessment.rainfallCategory;
      observation.riskScore = assessment.overallScore;
      observation.riskCategory = assessment.riskCategory;

      // 4. Save to Redis Cache
      await cacheService.set(cacheKey, observation, config.redis.cacheTtlSeconds);

      // 5. Asynchronously persist observation into PostgreSQL if available
      this.persistObservation(station, observation).catch((err) => {
        console.warn(`[OpenMeteoService] DB persistence warning for ${station.id}:`, err.message);
      });

      return observation;
    } catch (err: any) {
      console.error(`[OpenMeteoService] Error fetching weather for ${station.name}:`, err.message);

      // Fallback: Check if we have recent DB observation
      const dbFallback = await this.fetchLatestFromDatabase(station);
      if (dbFallback) {
        console.log(`[OpenMeteoService] Returning last recorded DB observation for ${station.name}`);
        return dbFallback;
      }

      throw new Error(`Failed to fetch live weather for ${station.name}: ${err.message}`);
    }
  }

  /**
   * Fetch all Tamil Nadu coastal stations concurrently
   */
  public async getAllCoastalStationsWeather(forceRefresh = false): Promise<LiveWeatherObservation[]> {
    const results = await Promise.allSettled(
      TAMIL_NADU_COASTAL_STATIONS.map((station) => this.getStationWeather(station, forceRefresh))
    );

    const successfulObservations: LiveWeatherObservation[] = [];
    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        successfulObservations.push(res.value);
      } else {
        console.error(`Failed to load station ${TAMIL_NADU_COASTAL_STATIONS[index].name}:`, res.reason);
      }
    });

    return successfulObservations;
  }

  /**
   * Persist fresh observation into PostgreSQL
   */
  private async persistObservation(station: CoastalStation, obs: LiveWeatherObservation) {
    if (!dbService.isDbConnected()) return;

    const query = `
      INSERT INTO weather_observations (
        location_name, latitude, longitude,
        temperature_celsius, apparent_temperature_celsius, relative_humidity_pct,
        surface_pressure_hpa, wind_speed_kmh, wind_direction_deg, wind_gusts_kmh,
        rainfall_mm, precipitation_mm, weather_code, is_day,
        data_source, origin_type, observed_at, fetched_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
    `;

    const params = [
      obs.locationName,
      obs.latitude,
      obs.longitude,
      obs.temperatureCelsius,
      obs.apparentTemperatureCelsius,
      obs.humidityPct,
      obs.surfacePressureHpa,
      obs.windSpeedKmh,
      obs.windDirectionDeg,
      obs.windGustsKmh,
      obs.rainfallMm,
      obs.precipitationMm,
      obs.weatherCode,
      obs.isDay,
      obs.metadata.source,
      obs.metadata.originType,
      obs.observedAt,
    ];

    await dbService.query(query, params);
  }

  private async fetchLatestFromDatabase(station: CoastalStation): Promise<LiveWeatherObservation | null> {
    if (!dbService.isDbConnected()) return null;

    const res = await dbService.query(
      `SELECT * FROM weather_observations 
       WHERE location_name = $1 
       ORDER BY observed_at DESC LIMIT 1`,
      [station.name]
    );

    if (!res || res.rows.length === 0) return null;
    const row = res.rows[0];

    const obs: LiveWeatherObservation = {
      stationId: station.id,
      locationName: station.name,
      district: station.district,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      temperatureCelsius: parseFloat(row.temperature_celsius),
      apparentTemperatureCelsius: parseFloat(row.apparent_temperature_celsius || row.temperature_celsius),
      humidityPct: parseInt(row.relative_humidity_pct, 10),
      surfacePressureHpa: parseFloat(row.surface_pressure_hpa),
      windSpeedKmh: parseFloat(row.wind_speed_kmh),
      windDirectionDeg: parseInt(row.wind_direction_deg, 10),
      windGustsKmh: parseFloat(row.wind_gusts_kmh),
      rainfallMm: parseFloat(row.rainfall_mm),
      precipitationMm: parseFloat(row.precipitation_mm),
      weatherCode: parseInt(row.weather_code, 10),
      weatherCondition: decodeWmoWeather(parseInt(row.weather_code, 10)),
      isDay: row.is_day,
      cycloneRiskIndex: computeCycloneRiskIndex(
        parseFloat(row.wind_speed_kmh),
        parseFloat(row.wind_gusts_kmh),
        parseFloat(row.surface_pressure_hpa),
        parseFloat(row.rainfall_mm)
      ),
      riskScore: 0,
      riskCategory: 'LOW',
      dataFreshness: 'STALE',
      rainfallDescription: getRainfallDescription(parseFloat(row.rainfall_mm), parseFloat(row.precipitation_mm), parseInt(row.weather_code, 10)),
      observedAt: row.observed_at.toISOString(),
      hourlyForecast: [],
      metadata: {
        source: row.data_source,
        originType: 'LIVE_API',
        providerUrl: 'https://open-meteo.com',
        lastUpdated: row.fetched_at.toISOString(),
        cached: true,
      },
    };

    const assessment = this.computeRuleBasedAssessment(obs);
    obs.cycloneScore = assessment.cycloneScore;
    obs.cycloneCategory = assessment.cycloneCategory;
    obs.rainfallScore = assessment.rainfallScore;
    obs.rainfallCategory = assessment.rainfallCategory;
    obs.riskScore = assessment.overallScore;
    obs.riskCategory = assessment.riskCategory;
    return obs;
  }

  /**
   * Transparent rule-based weather impact calculation (Deterministic matrix, Non-ML)
   * Produces TWO SEPARATE 100-Point Hazard Scores:
   * 1. Cyclone Impact Score (0 - 100): Sustained Wind (40) + Peak Gusts (30) + Barometric Pressure Drop (30)
   * 2. Rainfall Impact Score (0 - 100): Hourly Rate Intensity (60) + Moisture Accumulation Volume (40)
   */
  public computeRuleBasedAssessment(obs: LiveWeatherObservation): RuleBasedRiskAssessment {
    const cycloneFactors: RiskFactor[] = [];
    const rainfallFactors: RiskFactor[] = [];
    let missingCount = 0;

    // ==========================================
    // SCORE 1: CYCLONE IMPACT FACTORS (0 - 100)
    // ==========================================

    // 1A. Sustained Wind Speed (Max 40 points, IMD segmented scale)
    let windScore = 4;
    let windSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (obs.windSpeedKmh >= 62) {
      windScore = 40;
      windSev = 'CRITICAL';
    } else if (obs.windSpeedKmh >= 45) {
      windScore = 28;
      windSev = 'HIGH';
    } else if (obs.windSpeedKmh >= 30) {
      windScore = 16;
      windSev = 'ELEVATED';
    } else if (obs.windSpeedKmh >= 15) {
      windScore = 8;
      windSev = 'NORMAL';
    }
    cycloneFactors.push({
      factor: '10m Sustained Wind Speed',
      measuredValue: `${obs.windSpeedKmh.toFixed(1)} km/h`,
      threshold: '< 30 km/h: Normal; 30-44: Squally; 45-61: Gale; >= 62: Cyclonic Storm',
      score: windScore,
      maxScore: 40,
      severity: windSev,
      rationale: obs.windSpeedKmh >= 62
        ? 'IMD Cyclonic storm threshold exceeded (>= 62 km/h). Immediate risk to small craft, thatched roofing, and power lines.'
        : obs.windSpeedKmh >= 30
        ? 'Squally coastal wind detected. Marine warning and coastal vigilance recommended.'
        : 'Sustained winds within normal baseline atmospheric levels.',
    });

    // 1B. Peak Wind Gust Turbulence (Max 30 points)
    let gustScore = 2;
    let gustSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (obs.windGustsKmh >= 90) {
      gustScore = 30;
      gustSev = 'CRITICAL';
    } else if (obs.windGustsKmh >= 65) {
      gustScore = 22;
      gustSev = 'HIGH';
    } else if (obs.windGustsKmh >= 45) {
      gustScore = 14;
      gustSev = 'ELEVATED';
    } else if (obs.windGustsKmh >= 20) {
      gustScore = 6;
      gustSev = 'NORMAL';
    }
    cycloneFactors.push({
      factor: 'Peak Wind Gusts',
      measuredValue: `${obs.windGustsKmh.toFixed(1)} km/h`,
      threshold: '< 45 km/h: Low; 45-64: Elevated; 65-89: Severe; >= 90: Destructive',
      score: gustScore,
      maxScore: 30,
      severity: gustSev,
      rationale: obs.windGustsKmh >= 65
        ? 'Turbulent gusts capable of structural damage to temporary structures, banners, and trees.'
        : obs.windGustsKmh >= 45
        ? 'Elevated gust turbulence. Small craft advisory recommended.'
        : 'Peak gusts pose minimal structural threat.',
    });

    // 1C. Barometric Surface Pressure Deficit (Max 30 points)
    let pressScore = 2;
    let pressSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    let pressValueStr = `${obs.surfacePressureHpa.toFixed(1)} hPa`;
    let pressRationale = 'Surface pressure indicates standard coastal atmospheric gradient.';

    if (obs.surfacePressureHpa <= 0) {
      missingCount++;
      pressScore = 0;
      pressValueStr = 'Sensor Offline / N/A';
      pressRationale = 'Barometric pressure sensor data unavailable; flagged as unverified input.';
    } else if (obs.surfacePressureHpa < 992) {
      pressScore = 30;
      pressSev = 'CRITICAL';
      pressRationale = 'Severe central pressure deficit (< 992 hPa) indicates deep cyclonic vortex intensification.';
    } else if (obs.surfacePressureHpa < 998) {
      pressScore = 24;
      pressSev = 'HIGH';
      pressRationale = 'Deep depression barometric gradient (< 998 hPa) over coastal sector.';
    } else if (obs.surfacePressureHpa < 1004) {
      pressScore = 16;
      pressSev = 'ELEVATED';
      pressRationale = 'Moderate barometric depression (1000-1004 hPa) indicating active low-pressure zone.';
    } else if (obs.surfacePressureHpa < 1010) {
      pressScore = 6;
      pressSev = 'NORMAL';
      pressRationale = 'Marginal pressure deviation from 1013.25 hPa nominal baseline.';
    }
    cycloneFactors.push({
      factor: 'Barometric Surface Pressure',
      measuredValue: pressValueStr,
      threshold: '> 1008 hPa: Stable; 1004-1008: Low; 998-1003: Depression; < 998: Deep Low / Cyclone',
      score: pressScore,
      maxScore: 30,
      severity: pressSev,
      rationale: pressRationale,
    });

    const cycloneTotal = Math.min(100, windScore + gustScore + pressScore);
    const cycloneCat: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' =
      cycloneTotal >= 75 ? 'CRITICAL' : cycloneTotal >= 50 ? 'HIGH' : cycloneTotal >= 25 ? 'MODERATE' : 'LOW';

    const cycloneSummary =
      cycloneCat === 'CRITICAL'
        ? 'Severe tropical cyclone wind & barometric depression criteria met.'
        : cycloneCat === 'HIGH'
        ? 'Elevated cyclonic gale winds and pressure drop detected along maritime corridor.'
        : cycloneCat === 'MODERATE'
        ? 'Moderate squally wind and localized atmospheric depression in vicinity.'
        : 'Calm or nominal coastal atmospheric baseline with no cyclonic signature.';

    // ==========================================
    // SCORE 2: RAINFALL IMPACT FACTORS (0 - 100)
    // ==========================================

    // 2A. Hourly Rainfall Intensity (Max 60 points, IMD precipitation classification)
    let rainRateScore = 0;
    let rainSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (obs.rainfallMm >= 35.0) {
      rainRateScore = 60;
      rainSev = 'CRITICAL';
    } else if (obs.rainfallMm >= 15.6) {
      rainRateScore = 50;
      rainSev = 'HIGH';
    } else if (obs.rainfallMm >= 7.6) {
      rainRateScore = 40;
      rainSev = 'HIGH';
    } else if (obs.rainfallMm >= 2.5) {
      rainRateScore = 25;
      rainSev = 'ELEVATED';
    } else if (obs.rainfallMm > 0.0) {
      rainRateScore = 12;
      rainSev = 'NORMAL';
    }
    rainfallFactors.push({
      factor: 'Hourly Rainfall Rate (Intensity)',
      measuredValue: `${obs.rainfallMm.toFixed(1)} mm/h`,
      threshold: '0: Nil; 0.1-2.4: Light; 2.5-7.5: Moderate; 7.6-15.5: Rather Heavy; 15.6-34.9: Heavy; >= 35: Torrential',
      score: rainRateScore,
      maxScore: 60,
      severity: rainSev,
      rationale: obs.rainfallMm >= 35.0
        ? 'IMD Torrential precipitation rate (>= 35 mm/h). Severe flash flooding and low-lying inundation imminent.'
        : obs.rainfallMm >= 15.6
        ? 'Heavy rainfall rate. Significant street waterlogging, canal surge, and drainage backflow hazard.'
        : obs.rainfallMm >= 2.5
        ? 'Moderate continuous showers. Storm-water drains operating within standard capacity.'
        : 'Light showers or dry coastal conditions.',
    });

    // 2B. Preceding Precipitation Accumulation / Trend (Max 40 points)
    let precipVolumeScore = 0;
    let volumeSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    const precipVol = obs.precipitationMm || 0;
    if (precipVol > 30.0) {
      precipVolumeScore = 40;
      volumeSev = 'CRITICAL';
    } else if (precipVol > 15.0) {
      precipVolumeScore = 30;
      volumeSev = 'HIGH';
    } else if (precipVol > 5.0) {
      precipVolumeScore = 20;
      volumeSev = 'ELEVATED';
    } else if (precipVol > 0.0) {
      precipVolumeScore = 10;
      volumeSev = 'NORMAL';
    }
    rainfallFactors.push({
      factor: 'Cumulative Moisture Volume',
      measuredValue: `${precipVol.toFixed(1)} mm`,
      threshold: '< 5 mm: Low; 5-15 mm: Moderate; 15-30 mm: Significant; > 30 mm: Severe Waterlogging',
      score: precipVolumeScore,
      maxScore: 40,
      severity: volumeSev,
      rationale: precipVol > 30.0
        ? 'Extended cumulative precipitation volume. Soil saturation high, increasing runoff and waterlogging.'
        : precipVol > 15.0
        ? 'Substantial cumulative precipitation. Water accumulation in low-lying coastal pockets.'
        : 'Cumulative precipitation volume within manageable seasonal absorption levels.',
    });

    const rainfallTotal = Math.min(100, rainRateScore + precipVolumeScore);
    const rainfallCat: 'LOW' | 'MODERATE' | 'HEAVY' | 'TORRENTIAL' =
      rainfallTotal >= 75 ? 'TORRENTIAL' : rainfallTotal >= 50 ? 'HEAVY' : rainfallTotal >= 25 ? 'MODERATE' : 'LOW';

    const rainfallSummary =
      rainfallCat === 'TORRENTIAL'
        ? 'Torrential inundation risk. Active flash flood and urban waterlogging alert.'
        : rainfallCat === 'HEAVY'
        ? 'Heavy precipitation alert. Monitor storm-water drainage and low-lying coastal settlements.'
        : rainfallCat === 'MODERATE'
        ? 'Moderate seasonal monsoon rainfall detected. Standard drainage precautions apply.'
        : 'Dry or negligible precipitation across station monitoring zone.';

    // ==========================================
    // COMPOSITE GENERAL METEOROLOGICAL SCORE (0 - 100)
    // ==========================================
    // Weighted combination: 60% Cyclone Wind/Pressure + 40% Rainfall Inundation
    const compositeScore = Math.min(100, Math.round(cycloneTotal * 0.6 + rainfallTotal * 0.4));
    const compositeCat: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL' =
      compositeScore >= 80 ? 'CRITICAL' : compositeScore >= 55 ? 'HIGH' : compositeScore >= 35 ? 'ELEVATED' : compositeScore >= 20 ? 'MODERATE' : 'LOW';

    let actionRecommendation = 'Routine disaster preparedness posture. No emergency actions required.';
    if (compositeScore >= 80 || cycloneTotal >= 75) {
      actionRecommendation = 'Initiate coastal evacuations to multipurpose shelters; halt fishing and port operations; place emergency generators on standby.';
    } else if (compositeScore >= 55 || cycloneTotal >= 50 || rainfallTotal >= 50) {
      actionRecommendation = 'Issue coastal gale/inundation warnings; alert district response teams; prepare shelters for potential evacuees.';
    } else if (compositeScore >= 35 || cycloneTotal >= 25 || rainfallTotal >= 25) {
      actionRecommendation = 'Advise fishermen against deep-sea venturing; monitor hourly barometric trend; inspect shelter drainage.';
    } else if (compositeScore >= 20) {
      actionRecommendation = 'Maintain routine coastal surveillance and verify shelter communication hotlines.';
    }

    const stationInfo = TAMIL_NADU_COASTAL_STATIONS.find((s) => s.id === obs.stationId);

    return {
      stationId: obs.stationId,
      locationName: obs.locationName,
      district: obs.district,
      assessedAt: new Date().toISOString(),
      methodology: 'Dual Rule-Based Meteorological Matrices (IMD / WMO Thresholds) — Non-ML',

      // Separate Score 1
      cycloneScore: cycloneTotal,
      cycloneCategory: cycloneCat,
      cycloneSummary,
      cycloneFactors,

      // Separate Score 2
      rainfallScore: rainfallTotal,
      rainfallCategory: rainfallCat,
      rainfallSummary,
      rainfallFactors,

      // Composite
      overallScore: compositeScore,
      riskCategory: compositeCat,
      summaryExplanation: `Cyclone Impact: ${cycloneTotal}/100 (${cycloneCat}) • Rainfall Impact: ${rainfallTotal}/100 (${rainfallCat})`,
      actionRecommendation,
      contributingFactors: [...cycloneFactors, ...rainfallFactors],

      geographicExposure: {
        coastalZone: stationInfo?.coastalZone || 'Tamil Nadu Coastline',
        coastalProximityKm: 1.5,
        isHighRiskCoastalZone: stationInfo?.isHighRiskZone || false,
        unlinkedDatasetsNotice:
          'Physical flood inundation depth, storm surge run-up, high-resolution bathymetry, and census block structural building vulnerability require unlinked TNSDMA GIS / Survey of India datasets. Current score quantifies pure atmospheric meteorological hazard.',
      },
      dataQuality: {
        windAvailable: obs.windSpeedKmh >= 0,
        gustAvailable: obs.windGustsKmh >= 0,
        pressureAvailable: obs.surfacePressureHpa > 0,
        rainAvailable: obs.rainfallMm >= 0,
        missingParamsCount: missingCount,
      },
    };
  }

  public async getStationAssessment(station: CoastalStation, forceRefresh = false): Promise<RuleBasedRiskAssessment> {
    const obs = await this.getStationWeather(station, forceRefresh);
    return this.computeRuleBasedAssessment(obs);
  }

  /**
   * Generates statewide risk summaries across all 14 coastal districts
   */
  public async getDistrictRiskSummaries(forceRefresh = false): Promise<DistrictRiskSummary[]> {
    const observations = await this.getAllCoastalStationsWeather(forceRefresh);
    const summaries: DistrictRiskSummary[] = [];

    for (const dist of TAMIL_NADU_COASTAL_DISTRICTS) {
      const stationObs = observations.find(
        (o) => o.stationId === dist.stationId || o.district.toLowerCase() === dist.name.toLowerCase()
      );

      if (stationObs) {
        const assessment = this.computeRuleBasedAssessment(stationObs);
        summaries.push({
          districtId: dist.id,
          districtName: dist.name,
          stationId: stationObs.stationId,
          locationName: stationObs.locationName,
          cycloneScore: assessment.cycloneScore,
          cycloneCategory: assessment.cycloneCategory,
          rainfallScore: assessment.rainfallScore,
          rainfallCategory: assessment.rainfallCategory,
          overallScore: assessment.overallScore,
          riskScore: assessment.overallScore,
          riskCategory: assessment.riskCategory,
          windSpeedKmh: stationObs.windSpeedKmh,
          windGustsKmh: stationObs.windGustsKmh,
          surfacePressureHpa: stationObs.surfacePressureHpa,
          rainfallMm: stationObs.rainfallMm,
          precipitationMm: stationObs.precipitationMm,
          rainfallDescription: stationObs.rainfallDescription,
          actionRecommendation: assessment.actionRecommendation,
          coastalZone: dist.coastalZone,
          isHighRiskZone: dist.isHighRiskZone,
        });
      }
    }

    return summaries;
  }
}

export const openMeteoService = new OpenMeteoService();
