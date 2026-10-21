import crypto from 'crypto';
import { config } from '../config/env';

const JWT_SECRET = process.env.JWT_SECRET || 'cycloneguard-ultra-secure-hmac-sha256-secret-key-2026';

export interface UserTokenPayload {
  userId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DISTRICT_OFFICIAL' | 'PUBLIC';
  assignedDistrict?: string;
  assignedDistrictId?: number;
  exp: number; // Unix timestamp in seconds
  iat: number;
}

/**
 * Hash password using PBKDF2 with SHA-512 and random salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify password against salt and hash using timing-safe comparison
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const derived = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  const bufferA = Buffer.from(derived, 'hex');
  const bufferB = Buffer.from(storedHash, 'hex');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Encode base64url string
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Decode base64url string
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Signs a cryptographic JWT-compatible token using HMAC-SHA256
 */
export function signToken(
  user: {
    userId: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'DISTRICT_OFFICIAL' | 'PUBLIC';
    assignedDistrict?: string;
    assignedDistrictId?: number;
  },
  expiresInSeconds = 24 * 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: UserTokenPayload = {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    assignedDistrict: user.assignedDistrict,
    assignedDistrictId: user.assignedDistrictId,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 signed token
 */
export function verifyToken(token: string): { valid: boolean; payload?: UserTokenPayload; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token structure' };
    }

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payloadJson = base64UrlDecode(payloadB64);
    const payload: UserTokenPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Token verification failed' };
  }
}
