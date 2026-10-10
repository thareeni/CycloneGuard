import React from 'react';
import { Info, Activity, ShieldAlert, Users } from 'lucide-react';

export const DataSourceLegend: React.FC = () => {
  return (
    <div className="card" style={{
      background: 'linear-gradient(180deg, #131c2e 0%, #0d1524 100%)',
      border: '1px solid #1e2e47',
      marginBottom: '1.5rem',
      padding: '1rem 1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Info size={16} color="#38bdf8" />
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#cbd5e1' }}>
          Data Integrity & Provenance Governance
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '0.85rem',
      }}>
        {/* Layer 1: Live API */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          display: 'flex',
          gap: '0.75rem',
        }}>
          <div style={{ color: '#38bdf8', paddingTop: '0.1rem' }}>
            <Activity size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-live">LIVE API DATA</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>Open-Meteo Integration</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Automated live observations: temperature, wind speeds, pressure, gusts, and rainfall fetched in real time.
            </p>
          </div>
        </div>

        {/* Layer 2: Official IMD */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(165, 180, 252, 0.25)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          display: 'flex',
          gap: '0.75rem',
        }}>
          <div style={{ color: '#818cf8', paddingTop: '0.1rem' }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-official">OFFICIAL MET AGENCY</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>IMD RSMC New Delhi</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Official cyclone tracks and coastal warnings. Verified via IMD API Gateway. No synthetic storms fabricated.
            </p>
          </div>
        </div>

        {/* Layer 3: Manual Operational */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(251, 191, 36, 0.25)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          display: 'flex',
          gap: '0.75rem',
        }}>
          <div style={{ color: '#fbbf24', paddingTop: '0.1rem' }}>
            <Users size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-operational">OPERATIONAL GROUND DATA</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>DDMA / TNSDMA Ground Ops</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Physical shelter readiness, live occupancy headcount, generators, and relief inventory stock ledgers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
