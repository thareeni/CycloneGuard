export interface CoastalStation {
  id: string;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  coastalZone: string;
  isHighRiskZone: boolean;
}

export interface OpenMeteoCurrentResponse {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  weather_code: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
}

export interface OpenMeteoHourlyResponse {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  rain: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
}

export interface OpenMeteoApiResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current: OpenMeteoCurrentResponse;
  hourly?: OpenMeteoHourlyResponse;
}

export interface HourlyForecastPoint {
  time: string;
  temperature: number;
  rainfall: number;
  windSpeed: number;
  windGusts: number;
}

export interface LiveWeatherObservation {
  stationId: string;
  locationName: string;
  district: string;
  latitude: number;
  longitude: number;
  temperatureCelsius: number;
  apparentTemperatureCelsius: number;
  humidityPct: number;
  surfacePressureHpa: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustsKmh: number;
  rainfallMm: number;
  precipitationMm: number;
  weatherCode: number;
  weatherCondition: string;
  isDay: boolean;
  cycloneRiskIndex: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  observedAt: string;
  hourlyForecast: HourlyForecastPoint[];
  metadata: {
    source: string;
    originType: 'LIVE_API';
    providerUrl: string;
    lastUpdated: string;
    cached: boolean;
  };
}

export const TAMIL_NADU_COASTAL_STATIONS: CoastalStation[] = [
  {
    id: 'chennai',
    name: 'Chennai Port & Coastal Zone',
    district: 'Chennai',
    latitude: 13.0827,
    longitude: 80.2707,
    coastalZone: 'North Tamil Nadu Coast',
    isHighRiskZone: true,
  },
  {
    id: 'nagapattinam',
    name: 'Nagapattinam Deep Harbour',
    district: 'Nagapattinam',
    latitude: 10.7656,
    longitude: 79.8424,
    coastalZone: 'Central Tamil Nadu Delta Coast',
    isHighRiskZone: true,
  },
  {
    id: 'cuddalore',
    name: 'Cuddalore Coastal Corridor',
    district: 'Cuddalore',
    latitude: 11.7480,
    longitude: 79.7714,
    coastalZone: 'North-Central Tamil Nadu Coast',
    isHighRiskZone: true,
  },
  {
    id: 'chengalpattu',
    name: 'Mahabalipuram / Chengalpattu Coast',
    district: 'Chengalpattu',
    latitude: 12.6190,
    longitude: 80.1930,
    coastalZone: 'North Tamil Nadu Coast',
    isHighRiskZone: false,
  },
  {
    id: 'rameshwaram',
    name: 'Ramanathapuram / Rameswaram Island',
    district: 'Ramanathapuram',
    latitude: 9.2876,
    longitude: 79.3129,
    coastalZone: 'Gulf of Mannar / Palk Strait',
    isHighRiskZone: true,
  },
];

export interface RiskFactor {
  factor: string;
  measuredValue: string;
  threshold: string;
  score: number;
  maxScore: number;
  severity: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  rationale: string;
}

export interface RuleBasedRiskAssessment {
  stationId: string;
  locationName: string;
  district: string;
  assessedAt: string;
  methodology: string;
  overallScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  summaryExplanation: string;
  actionRecommendation: string;
  contributingFactors: RiskFactor[];
  dataQuality: {
    windAvailable: boolean;
    gustAvailable: boolean;
    pressureAvailable: boolean;
    rainAvailable: boolean;
    missingParamsCount: number;
  };
}

