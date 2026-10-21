import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Waves,
  ArrowRight,
  Info,
  MapPin,
  UserCheck,
  UserPlus,
  LogIn,
  User,
  Phone,
} from 'lucide-react';
import { api } from '../services/api';
import { AuthUser, CoastalDistrict } from '../types';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
  sessionExpired?: boolean;
}

export type LoginRoleType = 'ADMIN' | 'DISTRICT_OFFICER' | 'PUBLIC_CITIZEN';

// Standard 14 coastal districts fallback baseline ensuring dropdown never renders empty
const FALLBACK_14_DISTRICTS: CoastalDistrict[] = [
  { id: 1, name: 'Tiruvallur', state: 'Tamil Nadu', stationId: 'tiruvallur', latitude: 13.2500, longitude: 80.3200, headquarters: 'Tiruvallur Collectorate', emergencyControlRoomPhone: '044-27664177', coastalZone: 'North Tamil Nadu Coast', isHighRiskZone: true, totalRegisteredShelters: 3, baselineShelterCapacity: 2700 },
  { id: 2, name: 'Chennai', state: 'Tamil Nadu', stationId: 'chennai', latitude: 13.0827, longitude: 80.2707, headquarters: 'Ripon Building, Greater Chennai Corporation', emergencyControlRoomPhone: '044-25619206', coastalZone: 'North Tamil Nadu Coast (Urban Port)', isHighRiskZone: true, totalRegisteredShelters: 4, baselineShelterCapacity: 4200 },
  { id: 3, name: 'Chengalpattu', state: 'Tamil Nadu', stationId: 'chengalpattu', latitude: 12.6190, longitude: 80.1930, headquarters: 'Collectorate, Chengalpattu', emergencyControlRoomPhone: '044-27427412', coastalZone: 'North Tamil Nadu Coast', isHighRiskZone: false, totalRegisteredShelters: 3, baselineShelterCapacity: 2800 },
  { id: 4, name: 'Villupuram', state: 'Tamil Nadu', stationId: 'villupuram', latitude: 12.1983, longitude: 79.9528, headquarters: 'Collectorate, Villupuram', emergencyControlRoomPhone: '04146-223265', coastalZone: 'North-Central Tamil Nadu Coast', isHighRiskZone: false, totalRegisteredShelters: 3, baselineShelterCapacity: 2450 },
  { id: 5, name: 'Cuddalore', state: 'Tamil Nadu', stationId: 'cuddalore', latitude: 11.7480, longitude: 79.7714, headquarters: 'Collectorate, Cuddalore', emergencyControlRoomPhone: '04142-221528', coastalZone: 'Central Delta Coast', isHighRiskZone: true, totalRegisteredShelters: 4, baselineShelterCapacity: 4300 },
  { id: 6, name: 'Mayiladuthurai', state: 'Tamil Nadu', stationId: 'mayiladuthurai', latitude: 11.1485, longitude: 79.8558, headquarters: 'Collectorate, Mayiladuthurai', emergencyControlRoomPhone: '04364-222222', coastalZone: 'Central Delta Coast', isHighRiskZone: true, totalRegisteredShelters: 3, baselineShelterCapacity: 2650 },
  { id: 7, name: 'Nagapattinam', state: 'Tamil Nadu', stationId: 'nagapattinam', latitude: 10.7656, longitude: 79.8424, headquarters: 'Collectorate, Nagapattinam', emergencyControlRoomPhone: '04365-252500', coastalZone: 'Central Delta Coast', isHighRiskZone: true, totalRegisteredShelters: 4, baselineShelterCapacity: 4500 },
  { id: 8, name: 'Tiruvarur', state: 'Tamil Nadu', stationId: 'tiruvarur', latitude: 10.4000, longitude: 79.5100, headquarters: 'Collectorate, Tiruvarur', emergencyControlRoomPhone: '04366-226622', coastalZone: 'Palk Strait Coast', isHighRiskZone: false, totalRegisteredShelters: 2, baselineShelterCapacity: 2000 },
  { id: 9, name: 'Thanjavur', state: 'Tamil Nadu', stationId: 'thanjavur', latitude: 10.2778, longitude: 79.3175, headquarters: 'Collectorate, Thanjavur', emergencyControlRoomPhone: '04362-230121', coastalZone: 'Palk Strait Coast', isHighRiskZone: false, totalRegisteredShelters: 2, baselineShelterCapacity: 2200 },
  { id: 10, name: 'Pudukkottai', state: 'Tamil Nadu', stationId: 'pudukkottai', latitude: 9.9750, longitude: 79.1980, headquarters: 'Collectorate, Pudukkottai', emergencyControlRoomPhone: '04322-222222', coastalZone: 'Palk Bay Coast', isHighRiskZone: false, totalRegisteredShelters: 2, baselineShelterCapacity: 1800 },
  { id: 11, name: 'Ramanathapuram', state: 'Tamil Nadu', stationId: 'rameshwaram', latitude: 9.2876, longitude: 79.3129, headquarters: 'Collectorate, Ramanathapuram', emergencyControlRoomPhone: '04567-230060', coastalZone: 'Gulf of Mannar / Palk Strait', isHighRiskZone: true, totalRegisteredShelters: 4, baselineShelterCapacity: 4600 },
  { id: 12, name: 'Thoothukudi', state: 'Tamil Nadu', stationId: 'thoothukudi', latitude: 8.7642, longitude: 78.1348, headquarters: 'Collectorate, Thoothukudi', emergencyControlRoomPhone: '0461-2340101', coastalZone: 'Gulf of Mannar Coast', isHighRiskZone: true, totalRegisteredShelters: 3, baselineShelterCapacity: 3400 },
  { id: 13, name: 'Tirunelveli', state: 'Tamil Nadu', stationId: 'tirunelveli', latitude: 8.1740, longitude: 77.6820, headquarters: 'Collectorate, Tirunelveli', emergencyControlRoomPhone: '0462-2500828', coastalZone: 'Southern Maritime Corridor', isHighRiskZone: false, totalRegisteredShelters: 2, baselineShelterCapacity: 1800 },
  { id: 14, name: 'Kanniyakumari', state: 'Tamil Nadu', stationId: 'kanyakumari', latitude: 8.0883, longitude: 77.5385, headquarters: 'Collectorate, Nagercoil', emergencyControlRoomPhone: '04652-278080', coastalZone: 'Southernmost Cape / Triple Sea Confluence', isHighRiskZone: true, totalRegisteredShelters: 3, baselineShelterCapacity: 3400 },
];

