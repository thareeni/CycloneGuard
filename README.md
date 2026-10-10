# CycloneGuard — Real-Time Cyclone Disaster Management System

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript%20%2B%20Vite-blue)](https://vitejs.dev)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express%20%2B%20TypeScript-green)](https://nodejs.org)
[![MERN](https://img.shields.io/badge/MERN%20Stack-MongoDB%20%2B%20Mongoose-47A248)](https://mongoosejs.com)
[![Database](https://img.shields.io/badge/Relational%20DB-PostgreSQL-336791)](https://www.postgresql.org)
[![Cache](https://img.shields.io/badge/Cache-Redis%20%2B%20Memory%20Fallback-DC382D)](https://redis.io)
[![Maps](https://img.shields.io/badge/Maps-Leaflet%20%2B%20OpenStreetMap-199900)](https://leafletjs.com)

**CycloneGuard** is an operational full-stack command-center disaster management platform designed for the Tamil Nadu Bay of Bengal maritime corridor (Chennai, Nagapattinam, Cuddalore, Chengalpattu, and Rameswaram).

It unifies automated meteorological feeds, official meteorological tracking interfaces, deterministic coastal risk evaluation, multipurpose cyclone shelter directories, and strategic emergency relief logistics.

---

## 🏛️ System Architecture & Multi-Page Views

The frontend is structured as a single-page command-center application with a persistent left sidebar and smooth client-side view switching without browser reloads:

1. **Dashboard (`DashboardView`)**:
   - Monitored coastal station weather summary cards.
   - Selected location latest weather telemetry panel.
   - Coastal risk overview strip (peak sustained wind, peak gusts, lowest barometric pressure).
   - Official IMD RSMC alert and warning status banner.
   - Compact geospatial map preview with direct station switcher.

2. **Live Geospatial Map & Cyclone Tracking (`LiveMapView`)**:
   - Leaflet + OpenStreetMap interactive coastal visualization.
   - Real-time station marker selection updating the telemetry inspection panel.
   - Temperature, apparent temperature, humidity, 10m wind speed, peak gusts, barometric pressure, rainfall, wind direction, and 6-hour hourly trend.
   - Cyclone tracking panel reporting verified official storm tracks when bulletins are issued.
   - Zero fabrication policy: displays transparent status when official credentials are pending.

3. **Risk Assessment (`RiskAssessmentView`)**:
   - Coastal station selector for Tamil Nadu maritime corridor.
   - Deterministic, rule-based 100-point composite coastal risk scoring matrix.
   - Factor-by-factor breakdown: Sustained Wind (30 pts), Peak Gusts (25 pts), Barometric Pressure (25 pts), Rainfall Intensity (20 pts).
   - Missing data detection with transparent penalty scoring.
   - Explicitly labeled as a deterministic meteorological estimate, **not** an AI/ML black box.

4. **Shelters & Relief Logistics Management (`SheltersReliefView`)**:
   - Evacuation shelter directory with capacity, current occupancy, and facility flags (generators, medical posts, drinking water).
   - Relational relief stockpile registry (PostgreSQL baseline).
   - **MERN Stack MongoDB Subsystem**: Live Mongoose collection manager with full CRUD operations (`GET`, `POST`, `PUT`, `DELETE /api/mongo/inventory`), category filters, and buffer threshold tracking.

---

## 💻 Tech Stack & Database Architecture

| Layer | Technologies | Role / Scope |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Lucide Icons | Responsive command center UI, client-side routing, telemetry widgets |
| **Mapping** | Leaflet, OpenStreetMap, React-Leaflet | Geospatial stations, storm tracks, and shelter pins |
| **Backend** | Node.js, Express.js, TypeScript | REST API gateway, weather aggregation, risk assessment engine |
| **MERN Database** | MongoDB, Mongoose ODM | Operational relief inventory documents, live CRUD endpoints (`/api/mongo/inventory`) |
| **Relational Database** | PostgreSQL, `pg` Pool | Districts, historical weather observations, shelters, and relational inventory |
| **Caching Layer** | Redis (`ioredis`) + In-Memory Fallback | 10-minute TTL caching for external API requests with automatic fallback |
| **External APIs** | Open-Meteo, IMD RSMC Gateway (`api.imd.gov.in`) | Real-time coastal weather telemetry & official storm advisories |

---

## 🍃 Genuine MERN Stack Implementation

To satisfy academic project requirements for a genuine MERN stack application, MongoDB and Mongoose are integrated as a primary operational database:

* **Mongoose Schema (`backend/src/models/ReliefItemModel.ts`)**:
  - Strongly typed schema: `itemName`, `shelterName`, `districtName`, `category`, `quantity`, `unit`, `criticalThreshold`, `stockStatus`, `notes`, `dataSource`.
  - Mongoose `pre('save')` lifecycle hook that automatically re-evaluates `stockStatus` (`SUFFICIENT`, `LOW`, `CRITICAL`) based on quantity vs. threshold.
* **Mongoose Controller (`backend/src/controllers/mongoInventoryController.ts`)**:
  - `GET /api/mongo/inventory`: List all documents with optional district and category filters; auto-seeds baseline supplies if collection is empty.
  - `POST /api/mongo/inventory`: Insert new emergency supplies with validation.
  - `PUT /api/mongo/inventory/:id`: Update quantities, thresholds, or notes.
  - `DELETE /api/mongo/inventory/:id`: Remove stock records from MongoDB.
* **Frontend UI Integration (`frontend/src/views/SheltersReliefView.tsx`)**:
  - Dedicated "MERN Stack (MongoDB Collections)" tab with real-time syncing, add stock modal dialog, delete triggers, and live stock status pills.
  - Resilient Standby Handling: If no local MongoDB daemon is running, the backend cleanly returns a 503 standby response without crashing, and the UI displays connection instructions for MongoDB Atlas.

---

## ⚡ Real-Time Data & Governance Principles

1. **Live Weather API (Open-Meteo)**:
   - **Status: Live & Verified.**
   - Five coastal monitoring stations: Chennai Port, Nagapattinam Harbour, Cuddalore Corridor, Mahabalipuram, and Rameswaram.
   - Real-time measurements: Temperature, apparent temperature, relative humidity, barometric pressure, wind speed, gusts, and rainfall.
   - Caching: 10-minute TTL in Redis with seamless in-memory fallback.

2. **Official Cyclone Feeds (India Meteorological Department — IMD)**:
   - **Status: Interface Implemented; Pending Credentials.**
   - Connects to official RSMC gateway at `api.imd.gov.in`.
   - **Zero Fabrication Policy**: CycloneGuard never invents fake storm tracks, synthetic coordinates, or simulated official warnings. When credentials are not yet configured, the system explicitly reports `PENDING_CREDENTIALS` and `NO_ACTIVE_CYCLONE`.

3. **Data Provenance Labels**:
   - `[LIVE API DATA]` ➔ Automated real-time telemetry from external meteorological APIs.
   - `[OFFICIAL MET AGENCY]` ➔ Statutory bulletins from IMD RSMC New Delhi.
   - `[MANUAL OPERATIONAL GROUND DATA]` ➔ Evacuation shelters and emergency inventory.

---

## 🚀 How to Run the Application

### Prerequisites
- Node.js 18+ and npm
- (Optional) MongoDB local daemon or MongoDB Atlas connection string
- (Optional) PostgreSQL and Redis

### Step 1: Configure Environment Variables

In `backend/.env`:
```env
PORT=5000
NODE_ENV=development

# MERN Stack: MongoDB Connection
# For local MongoDB:
MONGODB_URI=mongodb://127.0.0.1:27017/cycloneguard
# For MongoDB Atlas (Free Cluster):
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/cycloneguard?retryWrites=true&w=majority
MONGODB_DB_NAME=cycloneguard

# PostgreSQL Relational Database (Optional; fallback available)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cycloneguard
DB_USER=cyclone_user
DB_PASSWORD=cyclone_password

# Redis Caching (Optional; in-memory fallback available)
REDIS_URL=redis://localhost:6379

# IMD RSMC API (Pending credentials)
IMD_API_KEY=
IMD_API_BASE_URL=https://api.imd.gov.in
```

### Step 2: Start the Backend Server

```powershell
cd backend
npm install
npm run build
npm start
# Or for development with hot reload:
# npm run dev
```

The backend starts at `http://localhost:5000`:
* System Health & Telemetry: `http://localhost:5000/api/health`
* Live Coastal Weather: `http://localhost:5000/api/weather/coastal`
* Deterministic Risk Assessment: `http://localhost:5000/api/weather/assessment/chennai`
* Cyclone Gateway Status: `http://localhost:5000/api/cyclone/status`
* Evacuation Shelters: `http://localhost:5000/api/shelters`
* PostgreSQL Inventory: `http://localhost:5000/api/inventory`
* MERN MongoDB Inventory: `http://localhost:5000/api/mongo/inventory`

### Step 3: Start the Frontend Application

In a second terminal:
```powershell
cd frontend
npm install
npm run build
npm run preview
# Or for development with hot reload:
# npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 🔍 Verification & Demonstration Checklist

1. **Persistent Sidebar Navigation:**
   - Click between **Dashboard**, **Live Map & Cyclone Tracking**, **Risk Assessment**, and **Shelters & Relief**.
   - Notice instant view transitions with zero full-page browser reloads.
2. **Interactive Map Station Selection:**
   - In **Live Map & Cyclone Tracking**, click on any coastal marker (Chennai, Nagapattinam, Cuddalore) or use the station buttons below the map.
   - The inspection panel updates immediately with live temperature, humidity, wind, gusts, pressure, and rainfall for that station.
3. **Deterministic Coastal Risk Matrix:**
   - In **Risk Assessment**, switch between coastal stations.
   - Verify that the 100-point score, contributing factors breakdown, and advisory notes update deterministically with clear non-ML labeling.
4. **Shelters & Relief Management:**
   - Review total capacity, occupancy, and backup generator statistics.
   - Switch between **Evacuation Shelters Directory**, **PostgreSQL Relief Registry**, and **MERN Stack (MongoDB Collections)**.
5. **MERN Stack MongoDB Operations:**
   - When MongoDB is connected (`MONGODB_URI` configured), click **"+ Add Stock Item"** to register a new emergency item into the MongoDB collection.
   - The item is inserted via `POST /api/mongo/inventory` and immediately appears in the collection table.
   - Click **"Delete"** on any row to verify document removal via `DELETE /api/mongo/inventory/:id`.
   - If MongoDB is offline, verify that the application displays the clear standby notice without crashing.
