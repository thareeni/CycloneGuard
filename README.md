# CycloneGuard — Real-Time Cyclone Disaster Management System

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript%20%2B%20Vite-blue)](https://vitejs.dev)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express%20%2B%20TypeScript-green)](https://nodejs.org)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)](https://www.postgresql.org)
[![Cache](https://img.shields.io/badge/Cache-Redis-DC382D)](https://redis.io)
[![Maps](https://img.shields.io/badge/Maps-Leaflet%20%2B%20OpenStreetMap-199900)](https://leafletjs.com)

**CycloneGuard** is a full-stack disaster management and preparedness system built for real-time monitoring of tropical cyclones, coastal meteorological risks, emergency evacuation shelters, and relief logistics along the Bay of Bengal coastline, focusing on Tamil Nadu (Chennai, Nagapattinam, Cuddalore, Chengalpattu, and Rameswaram).

---

## 🏛️ System Architecture

```
CycloneGuard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # Strongly-typed environment variables
│   │   │   ├── database.ts         # PostgreSQL Pool with automatic migration & resilient fallback
│   │   │   └── redis.ts            # Redis client with seamless in-memory fallback
│   │   ├── types/
│   │   │   ├── weather.ts          # Open-Meteo observation contracts & coastal stations
│   │   │   ├── cyclone.ts          # IMD cyclone track & warning models
│   │   │   └── operational.ts      # Shelters & relief inventory models
│   │   ├── services/
│   │   │   ├── openMeteoService.ts # Live weather service (validation, caching, persistence)
│   │   │   ├── imdCycloneService.ts# Official IMD interface (zero fake data policy)
│   │   │   ├── shelterService.ts   # Operational ground shelter management
│   │   │   └── inventoryService.ts # Operational relief stockpile management
│   │   ├── controllers/            # Express controllers
│   │   ├── routes/                 # Express REST API routes
│   │   ├── db/
│   │   │   ├── schema.sql          # PostgreSQL DDL tables
│   │   │   └── seed.sql            # Operational baseline seeds
│   │   └── index.ts                # Express server entry point
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx          # Real-time telemetry badges (Open-Meteo, IMD, Redis, DB)
│   │   │   ├── DataSourceLegend.tsx# Data provenance explanation
│   │   │   ├── CycloneStatusBanner.tsx # IMD status & onboarding guide
│   │   │   ├── LiveWeatherCard.tsx # Live telemetry cards (wind, gusts, rain, pressure)
│   │   │   ├── MapView.tsx         # Leaflet + OpenStreetMap with live station pins & shelters
│   │   │   ├── SheltersTable.tsx   # Operational shelters directory
│   │   │   └── ReliefInventoryTable.tsx # Operational relief inventory ledger
│   │   ├── services/
│   │   │   └── api.ts              # Frontend REST API client
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml              # Multi-container orchestration (PostgreSQL, Redis, Backend, Frontend)
├── IMD_INTEGRATION_GUIDE.md        # Official India Meteorological Department API investigation
└── README.md
```

---

## ⚡ Real-Time Data & Governance Principles

### 1. Live Weather API (Open-Meteo)
* **Status:** Fully Live & Operational.
* **Target Coastal Stations:** Chennai Port, Nagapattinam Deep Harbour, Cuddalore Coastal Corridor, Mahabalipuram, Rameswaram.
* **Telemetry Collected:** Real-time 2m temperature, apparent temperature, relative humidity, barometric surface pressure, 10m wind speed, peak gusts, rainfall, precipitation, and WMO weather codes.
* **Caching & Resilience:** Cached in Redis with 10-minute TTL (fallback to in-memory cache if Redis is restarting), validated at runtime using Zod, and asynchronously recorded into PostgreSQL `weather_observations`.

### 2. Official Cyclone Feeds (India Meteorological Department — IMD)
* **Status:** Interface implemented; requires official API key from [api.imd.gov.in](https://api.imd.gov.in).
* **Zero Fabrication Policy:** **CycloneGuard never generates fake cyclone positions, simulated storm tracks, or synthetic official warnings.**
* If credentials are not configured, the interface clearly shows `PENDING_CREDENTIALS` and provides operators with exact onboarding instructions to connect official RSMC New Delhi bulletins. (See [IMD_INTEGRATION_GUIDE.md](./IMD_INTEGRATION_GUIDE.md)).

### 3. Clear Data Distinction
Every piece of information in the UI and API explicitly displays its provenance:
* `[LIVE API DATA]` ➔ Automated real-time telemetry from external meteorological APIs.
* `[OFFICIAL MET AGENCY]` ➔ Statutory bulletins from IMD RSMC New Delhi.
* `[OPERATIONAL GROUND DATA]` ➔ Manually managed emergency shelters, live occupancy headcounts, and relief stockpile logs managed by District Disaster Management Authorities (DDMA) and TNSDMA.

---

## 🗄️ Database Design (PostgreSQL)

The database schema (`backend/src/db/schema.sql`) implements normalized tables with referential integrity:

1. **`districts`**: Coastal and inland districts (Chennai, Nagapattinam, Cuddalore, etc.) with coordinates and emergency control room hotlines.
2. **`weather_observations`**: Historical & real-time telemetry recorded from Open-Meteo with data source attribution, timestamps, and physical indices.
3. **`cyclone_events`**: Official storms logged exclusively from verified IMD feeds with classification, basin, and bulletin links.
4. **`cyclone_tracks`**: Track points with central pressure, sustained winds, gusts, and forecast status.
5. **`cyclone_warnings`**: District-level statutory advisories (Yellow / Orange / Red).
6. **`shelters`**: Ground operational facilities with capacity, current occupancy, generator status, medical posts, and contact officers.
7. **`relief_inventory`**: Item categories (Food rations, drinking water, medical kits, bedding, fuel, tarpaulins) with critical buffer thresholds and replenishment status.

---

## 🚀 Quickstart & Verification Guide

### Option A: Running Directly with Local Node.js (Quickest)

You can run both backend and frontend immediately without waiting for Docker:

#### 1. Start the Backend
Open a terminal in the root directory:
```powershell
cd backend
npm run dev
```
The backend starts at `http://localhost:5000`:
* Health Diagnostics: `http://localhost:5000/api/health`
* Live Coastal Weather: `http://localhost:5000/api/weather/coastal`
* Official Cyclone Status: `http://localhost:5000/api/cyclone/status`
* Ground Shelters: `http://localhost:5000/api/shelters`
* Relief Inventory: `http://localhost:5000/api/inventory`

#### 2. Start the Frontend
In a second terminal:
```powershell
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### Option B: Running with Docker Compose (Full Stack)

To run the complete stack including PostgreSQL and Redis:
```bash
docker compose up --build
```
This boots:
* **PostgreSQL** on port `5432` (with automated schema and seed scripts)
* **Redis** on port `6379`
* **CycloneGuard Backend** on port `5000`
* **CycloneGuard Frontend** on port `5173`

---

## 🔍 How to Verify Real API Data Reaches the Frontend

1. **Check Live Coastal Weather Telemetry:**
   - On the frontend dashboard (`http://localhost:5173`), inspect the cards for **Chennai**, **Nagapattinam**, and **Cuddalore**.
   - Note the live temperature, wind speeds, rainfall, and barometric pressure.
   - Click the **"Refresh Feed"** button in the header.
2. **Verify Backend HTTP Logs:**
   - In your backend terminal, observe:
     ```
     [HTTP] GET /api/weather/coastal -> 200 (xxx ms)
     ```
   - On initial fetch, Open-Meteo is contacted live over HTTPS; subsequent calls within 10 minutes return `⚡ Cached (Redis/In-Memory)` to preserve quota and reduce latency.
3. **Verify Open-Meteo Direct Validation:**
   - Run in your terminal:
     ```bash
     curl http://localhost:5000/api/weather/station/chennai
     ```
   - The response includes `"originType": "LIVE_API"`, `"source": "Open-Meteo API"`, live WMO weather condition, and real coordinates for Chennai Port.
4. **Inspect IMD Gateway Status:**
   - Check the **Cyclone Status Banner** on the dashboard.
   - It will display `INTERFACE ACTIVE` and `PENDING_CREDENTIALS` (or `ALL CLEAR` if an IMD API key is provided).
   - Click **"View IMD Setup"** to inspect registration steps for `api.imd.gov.in`.
5. **Inspect Geospatial Leaflet Map:**
   - The map displays live blue stations along the Tamil Nadu coastline. Clicking any marker reveals live weather telemetry.
   - Amber markers display ground operational emergency shelters with capacity and contact personnel.
