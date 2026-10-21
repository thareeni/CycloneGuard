import React, { useState } from 'react';
import { Home, Phone, User, CheckCircle2, XCircle, Search, Download, Filter } from 'lucide-react';
import { Shelter } from '../types';

interface SheltersTableProps {
  shelters: Shelter[];
  selectedDistrict?: string;
}

export const SheltersTable: React.FC<SheltersTableProps> = ({ shelters, selectedDistrict }) => {
  const [districtFilter, setDistrictFilter] = useState<string>(selectedDistrict && selectedDistrict !== 'ALL' ? selectedDistrict : 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const districts = ['ALL', ...Array.from(new Set(shelters.map((s) => s.districtName)))];

  const filtered = shelters.filter((s) => {
    const matchesDistrict = districtFilter === 'ALL' || s.districtName.toLowerCase() === districtFilter.toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.districtName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDistrict && matchesStatus && matchesSearch;
  });

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

  const handleDownloadCsvTemplate = () => {
    const headers = [
      'id',
      'name',
      'districtName',
      'address',
      'latitude',
      'longitude',
      'totalCapacity',
      'currentOccupancy',
      'status',
      'contactPerson',
      'contactPhone',
      'hasGenerator',
      'hasMedicalPost',
      'hasDrinkingWater',
      'dataSource',
    ].join(',');

    const rows = shelters.map((s) =>
      [
        s.id,
        `"${s.name.replace(/"/g, '""')}"`,
        s.districtName,
        `"${s.address.replace(/"/g, '""')}"`,
        s.latitude,
        s.longitude,
        s.totalCapacity,
        s.currentOccupancy,
        s.status,
        `"${s.contactPerson.replace(/"/g, '""')}"`,
        s.contactPhone,
        s.facilities.hasGenerator ? 'true' : 'false',
        s.facilities.hasMedicalPost ? 'true' : 'false',
        s.facilities.hasDrinkingWater ? 'true' : 'false',
        `"${s.dataSource.replace(/"/g, '""')}"`,
      ].join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cycloneguard_mpes_shelter_registry.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <span className="badge badge-operational">TNSDMA / WORLD BANK CDRRP</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Official multipurpose cyclone relief buildings (MPES) across all 14 coastal districts • Showing {filtered.length} of {shelters.length} facilities.
          </p>
        </div>

        {/* Action Button: CSV Template Download */}
        <button
          onClick={handleDownloadCsvTemplate}
          className="btn btn-secondary"
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          title="Download complete shelter registry as standard CSV template for administrative field review"
        >
          <Download size={14} color="#38bdf8" />
          <span>Export CSV Registry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#0d1524',
          border: '1px solid #1e293b',
          borderRadius: '0.375rem',
          padding: '0.65rem 0.85rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '220px' }}>
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search facility name, address, or officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: '#162032',
              border: '1px solid #24344d',
              color: '#f8fafc',
              padding: '0.3rem 0.55rem',
              borderRadius: '0.25rem',
              fontSize: '0.78rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        {/* District Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>District:</span>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            style={{
              background: '#162032',
              color: '#f1f5f9',
              border: '1px solid #24344d',
              borderRadius: '0.25rem',
              padding: '0.3rem 0.55rem',
              fontSize: '0.75rem',
            }}
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={13} color="#94a3b8" />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: '#162032',
              color: '#f1f5f9',
              border: '1px solid #24344d',
              borderRadius: '0.25rem',
              padding: '0.3rem 0.55rem',
              fontSize: '0.75rem',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN Only</option>
            <option value="STANDBY">STANDBY Only</option>
            <option value="FULL">FULL Only</option>
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
