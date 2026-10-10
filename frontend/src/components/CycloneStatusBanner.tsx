import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { CycloneStatusResponse } from '../types';

interface CycloneStatusBannerProps {
  cycloneData: CycloneStatusResponse | null;
}

export const CycloneStatusBanner: React.FC<CycloneStatusBannerProps> = ({ cycloneData }) => {
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  if (!cycloneData) {
    return null;
  }

  const { integration, activeSystemsCount, systems, districtWarnings } = cycloneData;

  // Case 1: Active Cyclone Tracked
  if (integration.status === 'ACTIVE_CYCLONE_TRACKED' && activeSystemsCount > 0) {
    return (
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.25) 100%)',
        border: '1px solid #ef4444',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <span className="badge" style={{ background: '#ef4444', color: '#ffffff' }}>
                CRITICAL OFFICIAL ALERT
              </span>
              <span className="badge badge-official">IMD RSMC Official Feed</span>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fef2f2' }}>
                Active Cyclone Warning: {systems.map((s) => s.name).join(', ')}
              </h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#fecaca', marginBottom: '0.75rem' }}>
              {integration.statusDescription}
            </p>
            {districtWarnings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {districtWarnings.map((w, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.375rem',
                    borderLeft: `4px solid ${w.warningLevel === 'RED' ? '#ef4444' : '#f59e0b'}`,
                  }}>
                    <strong style={{ color: '#fff' }}>{w.districtName} ({w.warningLevel}):</strong> {w.headline}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Verified Clean - No Active Storms
  if (integration.status === 'NO_ACTIVE_CYCLONE') {
    return (
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        marginBottom: '1.5rem',
        padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={22} color="#10b981" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981' }}>
                  OFFICIAL STATUS: ALL CLEAR
                </span>
                <span className="badge badge-official">Verified via IMD RSMC</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#d1fae5' }}>
                No active tropical cyclones or depressions over the Bay of Bengal or coastal Tamil Nadu.
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
            Last verified: {new Date(integration.lastCheckedAt).toLocaleTimeString()} IST
          </span>
        </div>
      </div>
    );
  }

  // Case 3: Integration Interface Ready, Pending IMD Portal Credentials
  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
      border: '1px solid rgba(245, 158, 11, 0.4)',
      marginBottom: '1.5rem',
      padding: '1rem 1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            marginTop: '0.1rem',
          }}>
            <KeyRound size={20} color="#fbbf24" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span className="badge badge-operational">OFFICIAL INTERFACE READY</span>
              <span className="badge badge-official">IMD RSMC NEW DELHI</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                Official IMD Cyclone Tracking Gateway
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
              The backend integration architecture for the India Meteorological Department is fully implemented.
              Per project safety requirements, <strong style={{ color: '#fbbf24' }}>no fake cyclone tracks or mock warnings are generated</strong>.
              Connect your official IMD API key in <code style={{ color: '#38bdf8' }}>backend/.env</code> to stream live RSMC bulletins.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSetupGuide(!showSetupGuide)}
          className="btn btn-secondary"
          style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}
        >
          <span>{showSetupGuide ? 'Hide IMD Guide' : 'View IMD Setup'}</span>
          {showSetupGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showSetupGuide && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid #2d3748',
          background: 'rgba(11, 17, 32, 0.6)',
          padding: '1rem',
          borderRadius: '0.5rem',
        }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
            Official IMD API Access Procedure
          </h4>
          <ol style={{ fontSize: '0.8rem', color: '#94a3b8', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
            <li>
              <strong>Register Portal Account:</strong> Sign up at{' '}
              <a
                href="https://api.imd.gov.in"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#38bdf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
              >
                api.imd.gov.in <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <strong>Institutional / Nodal Approval:</strong> For institutional cyclone management authorization, coordinate with Dr. Sankar Nath (Scientist-E, IMD) at <code style={{ color: '#cbd5e1' }}>sankar.nath@imd.gov.in</code>.
            </li>
            <li>
              <strong>Configure Environment:</strong> Add your issued key to <code style={{ color: '#38bdf8' }}>backend/.env</code>:
              <pre style={{
                background: '#090d16',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                marginTop: '0.4rem',
                color: '#38bdf8',
                fontSize: '0.75rem',
              }}>
                IMD_API_KEY=your_official_imd_api_token_here
              </pre>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};
