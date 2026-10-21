import mongoose, { Schema, Document } from 'mongoose';
import { hashPassword } from '../utils/cryptoAuth';
import { config } from '../config/env';

export type UserRole = 'ADMIN' | 'DISTRICT_OFFICIAL' | 'PUBLIC';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  assignedDistrict?: string;
  assignedDistrictId?: number;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['ADMIN', 'DISTRICT_OFFICIAL', 'PUBLIC'],
      default: 'PUBLIC',
      index: true,
    },
    assignedDistrict: { type: String, trim: true },
    assignedDistrictId: { type: Number },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

// The Single Authorized Admin Email configured in backend environment
export const ADMIN_EMAIL = (config.auth.adminEmail || 'admin@cycloneguard.tn.gov.in').toLowerCase().trim();

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  assignedDistrict?: string;
  assignedDistrictId?: number;
  phone?: string;
}

// In-Memory store for newly registered public citizens (persists across runtime without requiring active Mongo)
export const IN_MEMORY_REGISTERED_USERS: SeedUser[] = [];

export interface DistrictOfficerAccountDef {
  districtId: number;
  districtName: string;
  name: string;
  email: string;
  aliases?: string[];
  passwordPlain: string;
  phone: string;
}

// Authoritative Baseline Demonstration Accounts for All 14 Tamil Nadu Coastal Districts
export const DISTRICT_OFFICER_DEFS: DistrictOfficerAccountDef[] = [
  {
    districtId: 1,
    districtName: 'Tiruvallur',
    name: 'Tiruvallur District Revenue Officer',
    email: 'tiruvallur.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Tiruvallur@Guard2026!',
    phone: '+91-044-27664177',
  },
  {
    districtId: 2,
    districtName: 'Chennai',
    name: 'Chennai District Revenue Officer',
    email: 'chennai.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Chennai@Guard2026!',
    phone: '+91-94440-12345',
  },
  {
    districtId: 3,
    districtName: 'Chengalpattu',
    name: 'Chengalpattu Coastal Zonal Officer',
    email: 'chengalpattu.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Chengalpattu@Guard2026!',
    phone: '+91-044-27427412',
  },
  {
    districtId: 4,
    districtName: 'Villupuram',
    name: 'Villupuram Disaster Relief Officer',
    email: 'villupuram.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Villupuram@Guard2026!',
    phone: '+91-04146-223265',
  },
  {
    districtId: 5,
    districtName: 'Cuddalore',
    name: 'Cuddalore Disaster Operations Officer',
    email: 'cuddalore.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Cuddalore@Guard2026!',
    phone: '+91-04142-221528',
  },
  {
    districtId: 6,
    districtName: 'Mayiladuthurai',
    name: 'Mayiladuthurai Coastal Relief Officer',
    email: 'mayiladuthurai.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Mayiladuthurai@Guard2026!',
    phone: '+91-04364-222222',
  },
  {
    districtId: 7,
    districtName: 'Nagapattinam',
    name: 'Nagapattinam Disaster Zonal Officer',
    email: 'nagai.officer@cycloneguard.tn.gov.in',
    aliases: ['nagapattinam.officer@cycloneguard.tn.gov.in'],
    passwordPlain: 'Nagai@Guard2026!',
    phone: '+91-94431-34567',
  },
  {
    districtId: 8,
    districtName: 'Tiruvarur',
    name: 'Tiruvarur Coastal Relief Incharge',
    email: 'tiruvarur.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Tiruvarur@Guard2026!',
    phone: '+91-04366-226622',
  },
  {
    districtId: 9,
    districtName: 'Thanjavur',
    name: 'Thanjavur Delta Zone Relief Officer',
    email: 'thanjavur.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Thanjavur@Guard2026!',
    phone: '+91-04362-230121',
  },
  {
    districtId: 10,
    districtName: 'Pudukkottai',
    name: 'Pudukkottai Coastal Sector Officer',
    email: 'pudukkottai.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Pudukkottai@Guard2026!',
    phone: '+91-04322-222222',
  },
  {
    districtId: 11,
    districtName: 'Ramanathapuram',
    name: 'Ramanathapuram Island Relief Officer',
    email: 'ramanathapuram.officer@cycloneguard.tn.gov.in',
    aliases: ['ramnad.officer@cycloneguard.tn.gov.in'],
    passwordPlain: 'Ramanathapuram@Guard2026!',
    phone: '+91-04567-230060',
  },
  {
    districtId: 12,
    districtName: 'Thoothukudi',
    name: 'Thoothukudi Port Disaster Officer',
    email: 'thoothukudi.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Thoothukudi@Guard2026!',
    phone: '+91-0461-2340101',
  },
  {
    districtId: 13,
    districtName: 'Tirunelveli',
    name: 'Tirunelveli Coastal Corridor Officer',
    email: 'tirunelveli.officer@cycloneguard.tn.gov.in',
    passwordPlain: 'Tirunelveli@Guard2026!',
    phone: '+91-0462-2500828',
  },
  {
    districtId: 14,
    districtName: 'Kanniyakumari',
    name: 'Kanniyakumari Cape Disaster Officer',
    email: 'kanniyakumari.officer@cycloneguard.tn.gov.in',
    aliases: ['kanyakumari.officer@cycloneguard.tn.gov.in'],
    passwordPlain: 'Kanniyakumari@Guard2026!',
    phone: '+91-04652-278080',
  },
];

// Hash admin & citizen baseline passwords
const adminCreds = hashPassword(config.auth.adminPassword || 'Admin@Cyclone2026!');
const publicCreds = hashPassword('Public@View2026!');

// Construct full list of SEED_USERS
const allSeedUsers: SeedUser[] = [
  // 1. Single Authorized Admin Account
  {
    id: 'usr-admin-01',
    name: 'State Disaster Operations Chief (Admin)',
    email: ADMIN_EMAIL,
    passwordHash: adminCreds.hash,
    passwordSalt: adminCreds.salt,
    role: 'ADMIN',
    assignedDistrict: 'ALL',
    phone: '+91-044-25619206',
  },
  // 2. Demonstration Public Citizen Observer
  {
    id: 'usr-public-01',
    name: 'Citizen Observer (Public)',
    email: 'citizen@tn.gov.in',
    passwordHash: publicCreds.hash,
    passwordSalt: publicCreds.salt,
    role: 'PUBLIC',
    phone: '+91-98840-00000',
  },
];

// 3. Populate all 14 Coastal District Officers
DISTRICT_OFFICER_DEFS.forEach((d) => {
  const creds = hashPassword(d.passwordPlain);
  const officerUser: SeedUser = {
    id: `usr-officer-${d.districtId}`,
    name: d.name,
    email: d.email.toLowerCase(),
    passwordHash: creds.hash,
    passwordSalt: creds.salt,
    role: 'DISTRICT_OFFICIAL',
    assignedDistrict: d.districtName,
    assignedDistrictId: d.districtId,
    phone: d.phone,
  };
  allSeedUsers.push(officerUser);

  // Register aliases if any (e.g. nagapattinam.officer@cycloneguard.tn.gov.in)
  if (d.aliases) {
    d.aliases.forEach((alias, aIdx) => {
      allSeedUsers.push({
        id: `usr-officer-${d.districtId}-alias-${aIdx + 1}`,
        name: d.name,
        email: alias.toLowerCase(),
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        role: 'DISTRICT_OFFICIAL',
        assignedDistrict: d.districtName,
        assignedDistrictId: d.districtId,
        phone: d.phone,
      });
    });
  }
});

export const SEED_USERS: SeedUser[] = allSeedUsers;
