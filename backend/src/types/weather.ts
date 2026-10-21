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
  cycloneScore?: number;
  cycloneCategory?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  rainfallScore?: number;
  rainfallCategory?: 'LOW' | 'MODERATE' | 'HEAVY' | 'TORRENTIAL';
  riskScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  dataFreshness: 'LIVE' | 'CACHED' | 'STALE';
  rainfallDescription?: string;
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
    name: 'Chennai Port & Marina Coastal Zone',
    district: 'Chennai',
    latitude: 13.0827,
    longitude: 80.2707,
    coastalZone: 'North Tamil Nadu Coast',
    isHighRiskZone: true,
  },
  {
    id: 'tiruvallur',
    name: 'Pulicat Lake & Ennore Maritime Watch',
    district: 'Tiruvallur',
    latitude: 13.2500,
    longitude: 80.3200,
    coastalZone: 'North Tamil Nadu Coast',
    isHighRiskZone: true,
  },
  {
    id: 'chengalpattu',
    name: 'Mahabalipuram & Kalpakkam Shore',
    district: 'Chengalpattu',
    latitude: 12.6190,
    longitude: 80.1930,
    coastalZone: 'North Tamil Nadu Coast',
    isHighRiskZone: false,
  },
  {
    id: 'villupuram',
    name: 'Marakkanam Estuary & Salt Pan Coast',
    district: 'Villupuram',
    latitude: 12.1983,
    longitude: 79.9528,
    coastalZone: 'North-Central Tamil Nadu Coast',
    isHighRiskZone: false,
  },
  {
    id: 'cuddalore',
    name: 'Cuddalore Port & Silver Beach Corridor',
    district: 'Cuddalore',
    latitude: 11.7480,
    longitude: 79.7714,
    coastalZone: 'Central Delta Coast',
    isHighRiskZone: true,
  },
  {
    id: 'mayiladuthurai',
    name: 'Poompuhar & Tharangambadi Heritage Coast',
    district: 'Mayiladuthurai',
    latitude: 11.1485,
    longitude: 79.8558,
    coastalZone: 'Central Delta Coast',
    isHighRiskZone: true,
  },
  {
    id: 'nagapattinam',
    name: 'Nagapattinam Deep Harbour & Velankanni',
    district: 'Nagapattinam',
    latitude: 10.7656,
    longitude: 79.8424,
    coastalZone: 'Central Delta Coast',
    isHighRiskZone: true,
  },
  {
    id: 'tiruvarur',
    name: 'Muthupet Mangrove Lagoon',
    district: 'Tiruvarur',
    latitude: 10.4000,
    longitude: 79.5100,
    coastalZone: 'Palk Strait Coast',
    isHighRiskZone: false,
  },
  {
    id: 'thanjavur',
    name: 'Mallipattinam & Manora Fort Coast',
    district: 'Thanjavur',
    latitude: 10.2778,
    longitude: 79.3175,
    coastalZone: 'Palk Strait Coast',
    isHighRiskZone: false,
  },
  {
    id: 'pudukkottai',
    name: 'Kottaipattinam Fishery Terminal',
    district: 'Pudukkottai',
    latitude: 9.9750,
    longitude: 79.1980,
    coastalZone: 'Palk Bay Coast',
    isHighRiskZone: false,
  },
  {
    id: 'rameshwaram',
    name: 'Rameswaram Island & Pamban Marine Passage',
    district: 'Ramanathapuram',
    latitude: 9.2876,
    longitude: 79.3129,
    coastalZone: 'Gulf of Mannar / Palk Strait',
    isHighRiskZone: true,
  },
  {
    id: 'thoothukudi',
    name: 'V.O.C. Port & Pearl City Coast',
    district: 'Thoothukudi',
    latitude: 8.7642,
    longitude: 78.1348,
    coastalZone: 'Gulf of Mannar Coast',
    isHighRiskZone: true,
  },
  {
    id: 'tirunelveli',
    name: 'Radhapuram & Koodankulam Coastal Zone',
    district: 'Tirunelveli',
    latitude: 8.1740,
    longitude: 77.6820,
    coastalZone: 'Southern Maritime Corridor',
    isHighRiskZone: false,
  },
  {
    id: 'kanyakumari',
    name: 'Cape Comorin Marine Observatory',
    district: 'Kanniyakumari',
    latitude: 8.0883,
    longitude: 77.5385,
    coastalZone: 'Southernmost Cape / Triple Sea Confluence',
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

  // Separate Score 1: Cyclone Impact Score (0 - 100)
  cycloneScore: number;
  cycloneCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  cycloneSummary: string;
  cycloneFactors: RiskFactor[];

  // Separate Score 2: Rainfall Impact Score (0 - 100)
  rainfallScore: number;
  rainfallCategory: 'LOW' | 'MODERATE' | 'HEAVY' | 'TORRENTIAL';
  rainfallSummary: string;
  rainfallFactors: RiskFactor[];

  // Composite / General Impact Score
  overallScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  summaryExplanation: string;
  actionRecommendation: string;
  contributingFactors: RiskFactor[];

  geographicExposure: {
    coastalZone: string;
    coastalProximityKm: number;
    isHighRiskCoastalZone: boolean;
    unlinkedDatasetsNotice: string;
  };
  dataQuality: {
    windAvailable: boolean;
    gustAvailable: boolean;
    pressureAvailable: boolean;
    rainAvailable: boolean;
    missingParamsCount: number;
  };
}

export interface DistrictRiskSummary {
  districtId: number;
  districtName: string;
  stationId: string;
  locationName: string;

  // Separate Score 1: Cyclone Impact Score
  cycloneScore: number;
  cycloneCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

  // Separate Score 2: Rainfall Impact Score
  rainfallScore: number;
  rainfallCategory: 'LOW' | 'MODERATE' | 'HEAVY' | 'TORRENTIAL';

  // Composite
  overallScore: number;
  riskScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

  windSpeedKmh: number;
  windGustsKmh: number;
  surfacePressureHpa: number;
  rainfallMm: number;
  precipitationMm?: number;
  rainfallDescription?: string;
  actionRecommendation: string;
  coastalZone: string;
  isHighRiskZone: boolean;
}

