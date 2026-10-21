import { Request, Response } from 'express';
import {
  User,
  SEED_USERS,
  SeedUser,
  ADMIN_EMAIL,
  IN_MEMORY_REGISTERED_USERS,
  DISTRICT_OFFICER_DEFS,
} from '../models/UserModel';
import { verifyPassword, signToken, hashPassword } from '../utils/cryptoAuth';
import { recordAuditLog, IN_MEMORY_AUDIT_LOGS, AuditLog } from '../models/AuditLogModel';
import { mongoDbService } from '../config/mongodb';

export class AuthController {
  /**
   * POST /api/auth/login
   * Cryptographically verifies password using PBKDF2 with SHA-512 and random salt
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Both email and password are required.',
        });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      let matchedUser: SeedUser | null = null;

      // 1. Check MongoDB if connected
      if (mongoDbService.isMongoConnected()) {
        try {
          const dbUser = await User.findOne({ email: cleanEmail });
          if (dbUser) {
            matchedUser = {
              id: dbUser._id.toString(),
              name: dbUser.name,
              email: dbUser.email,
              passwordHash: dbUser.passwordHash,
              passwordSalt: dbUser.passwordSalt,
              role: dbUser.role,
              assignedDistrict: dbUser.assignedDistrict,
              assignedDistrictId: dbUser.assignedDistrictId,
              phone: dbUser.phone,
            };
          }
        } catch (err) {
          // Fallback to in-memory accounts
        }
      }

      // 2. Check Seed Users if not found in MongoDB
      if (!matchedUser) {
        const seed = SEED_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
        if (seed) {
          matchedUser = seed;
        }
      }

      // 3. Check In-Memory Registered Citizens
      if (!matchedUser) {
        const registered = IN_MEMORY_REGISTERED_USERS.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        if (registered) {
          matchedUser = registered;
        }
      }

      if (!matchedUser) {
        recordAuditLog({
          actorEmail: cleanEmail,
          actorRole: 'UNKNOWN',
          action: 'LOGIN_FAILED',
          targetResource: '/api/auth/login',
          status: 'DENIED',
          details: 'User account not found',
          ipAddress: req.ip || req.socket.remoteAddress,
        });

        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
        return;
      }

      // Security check: Only the single authorized Admin email can authenticate with role ADMIN
      if (matchedUser.role === 'ADMIN' && matchedUser.email.toLowerCase() !== ADMIN_EMAIL) {
        recordAuditLog({
          actorEmail: cleanEmail,
          actorRole: 'ADMIN',
          action: 'PRIVILEGE_ESCALATION_BLOCKED',
          targetResource: '/api/auth/login',
          status: 'DENIED',
          details: `Unauthorized attempt to assume ADMIN role by non-admin email ${cleanEmail}`,
          ipAddress: req.ip || req.socket.remoteAddress,
        });

        res.status(403).json({
          success: false,
          message: 'Access Denied: This account is not authorized for administrative privileges.',
        });
        return;
      }

      // Verify password with timing-safe comparison
      const isMatch = verifyPassword(password, matchedUser.passwordSalt, matchedUser.passwordHash);
      if (!isMatch) {
        recordAuditLog({
          actorEmail: cleanEmail,
          actorRole: matchedUser.role,
          action: 'LOGIN_FAILED',
          targetResource: '/api/auth/login',
          status: 'DENIED',
          details: 'Incorrect password supplied',
          ipAddress: req.ip || req.socket.remoteAddress,
        });

        res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
        return;
      }

      // Generate signed JWT token
      const token = signToken({
        userId: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        assignedDistrict: matchedUser.assignedDistrict,
        assignedDistrictId: matchedUser.assignedDistrictId,
      });

      recordAuditLog({
        actorEmail: matchedUser.email,
        actorRole: matchedUser.role,
        action: 'LOGIN_SUCCESS',
        targetResource: '/api/auth/login',
        targetDistrict: matchedUser.assignedDistrict,
        status: 'SUCCESS',
        details: `Session established. Role: ${matchedUser.role}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.json({
        success: true,
        message: 'Authentication successful.',
        token,
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email,
          role: matchedUser.role,
          assignedDistrict: matchedUser.assignedDistrict,
          assignedDistrictId: matchedUser.assignedDistrictId,
          phone: matchedUser.phone,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/auth/register
   * Open public citizen registration. Anyone can register using personal email.
   * Automatically enforces role: 'PUBLIC'. Blocks admin registration and privilege escalation.
   */
  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, phone } = req.body;

      // 1. Validation
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          success: false,
          message: 'Full name is required for registration.',
          code: 'NAME_REQUIRED',
        });
        return;
      }

      if (!email || typeof email !== 'string' || !email.trim()) {
        res.status(400).json({
          success: false,
          message: 'Email address is required.',
          code: 'EMAIL_REQUIRED',
        });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // Standard email regex — allows ANY personal or corporate email domain (e.g. gmail.com, yahoo.com, outlook.com, etc.)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid personal email address (e.g., citizen@gmail.com).',
          code: 'INVALID_EMAIL_FORMAT',
        });
        return;
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters in length.',
          code: 'WEAK_PASSWORD',
        });
        return;
      }

      // 2. Strict Single Admin Protection: Never allow registering as or with the authorized Admin email
      if (cleanEmail === ADMIN_EMAIL) {
        recordAuditLog({
          actorEmail: cleanEmail,
          actorRole: 'ANONYMOUS',
          action: 'ADMIN_REGISTRATION_ATTEMPT_BLOCKED',
          targetResource: '/api/auth/register',
          status: 'DENIED',
          details: 'Public registration attempt using pre-configured Admin email',
          ipAddress: req.ip || req.socket.remoteAddress,
        });

        res.status(403).json({
          success: false,
          message: 'The administrative account is uniquely reserved and cannot be created via public registration.',
          code: 'ADMIN_REGISTRATION_PROHIBITED',
        });
        return;
      }

      // 3. Duplicate check across seeds and in-memory accounts
      const existingInSeeds = SEED_USERS.some((u) => u.email.toLowerCase() === cleanEmail);
      const existingInRegistered = IN_MEMORY_REGISTERED_USERS.some(
        (u) => u.email.toLowerCase() === cleanEmail
      );

      if (existingInSeeds || existingInRegistered) {
        res.status(400).json({
          success: false,
          message: 'An account with this email address already exists. Please sign in.',
          code: 'EMAIL_ALREADY_EXISTS',
        });
        return;
      }

      // 4. Duplicate check in MongoDB if connected
      if (mongoDbService.isMongoConnected()) {
        try {
          const dbExists = await User.findOne({ email: cleanEmail });
          if (dbExists) {
            res.status(400).json({
              success: false,
              message: 'An account with this email address already exists. Please sign in.',
              code: 'EMAIL_ALREADY_EXISTS',
            });
            return;
          }
        } catch (err) {
          // Continue to in-memory fallback
        }
      }

      // 5. Hash password with PBKDF2/SHA-512
      const { hash, salt } = hashPassword(password);

      // 6. Citizen role is strictly enforced — client cannot request Admin or Officer roles
      const citizenUser: SeedUser = {
        id: `usr-citizen-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: name.trim(),
        email: cleanEmail,
        passwordHash: hash,
        passwordSalt: salt,
        role: 'PUBLIC', // Automatically assigned PUBLIC role
        phone: phone ? phone.trim() : undefined,
      };

      // Save in memory
      IN_MEMORY_REGISTERED_USERS.push(citizenUser);

      // Save in MongoDB if online
      if (mongoDbService.isMongoConnected()) {
        try {
          await User.create({
            name: citizenUser.name,
            email: citizenUser.email,
            passwordHash: hash,
            passwordSalt: salt,
            role: 'PUBLIC',
            phone: citizenUser.phone,
          });
        } catch (err: any) {
          console.warn('[Auth] Mongo registration write skipped:', err.message);
        }
      }

      // 7. Generate JWT token for immediate citizen session
      const token = signToken({
        userId: citizenUser.id,
        name: citizenUser.name,
        email: citizenUser.email,
        role: 'PUBLIC',
      });

      recordAuditLog({
        actorEmail: citizenUser.email,
        actorRole: 'PUBLIC',
        action: 'CITIZEN_REGISTRATION',
        targetResource: '/api/auth/register',
        status: 'SUCCESS',
        details: 'New public citizen account registered successfully',
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.status(201).json({
        success: true,
        message: 'Citizen registration successful. Welcome to CycloneGuard Public Portal.',
        token,
        user: {
          id: citizenUser.id,
          name: citizenUser.name,
          email: citizenUser.email,
          role: 'PUBLIC',
          phone: citizenUser.phone,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Internal server error during citizen registration.',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/auth/me
   */
  public async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    res.json({
      success: true,
      user: req.user,
    });
  }

  /**
   * POST /api/auth/logout
   */
  public async logout(req: Request, res: Response): Promise<void> {
    if (req.user) {
      recordAuditLog({
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'LOGOUT',
        targetResource: '/api/auth/logout',
        status: 'SUCCESS',
        ipAddress: req.ip || req.socket.remoteAddress,
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  /**
   * GET /api/auth/demo-accounts
   * Returns list of authorized demonstration accounts covering all 14 coastal districts
   */
  public async getDemoAccounts(req: Request, res: Response): Promise<void> {
    const officerAccounts = DISTRICT_OFFICER_DEFS.map((d) => ({
      role: 'DISTRICT_OFFICIAL',
      name: d.name,
      email: d.email,
      samplePassword: d.passwordPlain,
      jurisdiction: `${d.districtName} District Only (ID: ${d.districtId})`,
      permissions: `Operational modifications restricted to ${d.districtName} district shelters and supplies`,
    }));

    res.json({
      success: true,
      description: 'Authorized test accounts for college project review & evaluation',
      accounts: [
        {
          role: 'ADMIN',
          name: 'State Disaster Operations Chief',
          email: ADMIN_EMAIL,
          samplePassword: 'Admin@Cyclone2026!',
          jurisdiction: 'Statewide (All 14 Coastal Districts)',
          permissions: 'Full administrative access, user management, transfer approvals, inventory control',
        },
        ...officerAccounts,
        {
          role: 'PUBLIC',
          name: 'Citizen Observer',
          email: 'citizen@tn.gov.in',
          samplePassword: 'Public@View2026!',
          jurisdiction: 'Citizen Read-Only Access',
          permissions: 'View live weather, cyclone alerts, hazard scores, and shelter locations',
        },
      ],
    });
  }

  /**
   * GET /api/audit-logs
   * Admin-only retrieval of security and operational audit trail
   */
  public async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      if (mongoDbService.isMongoConnected()) {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
        if (logs.length > 0) {
          res.json({
            success: true,
            source: 'MongoDB Atlas Audit Trail',
            count: logs.length,
            data: logs,
          });
          return;
        }
      }

      res.json({
        success: true,
        source: 'CycloneGuard In-Memory Audit Trail Buffer',
        count: IN_MEMORY_AUDIT_LOGS.length,
        data: IN_MEMORY_AUDIT_LOGS,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs',
        error: error.message,
      });
    }
  }
}

export const authController = new AuthController();
