-- CycloneGuard Database Schema
-- Real-Time Cyclone Disaster Management System
-- PostgreSQL Schema

CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    state VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu',
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    coastal BOOLEAN NOT NULL DEFAULT true,
    headquarters VARCHAR(100),
    emergency_control_room_phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Real-time and recorded weather observations (Live external API data from Open-Meteo)
CREATE TABLE IF NOT EXISTS weather_observations (
    id BIGSERIAL PRIMARY KEY,
    district_id INT REFERENCES districts(id) ON DELETE SET NULL,
    location_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    temperature_celsius DECIMAL(5, 2),
    apparent_temperature_celsius DECIMAL(5, 2),
    relative_humidity_pct INT,
    surface_pressure_hpa DECIMAL(7, 2),
    wind_speed_kmh DECIMAL(6, 2),
    wind_direction_deg INT,
    wind_gusts_kmh DECIMAL(6, 2),
    rainfall_mm DECIMAL(6, 2),
    precipitation_mm DECIMAL(6, 2),
    weather_code INT,
    is_day BOOLEAN,
    data_source VARCHAR(80) NOT NULL DEFAULT 'Open-Meteo API',
    origin_type VARCHAR(30) NOT NULL DEFAULT 'LIVE_API',
    observed_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_location_time ON weather_observations(location_name, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_district_id ON weather_observations(district_id);

-- Official Cyclone Systems (Recorded ONLY when official IMD RSMC data is valid and available)
CREATE TABLE IF NOT EXISTS cyclone_events (
    id SERIAL PRIMARY KEY,
    official_cyclone_id VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    basin VARCHAR(50) NOT NULL DEFAULT 'Bay of Bengal',
    classification VARCHAR(80) NOT NULL,
    current_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    official_source VARCHAR(100) NOT NULL DEFAULT 'IMD RSMC New Delhi',
    origin_type VARCHAR(30) NOT NULL DEFAULT 'OFFICIAL_MET_AGENCY',
    bulletin_number VARCHAR(50),
    bulletin_url TEXT,
    first_observed_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Official Cyclone Track Coordinates (Historical path & Official Forecast Cone points)
CREATE TABLE IF NOT EXISTS cyclone_tracks (
    id BIGSERIAL PRIMARY KEY,
    cyclone_id INT NOT NULL REFERENCES cyclone_events(id) ON DELETE CASCADE,
    timepoint TIMESTAMPTZ NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    central_pressure_hpa DECIMAL(6, 1),
    max_sustained_wind_kmh DECIMAL(6, 2),
    gusts_kmh DECIMAL(6, 2),
    intensity_stage VARCHAR(80),
    is_forecast BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cyclone_track UNIQUE (cyclone_id, timepoint, is_forecast)
);

-- Official Cyclone Warnings per District
CREATE TABLE IF NOT EXISTS cyclone_warnings (
    id SERIAL PRIMARY KEY,
    cyclone_id INT REFERENCES cyclone_events(id) ON DELETE SET NULL,
    district_id INT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    warning_level VARCHAR(20) NOT NULL, -- YELLOW, ORANGE, RED, DE-ESCALATED
    stage_name VARCHAR(50),
    headline VARCHAR(255) NOT NULL,
    advisory_details TEXT NOT NULL,
    rainfall_warning TEXT,
    wind_warning TEXT,
    sea_condition_warning TEXT,
    fishermen_warning TEXT,
    issued_at TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    source VARCHAR(100) NOT NULL DEFAULT 'IMD Coastal Warning Bulletin',
    origin_type VARCHAR(30) NOT NULL DEFAULT 'OFFICIAL_BULLETIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Operational Disaster Shelters (Manual Operational Ground Data)
CREATE TABLE IF NOT EXISTS shelters (
    id SERIAL PRIMARY KEY,
    district_id INT NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    total_capacity INT NOT NULL,
    current_occupancy INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'STANDBY', -- STANDBY, OPEN, FULL, CLOSED
    has_generator BOOLEAN NOT NULL DEFAULT true,
    has_medical_post BOOLEAN NOT NULL DEFAULT false,
    has_drinking_water BOOLEAN NOT NULL DEFAULT true,
    contact_person VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    data_source VARCHAR(100) NOT NULL DEFAULT 'District Disaster Management Authority (DDMA)',
    origin_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL_OPERATIONAL',
    last_inspected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relief Inventory at Shelters & Hubs (Manual Operational Ground Data)
CREATE TABLE IF NOT EXISTS relief_inventory (
    id SERIAL PRIMARY KEY,
    shelter_id INT REFERENCES shelters(id) ON DELETE CASCADE,
    district_id INT REFERENCES districts(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL, -- FOOD_RATIONS, DRINKING_WATER, MEDICAL_KITS, BEDDING_BLANKETS, GENERATORS_FUEL, TARPAULIN_SHEETS
    item_name VARCHAR(120) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(30) NOT NULL, -- units, liters, packets, kg, boxes
    critical_threshold NUMERIC(10, 2) NOT NULL DEFAULT 50.0,
    stock_status VARCHAR(30) NOT NULL DEFAULT 'SUFFICIENT', -- SUFFICIENT, LOW, CRITICAL, DEPLETED
    notes TEXT,
    data_source VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu State Relief Warehouse Log',
    origin_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL_OPERATIONAL',
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shelters_district ON shelters(district_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shelter ON relief_inventory(shelter_id);
