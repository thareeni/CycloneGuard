import React, { useState, useEffect } from 'react';
import {
  Shelter,
  ReliefInventoryItem,
  ReliefTransfer,
  ConsumptionEstimate,
  AuditLogEntry,
  AuthUser,
} from '../types';
import { SheltersTable } from '../components/SheltersTable';
import { api } from '../services/api';
import {
  Building2,
  Database,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Truck,
  Activity,
  Shield,
} from 'lucide-react';

interface SheltersReliefViewProps {
  shelters: Shelter[];
  inventory?: ReliefInventoryItem[];
  selectedDistrict?: string;
  currentUser?: AuthUser | null;
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
  'Tiruvallur',
  'Chennai',
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
  inventory: _inventory,
  selectedDistrict = 'ALL',
  currentUser = null,
}) => {
  const [activeTab, setActiveTab] = useState<'shelters' | 'mongo' | 'transfers' | 'consumption' | 'audit'>('mongo');

  // MongoDB Collection State
  const [mongoItems, setMongoItems] = useState<MongoReliefItem[]>([]);
  const [loadingMongo, setLoadingMongo] = useState<boolean>(false);
  const [mongoStandby, setMongoStandby] = useState<boolean>(false);
  const [mongoError, setMongoError] = useState<string | null>(null);
  const [mongoSuccessMsg, setMongoSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MongoReliefItem | null>(null);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);

  // Filters
  const [mongoFilterDistrict, setMongoFilterDistrict] = useState<string>(selectedDistrict || 'ALL');
  const [mongoFilterCategory, setMongoFilterCategory] = useState<string>('ALL');

  // Add Item Form State
  const [formItemName, setFormItemName] = useState('');
  const [formShelterName, setFormShelterName] = useState(shelters[0]?.name || 'Santhome Multipurpose Cyclone Relief Center');
  const [formDistrict, setFormDistrict] = useState(selectedDistrict !== 'ALL' ? selectedDistrict : 'Chennai');
  const [formCategory, setFormCategory] = useState('FOOD_RATIONS');
  const [formQuantity, setFormQuantity] = useState('1000');
  const [formUnit, setFormUnit] = useState('packets');
  const [formThreshold, setFormThreshold] = useState('200');
  const [formNotes, setFormNotes] = useState('');

  // Resource Transfers State
  const [transfers, setTransfers] = useState<ReliefTransfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState<boolean>(false);
  const [transferFilterDistrict, setTransferFilterDistrict] = useState<string>('ALL');
  const [transferFilterStatus, setTransferFilterStatus] = useState<string>('ALL');

  // Transfer Form State
  const [trfWarehouse, setTrfWarehouse] = useState('State Disaster Logistics Hub, Chennai Port');
  const [trfShelterName, setTrfShelterName] = useState(shelters[0]?.name || 'Santhome Multipurpose Cyclone Relief Center');
  const [trfDistrict, setTrfDistrict] = useState('Chennai');
  const [trfItemName, setTrfItemName] = useState('Purified Bottled Water (1L)');
  const [trfCategory, setTrfCategory] = useState('DRINKING_WATER');
  const [trfQuantity, setTrfQuantity] = useState('1500');
  const [trfUnit, setTrfUnit] = useState('liters');
  const [trfPriority, setTrfPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('URGENT');
  const [trfRemarks, setTrfRemarks] = useState('Pre-landfall emergency buffer stock replenishment');

  // Consumption Estimates State
  const [consumptionData, setConsumptionData] = useState<ConsumptionEstimate[]>([]);
  const [loadingConsumption, setLoadingConsumption] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Load MongoDB Inventory Items
  const fetchMongoInventory = async () => {
    setLoadingMongo(true);
    setMongoError(null);
    try {
      const res = await api.getMongoInventory(mongoFilterDistrict, mongoFilterCategory);
      if (res && res.data) {
        setMongoItems(res.data);
        setMongoStandby(false);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('standby')) {
        setMongoStandby(true);
      } else {
        setMongoError(err.message || 'Failed to fetch MongoDB inventory');
      }
    } finally {
      setLoadingMongo(false);
    }
  };

  // Load Transfers
  const fetchTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const data = await api.getReliefTransfers(transferFilterDistrict, transferFilterStatus);
      setTransfers(data);
    } catch (err: any) {
      console.warn('Transfers fetch warning:', err.message);
    } finally {
      setLoadingTransfers(false);
    }
  };

  // Load Consumption Estimates
  const fetchConsumption = async () => {
    setLoadingConsumption(true);
    try {
      const res = await api.getConsumptionEstimates();
      if (res && res.data) {
        setConsumptionData(res.data);
      }
    } catch (err: any) {
      console.warn('Consumption estimates warning:', err.message);
    } finally {
      setLoadingConsumption(false);
    }
  };

  // Load Audit Logs (Admin)
  const fetchAuditLogs = async () => {
    if (currentUser?.role !== 'ADMIN') return;
    setLoadingAudit(true);
    try {
      const data = await api.getAuditLogs();
      setAuditLogs(data);
    } catch (err: any) {
      console.warn('Audit logs fetch warning:', err.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mongo') {
      fetchMongoInventory();
    } else if (activeTab === 'transfers') {
      fetchTransfers();
    } else if (activeTab === 'consumption') {
      fetchConsumption();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, mongoFilterDistrict, mongoFilterCategory, transferFilterDistrict, transferFilterStatus]);

  // Sync selected district from prop
  useEffect(() => {
    if (selectedDistrict && selectedDistrict !== 'ALL') {
      setMongoFilterDistrict(selectedDistrict);
      setFormDistrict(selectedDistrict);
      setTrfDistrict(selectedDistrict);
    }
  }, [selectedDistrict]);

  // Handle Add / Edit Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setMongoError(null);
    setMongoSuccessMsg(null);

    const payload = {
      itemName: formItemName,
      shelterName: formShelterName,
      districtName: formDistrict,
      category: formCategory,
      quantity: Number(formQuantity),
      unit: formUnit,
      criticalThreshold: Number(formThreshold),
      notes: formNotes,
    };

    try {
      if (editingItem) {
        await api.updateMongoReliefItem(editingItem._id, payload);
        setMongoSuccessMsg(`Item "${formItemName}" updated successfully in MongoDB Atlas.`);
      } else {
        await api.createMongoReliefItem(payload);
        setMongoSuccessMsg(`New relief supply "${formItemName}" added to MongoDB Atlas.`);
      }
      setShowAddModal(false);
      setEditingItem(null);
      resetForm();
      fetchMongoInventory();
    } catch (err: any) {
      setMongoError(err.message || 'Operation failed. Check permissions.');
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from MongoDB?`)) return;
    try {
      await api.deleteMongoReliefItem(id);
      setMongoSuccessMsg(`Item "${name}" removed from MongoDB Atlas.`);
      fetchMongoInventory();
    } catch (err: any) {
      setMongoError(err.message || 'Delete operation failed. Admin role required.');
    }
  };

  // Handle Initiate Transfer
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setMongoError(null);
    try {
      const selectedShelterObj = shelters.find((s) => s.name === trfShelterName);
      const payload = {
        sourceWarehouse: trfWarehouse,
        destinationShelterId: selectedShelterObj?.id || 1,
        destinationShelterName: trfShelterName,
        destinationDistrict: trfDistrict,
        itemName: trfItemName,
        category: trfCategory,
        quantity: Number(trfQuantity),
        unit: trfUnit,
        priority: trfPriority,
        requestedBy: currentUser?.name || 'Operational Logistics Officer',
        remarks: trfRemarks,
      };

      await api.createReliefTransfer(payload);
      setMongoSuccessMsg('Emergency relief transfer request initiated.');
      setShowTransferModal(false);
      fetchTransfers();
    } catch (err: any) {
      setMongoError(err.message || 'Transfer initiation failed.');
    }
  };

  // Handle Advance Transfer Status
  const handleAdvanceStatus = async (
    transfer: ReliefTransfer,
    newStatus: 'APPROVED' | 'DISPATCHED' | 'COMPLETED'
  ) => {
    try {
      const updatePayload: any = {
        status: newStatus,
        updatedBy: currentUser?.name || 'Authorized Controller',
      };

      if (newStatus === 'DISPATCHED') {
        const vehicle = prompt('Enter transport vehicle number:', 'TN-01-G-4521');
        const driver = prompt('Enter convoy driver name & contact:', 'R. Murugan (+91-98840-54321)');
        if (vehicle) updatePayload.carrierVehicleNo = vehicle;
        if (driver) updatePayload.driverName = driver;
        updatePayload.notes = `Vehicle ${vehicle || 'Convoy'} departed warehouse.`;
      } else if (newStatus === 'COMPLETED') {
        updatePayload.deliveredQuantity = transfer.quantity;
        updatePayload.notes = `Stock received and reconciled at ${transfer.destinationShelterName}.`;
      }

      await api.updateTransferStatus(transfer._id || transfer.transferId, updatePayload);
      setMongoSuccessMsg(`Transfer ${transfer.transferId} updated to ${newStatus}.`);
      fetchTransfers();
      fetchMongoInventory();
    } catch (err: any) {
      setMongoError(err.message || 'Failed to update transfer status.');
    }
  };

  const resetForm = () => {
    setFormItemName('');
    setFormShelterName(shelters[0]?.name || 'Santhome Multipurpose Cyclone Relief Center');
    setFormDistrict(selectedDistrict !== 'ALL' ? selectedDistrict : 'Chennai');
    setFormCategory('FOOD_RATIONS');
    setFormQuantity('1000');
    setFormUnit('packets');
    setFormThreshold('200');
    setFormNotes('');
  };

  const openEditModal = (item: MongoReliefItem) => {
    setEditingItem(item);
    setFormItemName(item.itemName);
    setFormShelterName(item.shelterName);
    setFormDistrict(item.districtName);
    setFormCategory(item.category);
    setFormQuantity(String(item.quantity));
    setFormUnit(item.unit);
    setFormThreshold(String(item.criticalThreshold));
    setFormNotes(item.notes || '');
    setShowAddModal(true);
  };

  const filteredItems = mongoItems.filter((i) => {
    if (!searchTerm) return true;
    return (
      i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.shelterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.districtName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
            Shelters Directory & Relief Logistics
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Centralized coordination across all 14 Tamil Nadu coastal districts • Multi-tiered verification & resource tracking.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {currentUser?.role === 'PUBLIC' ? (
            <div
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                background: '#162032',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #24344d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Shield size={13} color="#34d399" />
              <span>Public Citizen Portal: Read-Only Access</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowTransferModal(true);
                  setMongoError(null);
                }}
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Truck size={15} />
                <span>Initiate Transfer</span>
              </button>

              <button
                onClick={() => {
                  setEditingItem(null);
                  resetForm();
                  setShowAddModal(true);
                  setMongoError(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={15} />
                <span>Add Stock Item</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {mongoSuccessMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            borderRadius: '0.375rem',
            padding: '0.65rem 1rem',
            fontSize: '0.8rem',
            color: '#a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} /> <span>{mongoSuccessMsg}</span>
          </div>
          <button onClick={() => setMongoSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#a7f3d0', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {mongoError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '0.375rem',
            padding: '0.65rem 1rem',
            fontSize: '0.8rem',
            color: '#fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> <span>{mongoError}</span>
          </div>
          <button onClick={() => setMongoError(null)} style={{ background: 'none', border: 'none', color: '#fecaca', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {mongoStandby && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '0.375rem',
            padding: '0.65rem 1rem',
            fontSize: '0.78rem',
            color: '#fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={16} color="#fbbf24" />
          <span>MongoDB Atlas daemon in standby mode. Configure MONGODB_URI in backend/.env for live cloud collections.</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #1e293b',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setActiveTab('mongo')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.15rem',
            background: activeTab === 'mongo' ? '#1e293b' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'mongo' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'mongo' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <Database size={16} />
          <span>MongoDB Atlas Stockpile ({mongoItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.15rem',
            background: activeTab === 'transfers' ? '#1e293b' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'transfers' ? '2px solid #a855f7' : '2px solid transparent',
            color: activeTab === 'transfers' ? '#a855f7' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <Truck size={16} />
          <span>Resource Transfers ({transfers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('consumption')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.15rem',
            background: activeTab === 'consumption' ? '#1e293b' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'consumption' ? '2px solid #34d399' : '2px solid transparent',
            color: activeTab === 'consumption' ? '#34d399' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <Activity size={16} />
          <span>Consumption Burn-Rate</span>
        </button>

        <button
          onClick={() => setActiveTab('shelters')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.15rem',
            background: activeTab === 'shelters' ? '#1e293b' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'shelters' ? '2px solid #fbbf24' : '2px solid transparent',
            color: activeTab === 'shelters' ? '#fbbf24' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <Building2 size={16} />
          <span>42 Baseline Shelters Directory</span>
        </button>

        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              background: activeTab === 'audit' ? '#1e293b' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'audit' ? '2px solid #ef4444' : '2px solid transparent',
              color: activeTab === 'audit' ? '#ef4444' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <Shield size={16} />
            <span>Admin Security Audit Trail</span>
          </button>
        )}
      </div>

      {/* TAB 1: MongoDB Atlas Inventory Stockpile */}
      {activeTab === 'mongo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Controls Bar */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search supplies, shelters, or districts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d131f',
                  border: '1px solid #1f293d',
                  borderRadius: '0.375rem',
                  padding: '0.4rem 0.75rem',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict ? currentUser.assignedDistrict : mongoFilterDistrict}
                disabled={currentUser?.role === 'DISTRICT_OFFICIAL'}
                onChange={(e) => setMongoFilterDistrict(e.target.value)}
                style={{
                  background: currentUser?.role === 'DISTRICT_OFFICIAL' ? '#1c1917' : '#0d131f',
                  border: currentUser?.role === 'DISTRICT_OFFICIAL' ? '1px solid #d97706' : '1px solid #1f293d',
                  color: currentUser?.role === 'DISTRICT_OFFICIAL' ? '#fbbf24' : '#f8fafc',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                  cursor: currentUser?.role === 'DISTRICT_OFFICIAL' ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="ALL">All Coastal Districts</option>
                {TN_COASTAL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={mongoFilterCategory}
                onChange={(e) => setMongoFilterCategory(e.target.value)}
                style={{
                  background: '#0d131f',
                  border: '1px solid #1f293d',
                  color: '#f8fafc',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                }}
              >
                <option value="ALL">All Categories</option>
                {RELIEF_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchMongoInventory}
                disabled={loadingMongo}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              >
                <RefreshCw size={13} style={{ animation: loadingMongo ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#0a101d', borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Item & Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Shelter & District</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Stock Quantity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Threshold</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #162032' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ color: '#f8fafc', display: 'block' }}>{item.itemName}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>{item.category}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ color: '#cbd5e1' }}>{item.shelterName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.districtName} District</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
                        {item.quantity.toLocaleString()} {item.unit}
                      </strong>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                      {item.criticalThreshold} {item.unit}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          background:
                            item.stockStatus === 'SUFFICIENT'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : item.stockStatus === 'LOW'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color:
                            item.stockStatus === 'SUFFICIENT'
                              ? '#34d399'
                              : item.stockStatus === 'LOW'
                              ? '#fbbf24'
                              : '#f87171',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {item.stockStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      {currentUser?.role === 'PUBLIC' ? (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Read-only</span>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            onClick={() => openEditModal(item)}
                            disabled={currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict !== item.districtName}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict !== item.districtName ? '#475569' : '#38bdf8',
                              cursor: currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict !== item.districtName ? 'not-allowed' : 'pointer',
                            }}
                            title={currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict !== item.districtName ? 'Jurisdiction locked to assigned district' : 'Edit Quantity / Threshold'}
                          >
                            <Edit3 size={15} />
                          </button>
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleDeleteItem(item._id, item.itemName)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                              title="Delete from MongoDB"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Resource Transfers Workflow */}
      {activeTab === 'transfers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Controls Bar */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                Resource Transfer & Convoy Tracking Pipeline
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Lifecycle: REQUESTED ➔ APPROVED ➔ DISPATCHED ➔ COMPLETED (Automated Stock Balancing)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict ? currentUser.assignedDistrict : transferFilterDistrict}
                disabled={currentUser?.role === 'DISTRICT_OFFICIAL'}
                onChange={(e) => setTransferFilterDistrict(e.target.value)}
                style={{
                  background: currentUser?.role === 'DISTRICT_OFFICIAL' ? '#1c1917' : '#0d131f',
                  border: currentUser?.role === 'DISTRICT_OFFICIAL' ? '1px solid #d97706' : '1px solid #1f293d',
                  color: currentUser?.role === 'DISTRICT_OFFICIAL' ? '#fbbf24' : '#f8fafc',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                  cursor: currentUser?.role === 'DISTRICT_OFFICIAL' ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="ALL">All Destination Districts</option>
                {TN_COASTAL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={transferFilterStatus}
                onChange={(e) => setTransferFilterStatus(e.target.value)}
                style={{
                  background: '#0d131f',
                  border: '1px solid #1f293d',
                  color: '#f8fafc',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <button
                onClick={fetchTransfers}
                disabled={loadingTransfers}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              >
                <RefreshCw size={13} style={{ animation: loadingTransfers ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

          {/* Transfers Table */}
          <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#0a101d', borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Transfer ID & Item</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Route Corridor</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Quantity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status & Timeline</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Workflow Action</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((trf) => (
                  <tr key={trf.transferId} style={{ borderBottom: '1px solid #162032' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.68rem', color: '#a855f7', fontWeight: 700, background: 'rgba(168, 85, 247, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>
                        {trf.transferId}
                      </span>
                      <strong style={{ color: '#f8fafc', display: 'block', marginTop: '0.2rem' }}>
                        {trf.itemName}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Priority: {trf.priority}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                        From: <strong>{trf.sourceWarehouse}</strong>
                      </div>
                      <div style={{ color: '#38bdf8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        To: <strong>{trf.destinationShelterName}</strong> ({trf.destinationDistrict})
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
                        {trf.quantity.toLocaleString()} {trf.unit}
                      </strong>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          background:
                            trf.status === 'COMPLETED'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : trf.status === 'DISPATCHED'
                              ? 'rgba(56, 189, 248, 0.2)'
                              : trf.status === 'APPROVED'
                              ? 'rgba(168, 85, 247, 0.2)'
                              : 'rgba(245, 158, 11, 0.2)',
                          color:
                            trf.status === 'COMPLETED'
                              ? '#34d399'
                              : trf.status === 'DISPATCHED'
                              ? '#38bdf8'
                              : trf.status === 'APPROVED'
                              ? '#c084fc'
                              : '#fbbf24',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {trf.status}
                      </span>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.3rem' }}>
                        Logs: {trf.timeline?.length || 1} events
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      {currentUser?.role === 'PUBLIC' ? (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Read-only</span>
                      ) : currentUser?.role === 'DISTRICT_OFFICIAL' && currentUser.assignedDistrict !== trf.destinationDistrict ? (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }} title="Out of District Jurisdiction">Out of District</span>
                      ) : (
                        <>
                          {trf.status === 'REQUESTED' && (
                            <button
                              onClick={() => handleAdvanceStatus(trf, 'APPROVED')}
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                            >
                              Approve
                            </button>
                          )}
                          {trf.status === 'APPROVED' && (
                            <button
                              onClick={() => handleAdvanceStatus(trf, 'DISPATCHED')}
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: '#0284c7' }}
                            >
                              Dispatch Convoy
                            </button>
                          )}
                          {trf.status === 'DISPATCHED' && (
                            <button
                              onClick={() => handleAdvanceStatus(trf, 'COMPLETED')}
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: '#16a34a' }}
                            >
                              Confirm Delivery
                            </button>
                          )}
                          {trf.status === 'COMPLETED' && (
                            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
                              ✓ Delivered & Added
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Consumption Burn-Rate Analytics */}
      {activeTab === 'consumption' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loadingConsumption && (
            <div style={{ color: '#38bdf8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Calculating consumption burn-rates...
            </div>
          )}
          <div
            className="card"
            style={{
              padding: '1rem',
              background: '#0d1527',
              border: '1px solid #1f2d47',
              fontSize: '0.78rem',
            }}
          >
            <strong style={{ color: '#38bdf8' }}>Sphere Humanitarian Minimum Relief Standards Applied:</strong>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem', color: '#cbd5e1' }}>
              <div>💧 Drinking Water Standard: <strong>3.0 Liters / person / day</strong></div>
              <div>🍞 Emergency Food Standard: <strong>2.0 Meal Packets / person / day</strong></div>
              <div>👥 Baseline Standby Occupancy: <strong>150 minimum headcount assumed if shelter is vacant</strong></div>
            </div>
          </div>

          <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#0a101d', borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Shelter & District</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Headcount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Drinking Water Autonomy</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Food Rations Autonomy</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Shortage Risk Alert</th>
                </tr>
              </thead>
              <tbody>
                {consumptionData.map((est) => (
                  <tr key={est.shelterId} style={{ borderBottom: '1px solid #162032' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ color: '#f8fafc' }}>{est.shelterName}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{est.district} District • Max: {est.totalCapacity}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                      {est.effectiveOccupancy} evacuees
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>Stock: {est.stocks.drinkingWaterLiters.toLocaleString()} L</div>
                      <strong style={{ color: est.stocks.waterAutonomyDays < 2 ? '#ef4444' : '#34d399' }}>
                        {est.stocks.waterAutonomyDays} Days Autonomy
                      </strong>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>Stock: {est.stocks.foodPackets.toLocaleString()} pkts</div>
                      <strong style={{ color: est.stocks.foodAutonomyDays < 2 ? '#ef4444' : '#34d399' }}>
                        {est.stocks.foodAutonomyDays} Days Autonomy
                      </strong>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          background:
                            est.stocks.waterShortageRisk === 'HIGH' || est.stocks.foodShortageRisk === 'HIGH'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(16, 185, 129, 0.2)',
                          color:
                            est.stocks.waterShortageRisk === 'HIGH' || est.stocks.foodShortageRisk === 'HIGH'
                              ? '#f87171'
                              : '#34d399',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {est.stocks.waterShortageRisk === 'HIGH' || est.stocks.foodShortageRisk === 'HIGH'
                          ? 'HIGH DEFICIT ALERT'
                          : 'BUFFER SUFFICIENT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Shelters Directory */}
      {activeTab === 'shelters' && (
        <SheltersTable shelters={shelters} selectedDistrict={selectedDistrict} />
      )}

      {/* TAB 5: Admin Security Audit Trail */}
      {activeTab === 'audit' && currentUser?.role === 'ADMIN' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            className="card"
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                Operational & Security Audit Trail
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Real-time tracking of operational modifications, authorization attempts, and RBAC enforcement.
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              disabled={loadingAudit}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} style={{ animation: loadingAudit ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#0a101d', borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actor & Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Action Executed</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target Resource</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id || log._id} style={{ borderBottom: '1px solid #162032' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ color: '#f8fafc' }}>{log.actorEmail}</strong>
                      <div style={{ fontSize: '0.68rem', color: '#a855f7' }}>{log.actorRole}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#38bdf8', fontWeight: 600 }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                      {log.targetResource} {log.targetDistrict && `(${log.targetDistrict})`}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          background: log.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: log.status === 'SUCCESS' ? '#34d399' : '#f87171',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Inventory Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
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
              maxWidth: '520px',
              padding: '1.5rem',
              background: '#0f172a',
              border: '1px solid #334155',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                {editingItem ? 'Edit Relief Supply Item' : 'Add Emergency Supply to MongoDB'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Item Name</label>
                <input
                  type="text"
                  required
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  >
                    {RELIEF_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>District</label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  >
                    {TN_COASTAL_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Destination Shelter</label>
                <select
                  value={formShelterName}
                  onChange={(e) => setFormShelterName(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                >
                  {shelters.map((s) => (
                    <option key={s.id} value={s.name}>{s.name} ({s.districtName})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Unit</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Critical Threshold</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1.15rem', fontSize: '0.8rem' }}>
                  {editingItem ? 'Save Updates' : 'Add to Stockpile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Initiate Transfer Modal */}
      {showTransferModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
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
              maxWidth: '520px',
              padding: '1.5rem',
              background: '#0f172a',
              border: '1px solid #334155',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={18} color="#a855f7" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Initiate Emergency Resource Transfer
                </h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Source Warehouse / Hub</label>
                <input
                  type="text"
                  required
                  value={trfWarehouse}
                  onChange={(e) => setTrfWarehouse(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Destination District</label>
                  <select
                    value={trfDistrict}
                    onChange={(e) => setTrfDistrict(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  >
                    {TN_COASTAL_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Priority</label>
                  <select
                    value={trfPriority}
                    onChange={(e) => setTrfPriority(e.target.value as any)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  >
                    <option value="ROUTINE">Routine Replenishment</option>
                    <option value="URGENT">Urgent Advisory Buffer</option>
                    <option value="EMERGENCY">Emergency Pre-Landfall</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Destination Shelter</label>
                <select
                  value={trfShelterName}
                  onChange={(e) => setTrfShelterName(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                >
                  {shelters.map((s) => (
                    <option key={s.id} value={s.name}>{s.name} ({s.districtName})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Category</label>
                  <select
                    value={trfCategory}
                    onChange={(e) => setTrfCategory(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  >
                    {RELIEF_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Item Name</label>
                  <input
                    type="text"
                    required
                    value={trfItemName}
                    onChange={(e) => setTrfItemName(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={trfQuantity}
                    onChange={(e) => setTrfQuantity(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Unit</label>
                  <input
                    type="text"
                    required
                    value={trfUnit}
                    onChange={(e) => setTrfUnit(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Operational Remarks</label>
                <input
                  type="text"
                  value={trfRemarks}
                  onChange={(e) => setTrfRemarks(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.45rem', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowTransferModal(false)} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1.15rem', fontSize: '0.8rem' }}>
                  Initiate Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
