import React from 'react';
import { Shield, RefreshCw, Radio, Database, Cpu } from 'lucide-react';
import { SystemHealthResponse } from '../types';

interface NavbarProps {
  health: SystemHealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  lastUpdated: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ health, loading, onRefresh, lastUpdated }) => {
  const isRedisActive = health?.components.cache.type === 'REDIS' && health.components.cache.connected;
  const isDbActive = health?.components.database.connected;

  return (
    <header style={{
      background: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #1f293d',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0.875rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Brand & Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '0.65rem',
            borderRadius: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)',
          }}>
            <Shield size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                CycloneGuard
              </h1>
              <span className="badge badge-live">
                <span className="pulse-dot"></span> TN Coastal Watch
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Real-Time Cyclone Disaster Management System • Bay of Bengal Corridor
            </p>
          </div>
        </div>

        {/* Real-time Gateway Telemetry Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Open-Meteo badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
          }}>
            <Radio size={14} color="#38bdf8" />
            <span style={{ color: '#94a3b8' }}>Open-Meteo:</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>LIVE</span>
          </div>

          {/* IMD status badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: health?.components.imd.configured ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.12)',
            border: health?.components.imd.configured ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
          }}>
            <Cpu size={14} color={health?.components.imd.configured ? '#818cf8' : '#fbbf24'} />
            <span style={{ color: '#94a3b8' }}>IMD RSMC:</span>
            <span style={{
              color: health?.components.imd.configured ? '#818cf8' : '#fbbf24',
              fontWeight: 600,
            }}>
              {health?.components.imd.configured ? 'AUTHENTICATED' : 'INTERFACE ACTIVE'}
            </span>
          </div>

          {/* Cache telemetry */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: isRedisActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
            border: isRedisActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(148, 163, 184, 0.25)',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
          }}>
            <Database size={14} color={isRedisActive ? '#34d399' : '#94a3b8'} />
            <span style={{ color: '#94a3b8' }}>Cache:</span>
            <span style={{ color: isRedisActive ? '#34d399' : '#cbd5e1', fontWeight: 600 }}>
              {isRedisActive ? 'REDIS' : 'IN-MEMORY'}
            </span>
          </div>

          {/* Database telemetry */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: isDbActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
            border: isDbActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(148, 163, 184, 0.25)',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
          }}>
            <Database size={14} color={isDbActive ? '#34d399' : '#94a3b8'} />
            <span style={{ color: '#94a3b8' }}>PostgreSQL:</span>
            <span style={{ color: isDbActive ? '#34d399' : '#cbd5e1', fontWeight: 600 }}>
              {isDbActive ? 'ONLINE' : 'BOOTSTRAP'}
            </span>
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            title="Fetch latest meteorological telemetry"
          >
            <RefreshCw size={14} className={loading ? 'pulse-dot' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>{loading ? 'Refreshing...' : 'Refresh Feed'}</span>
          </button>
        </div>
      </div>
      {lastUpdated && (
        <div style={{
          background: '#0c1220',
          padding: '0.2rem 1rem',
          fontSize: '0.7rem',
          color: '#64748b',
          textAlign: 'right',
          borderTop: '1px solid #162032',
        }}>
          Telemetry synchronized at: {new Date(lastUpdated).toLocaleTimeString()} IST
        </div>
      )}
    </header>
  );
};
