# CycloneGuard — India Meteorological Department (IMD) Integration Guide

This document records the official investigation, authentication policies, access governance, and step-by-step setup procedure for the **India Meteorological Department (IMD)** RSMC New Delhi cyclone tracking and warning APIs.

---

## 1. Investigation Summary

The **India Meteorological Department (IMD)**, functioning under the Ministry of Earth Sciences (MoES), Government of India, is the WMO-designated **Regional Specialized Meteorological Centre (RSMC) for Tropical Cyclones Over Northern Indian Ocean** (Bay of Bengal and Arabian Sea).

### Official Access Channels & Endpoints
* **Official API Platform:** [https://api.imd.gov.in](https://api.imd.gov.in)
* **National Portal (Mausam):** [https://mausam.imd.gov.in](https://mausam.imd.gov.in)
* **RSMC Cyclone Warning Center:** [https://rsmcnewdelhi.imd.gov.in](https://rsmcnewdelhi.imd.gov.in)

> **IMPORTANT WARNING:** Many third-party "Indian Weather APIs" marketed online are unofficial aggregators. Disaster mitigation applications must source data exclusively from official `*.imd.gov.in` gateways or authorized nodal pipelines.

---

## 2. Authentication & Authorization Governance

| Parameter | Specification |
|---|---|
| **Authentication Scheme** | API Key (`X-Api-Key` HTTP Header) or Bearer Token |
| **Account Creation** | Self-registration via [api.imd.gov.in](https://api.imd.gov.in) with official verified email |
| **Institutional Usage** | Direct coordination required for disaster management authorities and high-throughput feeds |
| **Designated Nodal Officer** | **Dr. Sankar Nath**, Scientist-E, IMD |
| **Nodal Contact Email** | `sankar.nath@imd.gov.in` |
| **Cost / Licensing** | Free of charge for official public safety, humanitarian, and non-commercial research use |

---

## 3. Official Cyclone Datasets & Products

When authenticated through the IMD API Gateway, the following official RSMC feeds are accessible:
1. **Active Cyclone Track Coordinates:** Real-time center fix, estimated central pressure (hPa), maximum sustained wind speed (knots / km/h), and historical coordinates.
2. **Cone of Uncertainty (Forecast Track):** 12h, 24h, 48h, 72h, and 120h forecast positions and intensity stages.
3. **Quadrant Wind Radii:** Spatial extent of 28 knot, 34 knot, 50 knot, and 64 knot winds.
4. **District Coastal Warnings:** Official 4-stage cyclone alerts issued for maritime districts:
   - **Pre-Cyclone Watch** (issued 72 hours prior)
   - **Cyclone Alert** (Yellow warning, issued 48 hours prior)
   - **Cyclone Warning** (Orange warning, issued 24 hours prior)
   - **Post-Landfall Outlook** (Red warning, issued 12 hours prior)

---

## 4. Architectural Implementation in CycloneGuard

In strict compliance with disaster safety standards, CycloneGuard enforces **Zero Fabrication of Critical Life-Safety Data**:
* If `IMD_API_KEY` is not present in `.env`, the system marks the IMD gateway status as `PENDING_CREDENTIALS`.
* It returns an explicit advisory notice informing operators that the interface is ready and waiting for official credentials.
* **No synthetic or mock cyclone tracks, storm positions, or fake alerts are ever generated.**

### Provider Code Structure:
* **Service:** `backend/src/services/imdCycloneService.ts`
* **Controller:** `backend/src/controllers/cycloneController.ts`
* **Endpoint:** `GET /api/cyclone/status`

---

## 5. Step-by-Step Operator Setup Instructions

To transition the IMD interface from `PENDING_CREDENTIALS` to live production streaming:

1. **Register on the IMD API Management Portal:**
   - Navigate to [https://api.imd.gov.in](https://api.imd.gov.in) and click **Register**.
   - Complete verification using your institutional or authorized organization email.

2. **Generate API Credentials:**
   - Under your developer dashboard, select **Subscribe to APIs** -> **Tropical Cyclone & Severe Weather Bulletins**.
   - Copy your generated API Key.

3. **Institutional Approvals (If representing SDMA / DDMA):**
   - If requiring uninterrupted low-latency webhooks or high-concurrency access, send formal request to Dr. Sankar Nath (`sankar.nath@imd.gov.in`) citing your CycloneGuard deployment instance.

4. **Update CycloneGuard Configuration:**
   - In `backend/.env` (or via Docker Compose environment variables):
     ```env
     IMD_API_BASE_URL=https://api.imd.gov.in
     IMD_API_KEY=your_issued_official_imd_api_key_here
     ```
   - Restart the backend service.

5. **Verify Live Connection:**
   - Run: `curl http://localhost:5000/api/cyclone/status`
   - The response status will reflect `NO_ACTIVE_CYCLONE` (when the Bay of Bengal is clear) or `ACTIVE_CYCLONE_TRACKED` with real RSMC track coordinates and bulletins.
