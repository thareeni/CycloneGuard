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
}

export const openMeteoService = new OpenMeteoService();
