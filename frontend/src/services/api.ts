import {
  LiveWeatherObservation,
  CycloneStatusResponse,
  Shelter,
  ReliefInventoryItem,
  SystemHealthResponse,
} from '../types';

const API_BASE = '/api';

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
   * Official IMD Cyclone track & warning status
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
   * Ground operational shelters
   */
  async getShelters(): Promise<Shelter[]> {
    const res = await fetch(`${API_BASE}/shelters`);
    if (!res.ok) throw new Error(`Shelters fetch failed (${res.status})`);
    const json = await res.json();
    return json.data || [];
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to create item in MongoDB');
    return json;
  },

  async updateMongoReliefItem(id: string, updateData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/mongo/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update item in MongoDB');
    return json;
  },

  async deleteMongoReliefItem(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/mongo/inventory/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete item from MongoDB');
    return json;
  },
};
