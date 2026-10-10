import React, { useState, useEffect } from 'react';
import { Shelter, ReliefInventoryItem } from '../types';
import { SheltersTable } from '../components/SheltersTable';
import { ReliefInventoryTable } from '../components/ReliefInventoryTable';
import { api } from '../services/api';
import {
  Building2,
  Package,
  Database,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Server,
  X,
  Search,
  Filter,
} from 'lucide-react';

interface SheltersReliefViewProps {
  shelters: Shelter[];
  inventory: ReliefInventoryItem[];
  selectedDistrict?: string;
}

interface MongoReliefItem {
  _id: string;
  itemName: string;
  shelterName: string;
  districtName: string;
  category: string;
  quantity: number;
  unit: string;
  criticalThreshold: number;
  stockStatus: 'SUFFICIENT' | 'LOW' | 'CRITICAL' | 'DEPLETED';
  notes?: string;
  dataSource?: string;
  createdAt?: string;
}

const TN_COASTAL_DISTRICTS = [
  'Chennai',
  'Tiruvallur',
  'Chengalpattu',
  'Villupuram',
  'Cuddalore',
  'Mayiladuthurai',
  'Nagapattinam',
  'Tiruvarur',
  'Thanjavur',
  'Pudukkottai',
  'Ramanathapuram',
  'Thoothukudi',
  'Tirunelveli',
  'Kanniyakumari',
];

const RELIEF_CATEGORIES = [
  { value: 'FOOD_RATIONS', label: 'Food Rations' },
  { value: 'DRINKING_WATER', label: 'Drinking Water' },
  { value: 'MEDICAL_KITS', label: 'Medical Kits' },
  { value: 'BEDDING_BLANKETS', label: 'Bedding & Blankets' },
  { value: 'GENERATORS_FUEL', label: 'Generators & Fuel' },
  { value: 'TARPAULIN_SHEETS', label: 'Tarpaulin Sheets' },
  { value: 'RESCUE_GEAR', label: 'Rescue & Marine Gear' },
  { value: 'COMMUNICATION_GEAR', label: 'Emergency Communications' },
];

