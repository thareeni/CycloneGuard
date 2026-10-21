import React, { useState } from 'react';
import {
  RefreshCw,
  Radio,
  Database,
  Cpu,
  Menu,
  Shield,
  LogOut,
  LogIn,
  MapPin,
  Lock,
  X,
  AlertCircle,
} from 'lucide-react';
import { SystemHealthResponse, CoastalDistrict, AuthUser, DemoAccount } from '../types';
import { api } from '../services/api';

interface NavbarProps {
  health: SystemHealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  lastUpdated: string | null;
  pageTitle?: string;
  onToggleMobile?: () => void;
  districts?: CoastalDistrict[];
  selectedDistrict?: string;
  onSelectDistrict?: (districtName: string) => void;
  currentUser?: AuthUser | null;
  onLogin?: (user: AuthUser) => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  loading,
  onRefresh,
  lastUpdated,
  pageTitle,
  onToggleMobile,
  districts = [],
  selectedDistrict = 'ALL',
  onSelectDistrict,
  currentUser = null,
  onLogin,
  onLogout,
}) => {
  const isRedisActive = health?.components.cache.type === 'REDIS' && health.components.cache.connected;
  const isDbActive = health?.components.database.connected;
  const isMongoActive = Boolean(health?.components.mongodb?.connected);

  // Auth modal states
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('admin@cycloneguard.tn.gov.in');
  const [loginPassword, setLoginPassword] = useState<string>('Admin@Cyclone2026!');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const handleOpenLogin = () => {
    setShowLoginModal(true);
    setLoginError(null);
  };

  const handlePerformLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      if (onLogin) onLogin(res.user);
      setShowLoginModal(false);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setLoginEmail(acc.email);
    setLoginPassword(acc.samplePassword || 'Admin@Cyclone2026!');
  };

  return (
    <>
      <header
        style={{
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #1f293d',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            margin: '0 auto',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
          }}
        >
          {/* Left: Mobile Menu Toggle + Current Section Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {onToggleMobile && (
              <button
                onClick={onToggleMobile}
                className="mobile-hamburger-btn"
                style={{
                  background: '#162032',
                  border: '1px solid #24344d',
                  color: '#f1f5f9',
                  padding: '0.45rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Toggle Navigation Menu"
              >
                <Menu size={20} />
              </button>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  {pageTitle || 'CycloneGuard Command Center'}
                </h2>
                <span className="badge badge-live">
                  <span className="pulse-dot"></span> 14 TN Coastal Districts
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Statewide Real-Time Disaster Management System • TNSCZMA Mandated Coverage
              </p>
            </div>
          </div>

          {/* Center-Right: Centralized 14 Coastal Districts Selector */}
          {onSelectDistrict && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={15} color="#38bdf8" />
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>District:</label>
              {currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#1c1917',
                    border: '1px solid #d97706',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#fbbf24',
                  }}
                  title={`Jurisdiction Locked: ${currentUser.name} is authorized solely for ${currentUser.assignedDistrict} District operations.`}
                >
                  <Lock size={12} color="#f59e0b" />
                  <span>{currentUser.assignedDistrict}</span>
                  <span style={{ fontSize: '0.65rem', background: '#78350f', color: '#fef3c7', padding: '1px 5px', borderRadius: '3px' }}>
                    LOCKED
                  </span>
                </div>
              ) : (
                <select
                  value={selectedDistrict}
                  onChange={(e) => onSelectDistrict(e.target.value)}
                  style={{
                    background: '#11192a',
                    border: '1px solid #2563eb',
                    color: '#f8fafc',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="ALL">Statewide — All 14 Coastal Districts</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.id}. {d.name} {d.isHighRiskZone ? '⚠️' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Right: Telemetry Badges + User Role Auth Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Open-Meteo badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                padding: '0.28rem 0.55rem',
                borderRadius: '0.375rem',
                fontSize: '0.72rem',
              }}
            >
              <Radio size={13} color="#38bdf8" />
              <span style={{ color: '#94a3b8' }}>Weather:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>LIVE</span>
            </div>

            {/* IMD status badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: health?.components.imd.configured
                  ? 'rgba(99, 102, 241, 0.15)'
                  : 'rgba(245, 158, 11, 0.12)',
                border: health?.components.imd.configured
                  ? '1px solid rgba(99, 102, 241, 0.35)'
                  : '1px solid rgba(245, 158, 11, 0.35)',
                padding: '0.28rem 0.55rem',
                borderRadius: '0.375rem',
                fontSize: '0.72rem',
              }}
            >
              <Cpu size={13} color={health?.components.imd.configured ? '#818cf8' : '#fbbf24'} />
              <span style={{ color: '#94a3b8' }}>Cyclone:</span>
              <span
                style={{
                  color: health?.components.imd.configured ? '#818cf8' : '#fbbf24',
                  fontWeight: 600,
                }}
              >
                {health?.components.imd.configured ? 'AUTHENTICATED' : 'DUAL ADAPTER'}
              </span>
            </div>

            {/* Redis / Cache badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isRedisActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                border: isRedisActive
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid rgba(148, 163, 184, 0.25)',
                padding: '0.28rem 0.55rem',
                borderRadius: '0.375rem',
                fontSize: '0.72rem',
              }}
            >
              <Database size={13} color={isRedisActive ? '#34d399' : '#94a3b8'} />
              <span style={{ color: isRedisActive ? '#34d399' : '#cbd5e1', fontWeight: 600 }}>
                {isRedisActive ? 'REDIS' : 'CACHE'}
              </span>
            </div>

            {/* PostgreSQL relational badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isDbActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                border: isDbActive
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid rgba(148, 163, 184, 0.25)',
                padding: '0.28rem 0.55rem',
                borderRadius: '0.375rem',
                fontSize: '0.72rem',
              }}
            >
              <Database size={13} color={isDbActive ? '#34d399' : '#94a3b8'} />
              <span style={{ color: isDbActive ? '#34d399' : '#cbd5e1', fontWeight: 600 }}>
                {isDbActive ? 'POSTGRES' : 'BASELINE'}
              </span>
            </div>

            {/* MongoDB MERN telemetry */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isMongoActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: isMongoActive
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid rgba(245, 158, 11, 0.35)',
                padding: '0.28rem 0.55rem',
                borderRadius: '0.375rem',
                fontSize: '0.72rem',
              }}
            >
              <Database size={13} color={isMongoActive ? '#34d399' : '#fbbf24'} />
              <span style={{ color: isMongoActive ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                {isMongoActive ? 'ATLAS MERN' : 'MONGO STANDBY'}
              </span>
            </div>

            {/* User Profile / RBAC Badge */}
            {currentUser ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#162032',
                  border: '1px solid #334155',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                }}
              >
                <Shield
                  size={14}
                  color={
                    currentUser.role === 'ADMIN'
                      ? '#ef4444'
                      : currentUser.role === 'DISTRICT_OFFICIAL'
                      ? '#fbbf24'
                      : '#34d399'
                  }
                />
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                  {currentUser.name}
                </span>
                <span
                  style={{
                    background:
                      currentUser.role === 'ADMIN'
                        ? 'rgba(239, 68, 68, 0.25)'
                        : currentUser.role === 'DISTRICT_OFFICIAL'
                        ? 'rgba(245, 158, 11, 0.25)'
                        : 'rgba(52, 211, 153, 0.25)',
                    color:
                      currentUser.role === 'ADMIN'
                        ? '#f87171'
                        : currentUser.role === 'DISTRICT_OFFICIAL'
                        ? '#fbbf24'
                        : '#34d399',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                  }}
                >
                  {currentUser.role}
                </span>
                {currentUser.assignedDistrict && (
                  <span style={{ fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 600 }}>
                    ({currentUser.assignedDistrict})
                  </span>
                )}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      marginLeft: '0.25rem',
                      transition: 'all 0.15s ease',
                    }}
                    title="Sign Out of Session"
                  >
                    <LogOut size={12} />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleOpenLogin}
                className="btn btn-secondary"
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <LogIn size={13} />
                <span>Sign In / RBAC</span>
              </button>
            )}

            {/* Refresh Action */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              title="Fetch latest meteorological telemetry"
            >
              <RefreshCw
                size={13}
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {lastUpdated && (
          <div
            style={{
              background: '#0c1220',
              padding: '0.2rem 1rem',
              fontSize: '0.68rem',
              color: '#64748b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #162032',
            }}
          >
            <div>
              Active District View:{' '}
              <strong style={{ color: '#38bdf8' }}>{selectedDistrict}</strong>
              {currentUser?.role === 'DISTRICT_OFFICIAL' && (
                <span style={{ marginLeft: '0.5rem', color: '#fbbf24' }}>
                  (Assigned Jurisdiction: {currentUser.assignedDistrict})
                </span>
              )}
            </div>
            <div>Telemetry synchronized at: {new Date(lastUpdated).toLocaleTimeString()} IST</div>
          </div>
        )}
      </header>

      {/* RBAC Login Modal */}
      {showLoginModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '1.5rem',
              background: '#0f172a',
              border: '1px solid #334155',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Disaster Operational Login
                </h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {loginError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '0.375rem',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#fca5a5',
                }}
              >
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            {/* Quick Demo Role Switcher */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}
              >
                Evaluation Demo Roles (Click to autofill):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectDemoAccount({
                      role: 'ADMIN',
                      name: 'State Operations Chief',
                      email: 'admin@cycloneguard.tn.gov.in',
                      samplePassword: 'Admin@Cyclone2026!',
                      jurisdiction: 'Statewide',
                      permissions: 'Full Access',
                    })
                  }
                  style={{
                    background: '#1e293b',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    padding: '0.45rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  🛡️ Admin (Statewide)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectDemoAccount({
                      role: 'DISTRICT_OFFICIAL',
                      name: 'Chennai Officer',
                      email: 'chennai.officer@cycloneguard.tn.gov.in',
                      samplePassword: 'Chennai@Guard2026!',
                      jurisdiction: 'Chennai',
                      permissions: 'Chennai Scope',
                    })
                  }
                  style={{
                    background: '#1e293b',
                    border: '1px solid #fbbf24',
                    color: '#fbbf24',
                    padding: '0.45rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  📍 Chennai Officer
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectDemoAccount({
                      role: 'DISTRICT_OFFICIAL',
                      name: 'Nagapattinam Officer',
                      email: 'nagai.officer@cycloneguard.tn.gov.in',
                      samplePassword: 'Nagai@Guard2026!',
                      jurisdiction: 'Nagapattinam',
                      permissions: 'Nagapattinam Scope',
                    })
                  }
                  style={{
                    background: '#1e293b',
                    border: '1px solid #f59e0b',
                    color: '#f59e0b',
                    padding: '0.45rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  📍 Nagapattinam Officer
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectDemoAccount({
                      role: 'PUBLIC',
                      name: 'Citizen Observer',
                      email: 'citizen@tn.gov.in',
                      samplePassword: 'Public@View2026!',
                      jurisdiction: 'Public',
                      permissions: 'Read Only',
                    })
                  }
                  style={{
                    background: '#1e293b',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    padding: '0.45rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  👁️ Public Citizen
                </button>
              </div>
            </div>

            <form onSubmit={handlePerformLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 1.25rem', fontSize: '0.82rem' }}
                >
                  {loginLoading ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
