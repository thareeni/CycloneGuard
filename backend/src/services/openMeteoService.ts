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
} from '../types/weather';

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

    return {
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
  }

  /**
   * Transparent rule-based weather impact calculation (Deterministic matrix, Non-ML)
   */
  public computeRuleBasedAssessment(obs: LiveWeatherObservation): RuleBasedRiskAssessment {
    const factors: RiskFactor[] = [];
    let missingCount = 0;
    let totalScore = 0;

    // 1. Sustained Wind Factor (Max 30)
    let windScore = 0;
    let windSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (obs.windSpeedKmh >= 62) {
      windScore = 30;
      windSev = 'CRITICAL';
    } else if (obs.windSpeedKmh >= 45) {
      windScore = 22;
      windSev = 'HIGH';
    } else if (obs.windSpeedKmh >= 30) {
      windScore = 14;
      windSev = 'ELEVATED';
    } else if (obs.windSpeedKmh >= 15) {
      windScore = 6;
      windSev = 'NORMAL';
    } else {
      windScore = 2;
      windSev = 'NORMAL';
    }
    totalScore += windScore;
    factors.push({
      factor: '10m Sustained Wind Speed',
      measuredValue: `${obs.windSpeedKmh.toFixed(1)} km/h`,
      threshold: '< 30 km/h: Normal; 30-44: Squally; 45-61: Gale; >= 62: Cyclonic Storm',
      score: windScore,
      maxScore: 30,
      severity: windSev,
      rationale: obs.windSpeedKmh >= 62
        ? 'IMD Cyclonic storm threshold exceeded. Major risk to coastal shipping, fishing crafts, and structures.'
        : obs.windSpeedKmh >= 30
        ? 'Moderate to squally coastal wind detected. Coastal vigilance recommended.'
        : 'Sustained winds within normal baseline atmospheric levels.',
    });

    // 2. Wind Gust Severity (Max 25)
    let gustScore = 0;
    let gustSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (obs.windGustsKmh >= 90) {
      gustScore = 25;
      gustSev = 'CRITICAL';
    } else if (obs.windGustsKmh >= 65) {
      gustScore = 18;
      gustSev = 'HIGH';
    } else if (obs.windGustsKmh >= 45) {
      gustScore = 11;
      gustSev = 'ELEVATED';
    } else if (obs.windGustsKmh >= 20) {
      gustScore = 4;
      gustSev = 'NORMAL';
    } else {
      gustScore = 1;
      gustSev = 'NORMAL';
    }
    totalScore += gustScore;
    factors.push({
      factor: 'Peak Wind Gusts',
      measuredValue: `${obs.windGustsKmh.toFixed(1)} km/h`,
      threshold: '< 45 km/h: Low; 45-64: Elevated; 65-89: High; >= 90: Critical',
      score: gustScore,
      maxScore: 25,
      severity: gustSev,
      rationale: obs.windGustsKmh >= 65
        ? 'Dangerous turbulent gusts capable of damaging unreinforced roofing, power lines, and trees.'
        : obs.windGustsKmh >= 45
        ? 'Elevated gust turbulence. Temporary banners and light fixtures should be secured.'
        : 'Peak gusts pose minimal structural threat.',
    });

    // 3. Barometric Pressure Deficit (Max 25)
    let pressScore = 0;
    let pressSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (obs.surfacePressureHpa <= 0) {
      missingCount++;
    } else if (obs.surfacePressureHpa < 992) {
      pressScore = 25;
      pressSev = 'CRITICAL';
    } else if (obs.surfacePressureHpa < 1000) {
      pressScore = 19;
      pressSev = 'HIGH';
    } else if (obs.surfacePressureHpa < 1006) {
      pressScore = 12;
      pressSev = 'ELEVATED';
    } else if (obs.surfacePressureHpa < 1010) {
      pressScore = 5;
      pressSev = 'NORMAL';
    } else {
      pressScore = 2;
      pressSev = 'NORMAL';
    }
    totalScore += pressScore;
    factors.push({
      factor: 'Barometric Surface Pressure',
      measuredValue: obs.surfacePressureHpa > 0 ? `${obs.surfacePressureHpa.toFixed(1)} hPa` : 'Sensor N/A',
      threshold: '> 1008 hPa: Stable; 1004-1007: Low; 998-1003: Depression; < 998: Deep Low / Cyclone',
      score: pressScore,
      maxScore: 25,
      severity: pressSev,
      rationale: obs.surfacePressureHpa < 1000
        ? 'Severe barometric depression indicating cyclonic vortex intensification in coastal vicinity.'
        : obs.surfacePressureHpa < 1006
        ? 'Moderate pressure drop indicating low-pressure circulation system.'
        : 'Surface pressure indicates standard coastal atmospheric gradient.',
    });

    // 4. Rainfall / Inundation Rate (Max 20)
    let rainScore = 0;
    let rainSev: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (obs.rainfallMm >= 35) {
      rainScore = 20;
      rainSev = 'CRITICAL';
    } else if (obs.rainfallMm >= 15) {
      rainScore = 14;
      rainSev = 'HIGH';
    } else if (obs.rainfallMm >= 5) {
      rainScore = 8;
      rainSev = 'ELEVATED';
    } else if (obs.rainfallMm > 0) {
      rainScore = 3;
      rainSev = 'NORMAL';
    } else {
      rainScore = 0;
      rainSev = 'NORMAL';
    }
    totalScore += rainScore;
    factors.push({
      factor: 'Hourly Rainfall Rate',
      measuredValue: `${obs.rainfallMm.toFixed(1)} mm/h`,
      threshold: '< 5 mm/h: Normal; 5-14: Moderate; 15-34: Heavy; >= 35: Torrential Inundation',
      score: rainScore,
      maxScore: 20,
      severity: rainSev,
      rationale: obs.rainfallMm >= 15
        ? 'Heavy localized precipitation. Significant waterlogging and coastal flash flood hazard.'
        : obs.rainfallMm >= 5
        ? 'Moderate rainfall detected. Drainage monitoring advised.'
        : 'Negligible or light precipitation.',
    });

    // Determine category
    let riskCat: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'LOW';
    let summary = '';
    let recommendation = '';

    if (totalScore >= 80) {
      riskCat = 'CRITICAL';
      summary = 'Severe meteorological conditions meeting emergency cyclonic criteria.';
      recommendation = 'Initiate coastal evacuations to cyclone shelters; halt fishing and port operations; place emergency generators on standby.';
    } else if (totalScore >= 55) {
      riskCat = 'HIGH';
      summary = 'High weather hazard from gale winds, turbulent gusts, or heavy rainfall.';
      recommendation = 'Issue coastal gale warnings; alert district response teams; prepare multipurpose shelters for potential evacuees.';
    } else if (totalScore >= 35) {
      riskCat = 'ELEVATED';
      summary = 'Elevated coastal squalls or barometric depression detected.';
      recommendation = 'Advise fishermen against deep-sea venturing; monitor hourly barometric trend; inspect shelter drainage.';
    } else if (totalScore >= 20) {
      riskCat = 'MODERATE';
      summary = 'Moderate coastal weather within manageable monsoon/seasonal margins.';
      recommendation = 'Maintain routine coastal surveillance and verify shelter communication hotlines.';
    } else {
      riskCat = 'LOW';
      summary = 'Atmospheric parameters indicate calm or nominal coastal conditions.';
      recommendation = 'Routine disaster preparedness posture. No emergency actions required.';
    }

    return {
      stationId: obs.stationId,
      locationName: obs.locationName,
      district: obs.district,
      assessedAt: new Date().toISOString(),
      methodology: 'Rule-Based Deterministic Meteorological Matrix (IMD / WMO Thresholds) — Non-ML',
      overallScore: totalScore,
      riskCategory: riskCat,
      summaryExplanation: summary,
      actionRecommendation: recommendation,
      contributingFactors: factors,
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
}

export const openMeteoService = new OpenMeteoService();