export const SheltersReliefView: React.FC<SheltersReliefViewProps> = ({
  shelters,
  inventory,
  selectedDistrict,
}) => {
  const [activeTab, setActiveTab] = useState<'shelters' | 'inventory' | 'mongo'>('mongo');

  // MongoDB Collection State (MERN Stack requirement)
  const [mongoItems, setMongoItems] = useState<MongoReliefItem[]>([]);
  const [loadingMongo, setLoadingMongo] = useState<boolean>(false);
  const [mongoStandby, setMongoStandby] = useState<boolean>(false);
  const [mongoError, setMongoError] = useState<string | null>(null);
  const [mongoSuccessMsg, setMongoSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MongoReliefItem | null>(null);

  // Filters
  const [mongoFilterDistrict, setMongoFilterDistrict] = useState<string>('ALL');
  const [mongoFilterCategory, setMongoFilterCategory] = useState<string>('ALL');

  // Add Item Form State
  const [formItemName, setFormItemName] = useState('');
  const [formShelterName, setFormShelterName] = useState(shelters[0]?.name || 'Santhome Multipurpose Cyclone Relief Center');
  const [formDistrict, setFormDistrict] = useState(selectedDistrict || 'Chennai');
  const [formCategory, setFormCategory] = useState('FOOD_RATIONS');
  const [formQuantity, setFormQuantity] = useState('1000');
  const [formUnit, setFormUnit] = useState('packets');
  const [formThreshold, setFormThreshold] = useState('200');
  const [formNotes, setFormNotes] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Edit Item Form State
  const [editQuantity, setEditQuantity] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Compute aggregate operational metrics
  const totalCapacity = shelters.reduce((acc, s) => acc + s.totalCapacity, 0);
  const totalOccupancy = shelters.reduce((acc, s) => acc + s.currentOccupancy, 0);
  const availableSlots = totalCapacity - totalOccupancy;
  const generatorsCount = shelters.filter((s) => s.facilities.hasGenerator).length;
  const medicalPostsCount = shelters.filter((s) => s.facilities.hasMedicalPost).length;

  const fetchMongoInventory = async () => {
    setLoadingMongo(true);
    setMongoError(null);
    try {
      const res = await api.getMongoInventory(
        mongoFilterDistrict !== 'ALL' ? mongoFilterDistrict : undefined,
        mongoFilterCategory !== 'ALL' ? mongoFilterCategory : undefined
      );
      if (res && res.data) {
        setMongoItems(res.data);
        setMongoStandby(false);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('standby') || err.message.includes('503'))) {
        setMongoStandby(true);
        setMongoError('MongoDB service is in standby. Local mongod is offline or MONGODB_URI is pending.');
      } else {
        setMongoError(err.message || 'Unable to connect to MongoDB endpoint');
      }
    } finally {
      setLoadingMongo(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mongo') {
      fetchMongoInventory();
    }
  }, [activeTab, mongoFilterDistrict, mongoFilterCategory]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    setMongoError(null);
    setMongoSuccessMsg(null);

    try {
      const payload = {
        itemName: formItemName,
        shelterName: formShelterName,
        districtName: formDistrict,
        category: formCategory,
        quantity: parseFloat(formQuantity),
        unit: formUnit,
        criticalThreshold: parseFloat(formThreshold),
        notes: formNotes || undefined,
      };

      await api.createMongoReliefItem(payload);
      setMongoSuccessMsg(`Item "${formItemName}" registered in MongoDB Atlas successfully.`);
      setShowAddModal(false);
      setFormItemName('');
      setFormNotes('');
      fetchMongoInventory();
    } catch (err: any) {
      setMongoError(err.message || 'Failed to insert document into MongoDB.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleOpenEdit = (item: MongoReliefItem) => {
    setEditingItem(item);
    setEditQuantity(String(item.quantity));
    setEditThreshold(String(item.criticalThreshold));
    setEditNotes(item.notes || '');
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSubmittingEdit(true);
    setMongoError(null);
    setMongoSuccessMsg(null);

    try {
      const payload = {
        quantity: parseFloat(editQuantity),
        criticalThreshold: parseFloat(editThreshold),
        notes: editNotes || undefined,
      };

      await api.updateMongoReliefItem(editingItem._id, payload);
      setMongoSuccessMsg(`Stock for "${editingItem.itemName}" updated successfully.`);
      setEditingItem(null);
      fetchMongoInventory();
    } catch (err: any) {
      setMongoError(err.message || 'Failed to update document in MongoDB.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from MongoDB Atlas collection?`)) return;
    try {
      await api.deleteMongoReliefItem(id);
      setMongoSuccessMsg(`Document "${name}" removed from MongoDB Atlas.`);
      fetchMongoInventory();
    } catch (err: any) {
      setMongoError(err.message || 'Failed to delete document.');
    }
  };

  const displayedMongoItems = mongoItems.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.itemName.toLowerCase().includes(term) ||
      item.shelterName.toLowerCase().includes(term) ||
      item.districtName.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
            Shelters & Relief Logistics Management
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Operational ground registry for Tamil Nadu multipurpose cyclone shelters & emergency stockpiles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-official">
            <span className="pulse-dot"></span> MERN STACK (MONGODB ATLAS)
          </span>
          <span className="badge badge-operational">
            MANUAL OPERATIONAL GROUND DATA
          </span>
        </div>
      </div>

      {/* Aggregate Readiness KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        {/* Total Capacity */}
        <div className="card" style={{ padding: '1rem', background: '#11192a' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
            Total Shelter Capacity
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
            {totalCapacity.toLocaleString()}{' '}
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8' }}>persons</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            Across {shelters.length} coastal centers
          </div>
        </div>

        {/* Current Occupancy */}
        <div className="card" style={{ padding: '1rem', background: '#11192a' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
            Current Occupancy
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totalOccupancy > 0 ? '#38bdf8' : '#10b981' }}>
            {totalOccupancy.toLocaleString()}{' '}
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8' }}>evacuees</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            {availableSlots.toLocaleString()} vacancies ready on standby
          </div>
        </div>

        {/* Generators Standby */}
        <div className="card" style={{ padding: '1rem', background: '#11192a' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
            Backup Power Generators
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
            {generatorsCount} / {shelters.length}{' '}
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8' }}>Operational</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            Diesel fuel stockpiles logged
          </div>
        </div>

        {/* Medical Posts */}
        <div className="card" style={{ padding: '1rem', background: '#11192a' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
            First-Aid Medical Posts
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
            {medicalPostsCount} / {shelters.length}{' '}
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8' }}>Staffed</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
            Anti-venom & trauma kits verified
          </div>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div>
        <div className="tabs-header" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('mongo')}
            className={`tab-btn ${activeTab === 'mongo' ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              borderColor: activeTab === 'mongo' ? '#10b981' : undefined,
              color: activeTab === 'mongo' ? '#34d399' : undefined,
            }}
          >
            <Database size={16} color={activeTab === 'mongo' ? '#34d399' : '#94a3b8'} />
            <span>MERN Stack (MongoDB Atlas Stockpile)</span>
          </button>

          <button
            onClick={() => setActiveTab('shelters')}
            className={`tab-btn ${activeTab === 'shelters' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Building2 size={16} />
            <span>Evacuation Shelters Directory ({shelters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Package size={16} />
            <span>Relational Registry (PostgreSQL Baseline)</span>
          </button>
        </div>

        {/* Tab 1: MERN MongoDB Management */}
        {activeTab === 'mongo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* MERN Architecture Banner */}
            <div className="card" style={{
              background: '#0a1324',
              borderColor: '#1e3a5f',
              padding: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Server size={22} color="#10b981" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      MongoDB Atlas Emergency Stockpile Subsystem
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontWeight: 700,
                        background: mongoStandby ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: mongoStandby ? '#fbbf24' : '#34d399',
                        border: mongoStandby ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                      }}>
                        {mongoStandby ? 'STANDBY MODE' : 'MONGODB ATLAS CONNECTED'}
                      </span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem', lineHeight: 1.5 }}>
                      Genuine MERN stack module: <strong>React</strong> UI communicates with <strong>Express / Node.js</strong> REST endpoints (<code style={{ color: '#38bdf8' }}>/api/mongo/inventory</code>) backed by live <strong>MongoDB Atlas</strong> collections via <strong>Mongoose ODM</strong> (<code style={{ color: '#a78bfa' }}>ReliefItemModel</code>).
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={fetchMongoInventory}
                    disabled={loadingMongo}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                  >
                    <RefreshCw size={14} className={loadingMongo ? 'pulse-dot' : ''} />
                    <span>{loadingMongo ? 'Syncing...' : 'Sync Atlas'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedDistrict) setFormDistrict(selectedDistrict);
                      setShowAddModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', background: '#059669', borderColor: '#10b981' }}
                  >
                    <Plus size={14} />
                    <span>+ Add Relief Item</span>
                  </button>
                </div>
              </div>

              {/* Status Message Banners */}
              {mongoSuccessMsg && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '0.375rem',
                  color: '#34d399',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <CheckCircle2 size={16} />
                  <span>{mongoSuccessMsg}</span>
                </div>
              )}

              {mongoError && !mongoStandby && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '0.375rem',
                  color: '#f87171',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <AlertTriangle size={16} />
                  <span>{mongoError}</span>
                </div>
              )}

              {mongoStandby && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                  color: '#fbbf24',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    <AlertTriangle size={16} />
                    MongoDB Connection Standby
                  </div>
                  <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
                    The backend Mongoose service is configured. Set <code style={{ color: '#f8fafc', background: '#111827', padding: '0.1rem 0.3rem' }}>MONGODB_URI</code> in <code style={{ color: '#38bdf8' }}>backend/.env</code> to connect live.
                  </div>
                </div>
              )}
            </div>

            {/* Filter and Search Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: '#111827',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #1f2937',
            }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                {/* Search Input */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: '220px',
                }}>
                  <Search size={14} color="#64748b" style={{ position: 'absolute', left: '0.65rem' }} />
                  <input
                    type="text"
                    placeholder="Search relief supplies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1a273b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      padding: '0.35rem 0.65rem 0.35rem 2rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.78rem',
                    }}
                  />
                </div>

                {/* District Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Filter size={13} color="#94a3b8" />
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>District:</label>
                  <select
                    value={mongoFilterDistrict}
                    onChange={(e) => setMongoFilterDistrict(e.target.value)}
                    style={{
                      background: '#1f293d',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <option value="ALL">All Coastal Districts ({TN_COASTAL_DISTRICTS.length})</option>
                    {TN_COASTAL_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Category:</label>
                  <select
                    value={mongoFilterCategory}
                    onChange={(e) => setMongoFilterCategory(e.target.value)}
                    style={{
                      background: '#1f293d',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <option value="ALL">All Categories ({RELIEF_CATEGORIES.length})</option>
                    {RELIEF_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {selectedDistrict && mongoFilterDistrict !== selectedDistrict && (
                  <button
                    onClick={() => setMongoFilterDistrict(selectedDistrict)}
                    style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    Filter to Active: {selectedDistrict}
                  </button>
                )}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Stock Items: <strong style={{ color: '#f8fafc' }}>{displayedMongoItems.length}</strong>
              </div>
            </div>

            {/* MongoDB Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#0e1627', borderBottom: '1px solid #1a273b' }}>
                      <th style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Relief Item Name</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Shelter & District</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Available Stock</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Threshold</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>Stock Status</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedMongoItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                          {loadingMongo ? (
                            <div>
                              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                              <div>Querying MongoDB Atlas collection...</div>
                            </div>
                          ) : mongoStandby ? (
                            <div>
                              <Database size={28} color="#fbbf24" style={{ margin: '0 auto 0.5rem' }} />
                              <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>
                                MongoDB Collections On Standby
                              </div>
                            </div>
                          ) : (
                            <div>No inventory items found matching the selected filter criteria.</div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      displayedMongoItems.map((item) => {
                        const statusColor =
                          item.stockStatus === 'SUFFICIENT' ? '#10b981' :
                          item.stockStatus === 'LOW' ? '#f59e0b' : '#ef4444';
                        return (
                          <tr key={item._id} style={{ borderBottom: '1px solid #142035' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#f8fafc' }}>
                              {item.itemName}
                              {item.notes && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>{item.notes}</div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '0.25rem',
                                background: '#1e293b',
                                color: '#94a3b8',
                              }}>
                                {item.category.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                              <div>{item.shelterName}</div>
                              <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>{item.districtName} District</div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                              {item.quantity.toLocaleString()} {item.unit}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                              {item.criticalThreshold} {item.unit}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontWeight: 700,
                                background: `${statusColor}20`,
                                color: statusColor,
                                border: `1px solid ${statusColor}40`,
                              }}>
                                {item.stockStatus}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  style={{
                                    background: 'rgba(14, 165, 233, 0.15)',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    color: '#38bdf8',
                                    padding: '0.3rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}
                                  title="Edit quantity in MongoDB"
                                >
                                  <Edit3 size={12} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteItem(item._id, item.itemName)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    padding: '0.3rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}
                                  title="Delete document from MongoDB"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Add Relief Item */}
            {showAddModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem',
              }}>
                <div className="card" style={{
                  maxWidth: '520px',
                  width: '100%',
                  background: '#0d1527',
                  border: '1px solid #1e3a5f',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Database size={20} color="#10b981" />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                        Register Relief Item in MongoDB Atlas
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowAddModal(false)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                        Item Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formItemName}
                        onChange={(e) => setFormItemName(e.target.value)}
                        placeholder="e.g. Life Jackets & Buoys, Anti-Venom Vials"
                        style={{
                          width: '100%',
                          background: '#162238',
                          border: '1px solid #283e60',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.375rem',
                          color: '#f8fafc',
                          fontSize: '0.8rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                          District *
                        </label>
                        <select
                          value={formDistrict}
                          onChange={(e) => setFormDistrict(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#162238',
                            border: '1px solid #283e60',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                          }}
                        >
                          {TN_COASTAL_DISTRICTS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                          Category *
                        </label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#162238',
                            border: '1px solid #283e60',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                          }}
                        >
                          {RELIEF_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                        Shelter Center *
                      </label>
                      <input
                        type="text"
                        required
                        value={formShelterName}
                        onChange={(e) => setFormShelterName(e.target.value)}
                        placeholder="Cyclone Relief Center Name"
                        style={{
                          width: '100%',
                          background: '#162238',
                          border: '1px solid #283e60',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.375rem',
                          color: '#f8fafc',
                          fontSize: '0.8rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                          Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#162238',
                            border: '1px solid #283e60',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                          Unit *
                        </label>
                        <input
                          type="text"
                          required
                          value={formUnit}
                          onChange={(e) => setFormUnit(e.target.value)}
                          placeholder="packets / liters"
                          style={{
                            width: '100%',
                            background: '#162238',
                            border: '1px solid #283e60',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                          Threshold *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formThreshold}
                          onChange={(e) => setFormThreshold(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#162238',
                            border: '1px solid #283e60',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                        Operational Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="e.g. Inspected on routine drill, waterproof packed"
                        style={{
                          width: '100%',
                          background: '#162238',
                          border: '1px solid #283e60',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.375rem',
                          color: '#f8fafc',
                          fontSize: '0.8rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingForm}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', background: '#059669', borderColor: '#10b981' }}
                      >
                        {submittingForm ? 'Saving to Atlas...' : 'Save to MongoDB Atlas'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Relief Item */}
            {editingItem && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem',
              }}>
                <div className="card" style={{
                  maxWidth: '480px',
                  width: '100%',
                  background: '#0d1527',
                  border: '1px solid #1e3a5f',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Edit3 size={18} color="#38bdf8" />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                        Update Stock Quantity (PUT)
                      </h3>
                    </div>
                    <button
                      onClick={() => setEditingItem(null)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Item:</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.15rem' }}>
                        {editingItem.itemName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {editingItem.shelterName} ({editingItem.districtName} District)
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                          Available Quantity ({editingItem.unit}) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#162238',
                            border: '1px solid #283e60',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            color: '#f8fafc',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                          Critical Threshold ({editingItem.unit}) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#162238',
                            border: '1px solid #283e60',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            color: '#f8fafc',
                            fontSize: '0.85rem',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                        Operational Notes
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="e.g. Stock replenished via District Logistics Depot"
                        style={{
                          width: '100%',
                          background: '#162238',
                          border: '1px solid #283e60',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.375rem',
                          color: '#f8fafc',
                          fontSize: '0.8rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingEdit}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', background: '#0284c7', borderColor: '#38bdf8' }}
                      >
                        {submittingEdit ? 'Updating in Atlas...' : 'Update Document in Atlas'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Shelters Table */}
        {activeTab === 'shelters' && (
          <SheltersTable shelters={shelters} />
        )}

        {/* Tab 3: Relational PostgreSQL Inventory */}
        {activeTab === 'inventory' && (
          <ReliefInventoryTable inventory={inventory} />
        )}
      </div>
    </div>
  );
};
