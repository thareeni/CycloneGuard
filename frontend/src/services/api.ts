import {
  LiveWeatherObservation,
  CycloneStatusResponse,
  Shelter,
  ReliefInventoryItem,
  SystemHealthResponse,
  CoastalDistrict,
  DistrictRiskSummary,
  NearestShelterRecommendation,
  ReliefTransfer,
  ConsumptionEstimate,
  AuthUser,
  DemoAccount,
  AuditLogEntry,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('cycloneguard_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  /**
   * Health & diagnostics
   */
  async getHealth(): Promise<SystemHealthResponse> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return res.json();
  },

  /**
   * Centralized 14 Coastal Districts Registry
   */
  async getDistricts(): Promise<CoastalDistrict[]> {
    const res = await fetch(`${API_BASE}/districts`);
    if (!res.ok) throw new Error(`Districts fetch failed (${res.status})`);
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Live coastal weather from Open-Meteo
   */
  async getCoastalWeather(forceRefresh = false): Promise<LiveWeatherObservation[]> {
    const res = await fetch(`${API_BASE}/weather/coastal${forceRefresh ? '?refresh=true' : ''}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Weather fetch failed (${res.status})`);
    }
    const json = await res.json();
    return json.stations || [];
  },

  /**
   * Dual-Source Cyclone Tracking (IMD Primary + GDACS Fallback)
   */
  async getCycloneStatus(): Promise<CycloneStatusResponse> {
    const res = await fetch(`${API_BASE}/cyclone/status`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Cyclone status failed (${res.status})`);
    }
    return res.json();
  },

  /**
   * Statewide district-level risk summaries across all 14 coastal districts
   */
  async getDistrictRiskSummaries(forceRefresh = false): Promise<DistrictRiskSummary[]> {
    const res = await fetch(`${API_BASE}/weather/assessment/districts${forceRefresh ? '?refresh=true' : ''}`);
    if (!res.ok) throw new Error(`District risk summaries fetch failed (${res.status})`);
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Rule-based meteorological risk assessment (Transparent criteria, non-ML)
   */
  async getRiskAssessment(stationId?: string, forceRefresh = false): Promise<any> {
    const url = stationId
      ? `${API_BASE}/weather/assessment/${stationId}${forceRefresh ? '?refresh=true' : ''}`
      : `${API_BASE}/weather/assessment${forceRefresh ? '?refresh=true' : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Risk assessment fetch failed (${res.status})`);
    const json = await res.json();
    return json.data;
  },

  /**
   * Ground operational shelters
   */
  async getShelters(districtFilter?: string): Promise<Shelter[]> {
    const url = districtFilter && districtFilter !== 'ALL'
      ? `${API_BASE}/shelters?district=${encodeURIComponent(districtFilter)}`
      : `${API_BASE}/shelters`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Shelters fetch failed (${res.status})`);
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Nearest shelters calculation via Haversine distance
   */
  async getNearestShelters(lat: number, lng: number, limit = 50, radius?: number): Promise<NearestShelterRecommendation[]> {
    let url = `${API_BASE}/shelters/nearest?lat=${lat}&lng=${lng}&limit=${limit}`;
    if (radius !== undefined && radius !== null) {
      url += `&radius=${radius}`;
    }
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Nearest shelters computation failed (${res.status})`);
    }
    const json = await res.json();
    return json.recommendations || [];
  },

  /**
   * Road network evacuation route calculation via OSRM with geodesic fallback
   */
  async getRouteToShelter(originLat: number, originLng: number, shelterId: number): Promise<any> {
    const res = await fetch(
      `${API_BASE}/shelters/route?originLat=${originLat}&originLng=${originLng}&shelterId=${shelterId}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Route calculation failed (${res.status})`);
    }
    return res.json();
  },

  /**
   * Ground operational relief inventory
   */
  async getInventory(shelterId?: number): Promise<ReliefInventoryItem[]> {
    const url = shelterId ? `${API_BASE}/inventory?shelterId=${shelterId}` : `${API_BASE}/inventory`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Inventory fetch failed (${res.status})`);
    const json = await res.json();
    return json.data || [];
  },

  /**
   * MERN Stack: MongoDB Collection CRUD for Relief Inventory
   */
  async getMongoInventory(district?: string, category?: string): Promise<any> {
    const params = new URLSearchParams();
    if (district && district !== 'ALL') params.append('district', district);
    if (category && category !== 'ALL') params.append('category', category);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/mongo/inventory${queryString}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `MongoDB request failed (${res.status})`);
    }
    return res.json();
  },

  async createMongoReliefItem(itemData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/mongo/inventory`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to create item in MongoDB');
    return json;
  },

  async updateMongoReliefItem(id: string, updateData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/mongo/inventory/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update item in MongoDB');
    return json;
  },

  async deleteMongoReliefItem(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/mongo/inventory/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete item from MongoDB');
    return json;
  },

  /**
   * MERN Stack: Relief Transfers Workflow
   */
  async getReliefTransfers(district?: string, status?: string, shelter?: string): Promise<ReliefTransfer[]> {
    const params = new URLSearchParams();
    if (district && district !== 'ALL') params.append('district', district);
    if (status && status !== 'ALL') params.append('status', status);
    if (shelter && shelter !== 'ALL') params.append('shelter', shelter);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/mongo/transfers${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Transfers fetch failed (${res.status})`);
    }
    const json = await res.json();
    return json.data || [];
  },

  async createReliefTransfer(transferData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/mongo/transfers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transferData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to initiate transfer');
    return json;
  },

  async updateTransferStatus(id: string, updateData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/mongo/transfers/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update transfer status');
    return json;
  },

  /**
   * Consumption Burn-Rate Analytics
   */
  async getConsumptionEstimates(): Promise<{ methodology: string; assumptions: any; data: ConsumptionEstimate[] }> {
    const res = await fetch(`${API_BASE}/mongo/consumption`);
    if (!res.ok) throw new Error(`Consumption estimates fetch failed (${res.status})`);
    return res.json();
  },

  /**
   * Authentication & RBAC APIs
   */
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Login failed');
    localStorage.setItem('cycloneguard_auth_token', json.token);
    localStorage.setItem('cycloneguard_auth_user', JSON.stringify(json.user));
    return json;
  },

  /**
   * Public Citizen Registration (Anyone can register with personal email)
   */
  async register(data: { name: string; email: string; password: string; phone?: string }): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Registration failed');
    if (json.token) {
      localStorage.setItem('cycloneguard_auth_token', json.token);
    }
    if (json.user) {
      localStorage.setItem('cycloneguard_auth_user', JSON.stringify(json.user));
    }
    return json;
  },

  logout(): void {
    const token = localStorage.getItem('cycloneguard_auth_token');
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).catch(() => {});
    }
    localStorage.removeItem('cycloneguard_auth_token');
    localStorage.removeItem('cycloneguard_auth_user');
  },

  getCurrentUser(): AuthUser | null {
    try {
      const userStr = localStorage.getItem('cycloneguard_auth_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  async getMe(): Promise<AuthUser | null> {
    const token = localStorage.getItem('cycloneguard_auth_token');
    if (!token) return null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      localStorage.removeItem('cycloneguard_auth_token');
      localStorage.removeItem('cycloneguard_auth_user');
      return null;
    }
    const json = await res.json();
    return json.user;
  },

  async getDemoAccounts(): Promise<DemoAccount[]> {
    const res = await fetch(`${API_BASE}/auth/demo-accounts`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.accounts || [];
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch(`${API_BASE}/audit-logs`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch audit logs');
    }
    const json = await res.json();
    return json.data || [];
  },
};
