import React, { useState } from 'react';
import { Home, Phone, User, CheckCircle2, XCircle } from 'lucide-react';
import { Shelter } from '../types';

interface SheltersTableProps {
  shelters: Shelter[];
}

export const SheltersTable: React.FC<SheltersTableProps> = ({ shelters }) => {
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');

  const districts = ['ALL', ...Array.from(new Set(shelters.map((s) => s.districtName)))];

  const filtered = districtFilter === 'ALL'
    ? shelters
    : shelters.filter((s) => s.districtName === districtFilter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>OPEN</span>;
      case 'FULL':
        return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>FULL</span>;
      default:
        return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>STANDBY</span>;
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Home size={18} color="#fbbf24" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              Coastal Emergency Evacuation Shelters
            </h3>
            <span className="badge badge-operational">MANUAL OPERATIONAL DATA</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Official multipurpose cyclone relief buildings managed by TNSDMA & District Disaster Management Authorities.
          </p>
        </div>

        {/* District Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Filter District:</span>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            style={{
              background: '#0d1524',
              color: '#f1f5f9',
              border: '1px solid #24344d',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.65rem',
              fontSize: '0.8rem',
            }}
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>District & Facility</th>
              <th>Status</th>
              <th>Capacity & Occupancy</th>
              <th>Facilities</th>
              <th>Emergency Contact</th>
              <th>Data Authority</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.address}</div>
                </td>
                <td>{getStatusBadge(s.status)}</td>
                <td style={{ minWidth: '150px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#cbd5e1' }}>{s.currentOccupancy} / {s.totalCapacity}</span>
                    <span style={{ color: '#94a3b8' }}>{s.occupancyPercentage}%</span>
                  </div>
                  <div style={{
                    height: '6px',
                    width: '100%',
                    background: '#1e293b',
                    borderRadius: '99px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, s.occupancyPercentage)}%`,
                      background: s.occupancyPercentage > 85 ? '#ef4444' : '#0284c7',
                    }} />
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.72rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: s.facilities.hasGenerator ? '#34d399' : '#64748b' }}>
                      {s.facilities.hasGenerator ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Generator
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: s.facilities.hasMedicalPost ? '#34d399' : '#64748b' }}>
                      {s.facilities.hasMedicalPost ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Medical Post
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: s.facilities.hasDrinkingWater ? '#34d399' : '#64748b' }}>
                      {s.facilities.hasDrinkingWater ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Safe Water
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.75rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <User size={12} color="#38bdf8" /> {s.contactPerson}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone size={12} color="#94a3b8" /> {s.contactPhone}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.dataSource}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
