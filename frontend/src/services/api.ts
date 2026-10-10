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
};
