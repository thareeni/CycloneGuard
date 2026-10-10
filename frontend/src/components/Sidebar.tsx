import React from 'react';
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  Building2,
  Shield,
  ChevronRight,
  X,
  MapPin,
} from 'lucide-react';
import { NavigationTab, SystemHealthResponse, LiveWeatherObservation } from '../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  stations: LiveWeatherObservation[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  health: SystemHealthResponse | null;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  stations,
  selectedStationId,
  onSelectStation,
  health,
  isOpenMobile,
  onToggleMobile,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      desc: 'Coastal summary & live telemetry',
    },
    {
      id: 'live-map',
      label: 'Live Map & Tracking',
      icon: <Map size={20} />,
      desc: 'Geospatial observations & IMD tracks',
    },
    {
      id: 'risk-assessment',
      label: 'Risk Assessment',
      icon: <AlertTriangle size={20} />,
      desc: 'Rule-based impact calculations',
    },
    {
      id: 'shelters-relief',
      label: 'Shelters & Relief',
      icon: <Building2 size={20} />,
      desc: 'Evacuation hubs & supply stock',
    },
  ];

  const isRedis = health?.components.cache.type === 'REDIS' && health.components.cache.connected;
  const isDb = health?.components.database.connected;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onToggleMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex: 140,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`sidebar-nav ${isOpenMobile ? 'open' : ''}`}
        style={{
          width: '280px',
          background: '#0d1527',
          borderRight: '1px solid #1a273b',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 150,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Brand Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1rem 1.25rem',
          borderBottom: '1px solid #1a273b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              padding: '0.55rem',
              borderRadius: '0.55rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(2, 132, 199, 0.4)',
            }}>
              <Shield size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  CycloneGuard
                </h1>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                Command Center • TN Coast
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onToggleMobile}
            className="mobile-close-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'none',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Badge Sub-strip */}
        <div style={{
          padding: '0.5rem 1.25rem',
          background: 'rgba(14, 165, 233, 0.08)',
          borderBottom: '1px solid #162438',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontWeight: 600 }}>
            <span className="pulse-dot"></span> LIVE SYSTEM
          </span>
          <span style={{ color: '#64748b' }}>v1.0 • Bay of Bengal</span>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto' }}>
          <div style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            letterSpacing: '0.05em',
            padding: '0 0.5rem 0.5rem 0.5rem',
          }}>
            Navigation
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    if (isOpenMobile) onToggleMobile();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                    background: isActive ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                    color: isActive ? '#38bdf8' : '#cbd5e1',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ color: isActive ? '#38bdf8' : '#94a3b8' }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: isActive ? '#7dd3fc' : '#64748b', lineHeight: 1.2 }}>
                      {item.desc}
                    </div>
                  </div>
                  {isActive && <ChevronRight size={16} color="#38bdf8" />}
                </button>
              );
            })}
          </div>

          {/* Quick Location Switcher */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.05em',
              padding: '0 0.5rem 0.5rem 0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>Active Coastal Station</span>
              <MapPin size={12} color="#38bdf8" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {stations.map((st) => {
                const isSelected = st.stationId === selectedStationId;
                return (
                  <button
                    key={st.stationId}
                    onClick={() => onSelectStation(st.stationId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.375rem',
                      border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid #1a273b',
                      background: isSelected ? 'rgba(14, 165, 233, 0.15)' : '#090e1c',
                      color: isSelected ? '#f8fafc' : '#94a3b8',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <strong style={{ color: isSelected ? '#38bdf8' : '#e2e8f0' }}>{st.district}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                        {st.locationName.split('&')[0]}
                      </span>
                    </div>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      color: isSelected ? '#38bdf8' : '#cbd5e1',
                    }}>
                      {Math.round(st.temperatureCelsius)}°C
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer: System Diagnostics Gateway */}
        <div style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid #1a273b',
          background: '#090e1a',
          fontSize: '0.72rem',
        }}>
          <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', fontSize: '0.65rem' }}>
            System Gateway Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Open-Meteo:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>LIVE FEED</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>IMD RSMC:</span>
              <span style={{ color: health?.components.imd.configured ? '#818cf8' : '#fbbf24', fontWeight: 600 }}>
                {health?.components.imd.configured ? 'AUTHENTICATED' : 'INTERFACE ACTIVE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>PostgreSQL:</span>
              <span style={{ color: isDb ? '#34d399' : '#cbd5e1', fontWeight: 600 }}>
                {isDb ? 'CONNECTED' : 'BOOTSTRAP'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Cache Layer:</span>
              <span style={{ color: isRedis ? '#34d399' : '#cbd5e1', fontWeight: 600 }}>
                {isRedis ? 'REDIS' : 'IN-MEMORY'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