// District Officer Demo Credentials Mapping for all 14 Tamil Nadu Coastal Districts
const DEMO_OFFICER_CREDENTIALS: Record<string, { email: string; passwordSample: string }> = {
  tiruvallur: { email: 'tiruvallur.officer@cycloneguard.tn.gov.in', passwordSample: 'Tiruvallur@Guard2026!' },
  chennai: { email: 'chennai.officer@cycloneguard.tn.gov.in', passwordSample: 'Chennai@Guard2026!' },
  chengalpattu: { email: 'chengalpattu.officer@cycloneguard.tn.gov.in', passwordSample: 'Chengalpattu@Guard2026!' },
  villupuram: { email: 'villupuram.officer@cycloneguard.tn.gov.in', passwordSample: 'Villupuram@Guard2026!' },
  cuddalore: { email: 'cuddalore.officer@cycloneguard.tn.gov.in', passwordSample: 'Cuddalore@Guard2026!' },
  mayiladuthurai: { email: 'mayiladuthurai.officer@cycloneguard.tn.gov.in', passwordSample: 'Mayiladuthurai@Guard2026!' },
  nagapattinam: { email: 'nagai.officer@cycloneguard.tn.gov.in', passwordSample: 'Nagai@Guard2026!' },
  tiruvarur: { email: 'tiruvarur.officer@cycloneguard.tn.gov.in', passwordSample: 'Tiruvarur@Guard2026!' },
  thanjavur: { email: 'thanjavur.officer@cycloneguard.tn.gov.in', passwordSample: 'Thanjavur@Guard2026!' },
  pudukkottai: { email: 'pudukkottai.officer@cycloneguard.tn.gov.in', passwordSample: 'Pudukkottai@Guard2026!' },
  ramanathapuram: { email: 'ramanathapuram.officer@cycloneguard.tn.gov.in', passwordSample: 'Ramanathapuram@Guard2026!' },
  thoothukudi: { email: 'thoothukudi.officer@cycloneguard.tn.gov.in', passwordSample: 'Thoothukudi@Guard2026!' },
  tirunelveli: { email: 'tirunelveli.officer@cycloneguard.tn.gov.in', passwordSample: 'Tirunelveli@Guard2026!' },
  kanniyakumari: { email: 'kanniyakumari.officer@cycloneguard.tn.gov.in', passwordSample: 'Kanniyakumari@Guard2026!' },
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, sessionExpired = false }) => {
  // Mode: Sign In vs Citizen Public Registration
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'REGISTER'>('SIGN_IN');

  // Sign In: Role Category Selection (Admin / District Officer / Public Citizen)
  const [selectedRoleType, setSelectedRoleType] = useState<LoginRoleType>('ADMIN');

  // Districts loaded dynamically from API
  const [districts, setDistricts] = useState<CoastalDistrict[]>(FALLBACK_14_DISTRICTS);
  const [districtsLoading, setDistrictsLoading] = useState<boolean>(true);
  const [requestedDistrict, setRequestedDistrict] = useState<string>('Chennai');

  // Credentials are EMPTY by default per security requirements (Never pre-filled)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Registration Form State (Citizen Public Self-Service)
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    sessionExpired ? 'Your session has expired or is invalid. Please sign in again.' : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch all 14 coastal districts dynamically from the backend API on mount
  useEffect(() => {
    let isMounted = true;
    api
      .getDistricts()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setDistricts(data);
          setDistrictsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[LoginPage] Dynamic district fetch failed, using fallback 14:', err.message);
        if (isMounted) {
          setDistricts(FALLBACK_14_DISTRICTS);
          setDistrictsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Academic Demonstration Quick-Fill Helper (Fills inputs ONLY; Backend PBKDF2 verification strictly required)
  const handleQuickFillDemo = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (selectedRoleType === 'DISTRICT_OFFICER') {
      const key = requestedDistrict.toLowerCase();
      const creds = DEMO_OFFICER_CREDENTIALS[key] || {
        email: `${key}.officer@cycloneguard.tn.gov.in`,
        passwordSample: `${requestedDistrict}@Guard2026!`,
      };
      setEmail(creds.email);
      setPassword(creds.passwordSample);
    } else if (selectedRoleType === 'PUBLIC_CITIZEN') {
      setEmail('citizen@tn.gov.in');
      setPassword('Public@View2026!');
    }
  };

  const handleClear = () => {
    setEmail('');
    setPassword('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegPhone('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Handle Sign In Submission
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Authenticate via backend PBKDF2/SHA-512 cryptographic verification
      const response = await api.login(email.trim(), password);
      if (response && response.user) {
        onLogin(response.user);
      } else {
        throw new Error('Authentication response was invalid.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Invalid credentials. Password verification failed on backend PBKDF2 store.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Citizen Public Registration Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setErrorMessage('Please provide your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Please provide a valid personal email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await api.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim() || undefined,
      });

      if (response && response.user) {
        setSuccessMessage('Citizen account registered successfully! Redirecting to tactical console...');
        setTimeout(() => {
          onLogin(response.user);
        }, 800);
      } else {
        throw new Error('Registration succeeded but session could not be established.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at top, #111e38 0%, #080d1a 60%, #030712 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        color: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Top Banner / Emblems */}
      <div
        style={{
          maxWidth: '580px',
          width: '100%',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            padding: '0.4rem 0.9rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#60a5fa',
            marginBottom: '0.85rem',
            textTransform: 'uppercase',
          }}
        >
          <Waves size={14} color="#60a5fa" />
          <span>Government of Tamil Nadu • TNSDMA Official Disaster System</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(29, 78, 216, 0.5)',
            }}
          >
            <Shield size={26} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
            Cyclone<span style={{ color: '#38bdf8' }}>Guard</span>
          </h1>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
          Real-Time Cyclone Disaster Management System & Evacuation Command
        </p>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
          Statewide Surveillance across all 14 Coastal Districts of Tamil Nadu
        </p>
      </div>

      {/* Main Container Card */}
      <div
        className="card"
        style={{
          maxWidth: '580px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid #1e293b',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Sign In vs Register Mode Switcher Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', marginBottom: '1.25rem', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setAuthMode('SIGN_IN');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: authMode === 'SIGN_IN' ? '3px solid #38bdf8' : '3px solid transparent',
              color: authMode === 'SIGN_IN' ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
            }}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('REGISTER');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: authMode === 'REGISTER' ? '3px solid #34d399' : '3px solid transparent',
              color: authMode === 'REGISTER' ? '#34d399' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={16} />
            <span>Citizen Registration</span>
          </button>
        </div>

        {/* Error / Alert Banner */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              color: '#fca5a5',
              fontSize: '0.82rem',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <strong>Access Denied:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: '#6ee7b7',
              fontSize: '0.82rem',
            }}
          >
            <CheckCircle2 size={18} color="#34d399" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* VIEW A: SIGN IN TAB */}
        {authMode === 'SIGN_IN' && (
          <>
            {/* 1. THREE LOGIN ROLES SELECTOR TABS */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.4rem' }}>
                Operational Access Category:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.45rem',
                  background: '#090e1a',
                  padding: '0.3rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #1e293b',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoleType('ADMIN');
                    setEmail('');
                    setPassword('');
                    setErrorMessage(null);
                  }}
                  style={{
                    background: selectedRoleType === 'ADMIN' ? '#1e293b' : 'transparent',
                    border: selectedRoleType === 'ADMIN' ? '1px solid #ef4444' : '1px solid transparent',
                    color: selectedRoleType === 'ADMIN' ? '#f87171' : '#94a3b8',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.4rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Admin (Statewide)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoleType('DISTRICT_OFFICER');
                    setErrorMessage(null);
                  }}
                  style={{
                    background: selectedRoleType === 'DISTRICT_OFFICER' ? '#1e293b' : 'transparent',
                    border: selectedRoleType === 'DISTRICT_OFFICER' ? '1px solid #38bdf8' : '1px solid transparent',
                    color: selectedRoleType === 'DISTRICT_OFFICER' ? '#38bdf8' : '#94a3b8',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.4rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  District Officer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoleType('PUBLIC_CITIZEN');
                    setErrorMessage(null);
                  }}
                  style={{
                    background: selectedRoleType === 'PUBLIC_CITIZEN' ? '#1e293b' : 'transparent',
                    border: selectedRoleType === 'PUBLIC_CITIZEN' ? '1px solid #10b981' : '1px solid transparent',
                    color: selectedRoleType === 'PUBLIC_CITIZEN' ? '#34d399' : '#94a3b8',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.4rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Public Citizen
                </button>
              </div>
            </div>

            {/* 2. DYNAMIC 14 DISTRICTS DROPDOWN FOR DISTRICT OFFICER CONTEXT */}
            {selectedRoleType === 'DISTRICT_OFFICER' && (
              <div
                style={{
                  background: '#0d1524',
                  border: '1px solid #243552',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={15} color="#38bdf8" />
                    <label style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 600 }}>
                      Select Operational Officer District:
                    </label>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700 }}>
                    {districts.length} Coastal Districts Loaded
                  </span>
                </div>

                <select
                  value={requestedDistrict}
                  onChange={(e) => setRequestedDistrict(e.target.value)}
                  disabled={districtsLoading}
                  style={{
                    width: '100%',
                    background: '#162032',
                    border: '1px solid #3b82f6',
                    color: '#f8fafc',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: districtsLoading ? 'wait' : 'pointer',
                  }}
                >
                  {districtsLoading ? (
                    <option value="">Loading official coastal districts from registry...</option>
                  ) : (
                    districts.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} District (ID: {d.id} — {d.coastalZone})
                      </option>
                    ))
                  )}
                </select>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.35rem' }}>
                  * Backend validates cryptographic officer jurisdiction on every protected operation. Selecting a district does not grant permission without valid credentials.
                </div>
              </div>
            )}

            {/* 3. ACADEMIC EVALUATION QUICK-FILL HELPER (Excluded from Admin Login per security requirements) */}
            {selectedRoleType !== 'ADMIN' && (
              <div
                style={{
                  background: 'rgba(17, 24, 39, 0.75)',
                  border: '1px solid #1f293d',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <HelpCircle size={14} color="#38bdf8" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f1f5f9' }}>
                      Academic Evaluation Quick-Fill
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                    Autofills demo credentials for {selectedRoleType === 'DISTRICT_OFFICER' ? requestedDistrict : selectedRoleType}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <UserCheck size={13} color="#38bdf8" />
                  <span>Autofill Demo Inputs</span>
                </button>
              </div>
            )}

            {/* 4. OFFICIAL CREDENTIALS FORM */}
            <form onSubmit={handleSignInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Email Address */}
              <div>
                <label
                  htmlFor="official-email"
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '0.4rem',
                  }}
                >
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    id="official-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter registered email address"
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: '#090e1a',
                      border: '1px solid #24344d',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label
                    htmlFor="official-password"
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                    }}
                  >
                    Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>PBKDF2/SHA-512 Encrypted</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    id="official-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: '#090e1a',
                      border: '1px solid #24344d',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 2.6rem 0.65rem 2.5rem',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Buttons: Sign In + Clear */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading || (!email && !password)}
                  style={{
                    flex: 1,
                    background: '#162032',
                    border: '1px solid #24344d',
                    color: '#94a3b8',
                    borderRadius: '0.5rem',
                    padding: '0.7rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: loading || (!email && !password) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Clear
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    flex: 2,
                    padding: '0.7rem 1.25rem',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: loading ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="pulse-dot"></span>
                      <span>Verifying Cryptographic PBKDF2 Token...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Tactical Console</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Prompt to register as citizen */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              Are you a coastal resident or citizen?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('REGISTER');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontSize: 'inherit',
                }}
              >
                Register for a free public account →
              </button>
            </div>
          </>
        )}

        {/* VIEW B: CITIZEN PUBLIC REGISTRATION TAB */}
        {authMode === 'REGISTER' && (
          <div>
            {/* Citizen Portal Info Banner */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                fontSize: '0.78rem',
                color: '#d1fae5',
                lineHeight: 1.45,
              }}
            >
              <Info size={18} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Public Citizen Access:</strong> Open to all coastal residents, students, and citizens.
                You may register with your personal email (Gmail, Yahoo, Outlook, etc.). No government affiliation required.
                Citizens receive real-time access to coastal weather, storm tracks, shelters, and relief resources.
              </div>
            </div>

            {/* Role Fixed Notice: No selection of Admin/Officer */}
            <div
              style={{
                background: '#090e1a',
                border: '1px solid #1e293b',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.85rem',
                marginBottom: '1.15rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: '#94a3b8' }}>Assigned Access Level:</span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 700,
                }}
              >
                PUBLIC CITIZEN (Read-Only Safety Portal)
              </span>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Full Name */}
              <div>
                <label
                  htmlFor="reg-name"
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}
                >
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: '#090e1a',
                      border: '1px solid #24344d',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Personal Email */}
              <div>
                <label
                  htmlFor="reg-email"
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}
                >
                  Personal Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. citizen.resident@gmail.com"
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: '#090e1a',
                      border: '1px solid #24344d',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Phone (Optional) */}
              <div>
                <label
                  htmlFor="reg-phone"
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}
                >
                  Contact Number (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="reg-phone"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210 (For emergency alerts)"
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: '#090e1a',
                      border: '1px solid #24344d',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    htmlFor="reg-password"
                    style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}
                  >
                    Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      disabled={loading}
                      style={{
                        width: '100%',
                        background: '#090e1a',
                        border: '1px solid #24344d',
                        borderRadius: '0.5rem',
                        padding: '0.65rem 0.75rem 0.65rem 2.2rem',
                        color: '#f8fafc',
                        fontSize: '0.82rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm"
                    style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}
                  >
                    Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      id="reg-confirm"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter"
                      disabled={loading}
                      style={{
                        width: '100%',
                        background: '#090e1a',
                        border: '1px solid #24344d',
                        borderRadius: '0.5rem',
                        padding: '0.65rem 2.2rem 0.65rem 2.2rem',
                        color: '#f8fafc',
                        fontSize: '0.82rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.65rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title={showRegPassword ? 'Hide' : 'Show'}
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Citizen Registration */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                }}
              >
                {loading ? (
                  <>
                    <span className="pulse-dot"></span>
                    <span>Creating Public Citizen Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Create Free Citizen Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Back to Sign In Link */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SIGN_IN');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#34d399',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontSize: 'inherit',
                }}
              >
                Sign in to existing account →
              </button>
            </div>
          </div>
        )}

        {/* Security / Audit Footnote */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            fontSize: '0.72rem',
            color: '#64748b',
            lineHeight: 1.4,
          }}
        >
          <Info size={14} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            Every operational sign in, cross-district access, citizen registration, and relief mutation is cryptographically signed and permanently logged in the CycloneGuard Security Audit Trail with actor identity and UTC timestamp.
          </span>
        </div>
      </div>
    </div>
  );
};
