import React, { useState } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { ReliefInventoryItem } from '../types';

interface ReliefInventoryTableProps {
  inventory: ReliefInventoryItem[];
}

export const ReliefInventoryTable: React.FC<ReliefInventoryTableProps> = ({ inventory }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const categories = [
    'ALL',
    'FOOD_RATIONS',
    'DRINKING_WATER',
    'MEDICAL_KITS',
    'BEDDING_BLANKETS',
    'GENERATORS_FUEL',
    'TARPAULIN_SHEETS',
  ];

  const filtered = categoryFilter === 'ALL'
    ? inventory
    : inventory.filter((item) => item.category === categoryFilter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CRITICAL':
      case 'DEPLETED':
        return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>CRITICAL</span>;
      case 'LOW':
        return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>LOW</span>;
      default:
        return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>SUFFICIENT</span>;
    }
  };

  const formatCategory = (cat: string) => cat.replace('_', ' ');

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
            <Package size={18} color="#fbbf24" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              Coastal Relief Inventory & Strategic Stockpile
            </h3>
            <span className="badge badge-operational">MANUAL OPERATIONAL DATA</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Stock quotas maintained at coastal distribution hubs and multipurpose evacuation centers.
          </p>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Filter Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              background: '#0d1524',
              color: '#f1f5f9',
              border: '1px solid #24344d',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.65rem',
              fontSize: '0.8rem',
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'All Categories' : formatCategory(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Item & Category</th>
              <th>Allocated Hub / Shelter</th>
              <th>Quantity On Hand</th>
              <th>Threshold Status</th>
              <th>Operational Notes</th>
              <th>Inventory Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.itemName}</div>
                  <span className="badge" style={{ background: '#1e293b', color: '#94a3b8', fontSize: '0.65rem' }}>
                    {formatCategory(item.category)}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{item.shelterName}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.districtName} District</div>
                </td>
                <td>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                    {item.quantity.toLocaleString()}
                  </span>{' '}
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.unit}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {getStatusBadge(item.stockStatus)}
                    {item.quantity <= item.criticalThreshold && (
                      <span title="Below buffer safety threshold" style={{ display: 'inline-flex' }}>
                        <AlertCircle size={14} color="#ef4444" />
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '240px' }}>
                    {item.notes || 'Routine reserve'}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.dataSource}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
