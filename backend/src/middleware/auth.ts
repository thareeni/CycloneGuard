import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserTokenPayload } from '../utils/cryptoAuth';
import { recordAuditLog } from '../models/AuditLogModel';

// Extend Express Request to hold authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
    }
  }
}

/**
 * Extracts and verifies JWT bearer token
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = undefined;
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  const { valid, payload, error } = verifyToken(token);

  if (!valid || !payload) {
    req.user = undefined;
    next();
    return;
  }

  req.user = payload;
  next();
}

/**
 * Enforces that user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    recordAuditLog({
      actorEmail: 'ANONYMOUS',
      actorRole: 'UNAUTHENTICATED',
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      targetResource: req.originalUrl,
      status: 'DENIED',
      details: 'Missing or invalid authentication token',
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid Bearer token.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }
  next();
}

/**
 * Enforces Role-Based Access Control (RBAC)
 */
export function requireRole(...allowedRoles: Array<'ADMIN' | 'DISTRICT_OFFICIAL' | 'PUBLIC'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before role verification.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      recordAuditLog({
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'ROLE_ESCALATION_BLOCKED',
        targetResource: req.originalUrl,
        status: 'DENIED',
        details: `Role '${req.user.role}' lacks permission. Required roles: ${allowedRoles.join(', ')}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.status(403).json({
        success: false,
        message: `Access Forbidden: User role '${req.user.role}' is not authorized for this resource. Required role(s): ${allowedRoles.join(', ')}.`,
        code: 'FORBIDDEN_ROLE',
      });
      return;
    }

    next();
  };
}

/**
 * Enforces District Scoping on writes and modifications.
 * ADMIN has statewide jurisdiction.
 * DISTRICT_OFFICIAL can only modify resources in their assigned district.
 */
export function requireDistrictAccess(
  extractDistrict: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Admins have unrestricted statewide jurisdiction
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // District Officials can only act in their assigned district
    if (req.user.role === 'DISTRICT_OFFICIAL') {
      const targetDistrict = extractDistrict(req);

      if (!targetDistrict || targetDistrict === 'ALL') {
        // If operation touches all districts, District Official cannot perform it
        res.status(403).json({
          success: false,
          message: 'District Officials cannot perform statewide bulk operations. Admin role required.',
          code: 'FORBIDDEN_DISTRICT_SCOPE',
        });
        return;
      }

      const assignedDistrict = req.user.assignedDistrict || '';
      if (assignedDistrict.toLowerCase() !== targetDistrict.toLowerCase()) {
        recordAuditLog({
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: 'CROSS_DISTRICT_VIOLATION_BLOCKED',
          targetResource: req.originalUrl,
          targetDistrict: targetDistrict,
          status: 'DENIED',
          details: `Official assigned to '${assignedDistrict}' attempted unauthorized action in '${targetDistrict}'`,
          ipAddress: req.ip || req.socket.remoteAddress,
        });

        res.status(403).json({
          success: false,
          message: `Access Denied: You are authorized for district '${assignedDistrict}' only; you cannot modify records in '${targetDistrict}'.`,
          code: 'FORBIDDEN_CROSS_DISTRICT',
          assignedDistrict,
          targetDistrict,
        });
        return;
      }

      next();
      return;
    }

    // Public users cannot perform protected operations
    res.status(403).json({
      success: false,
      message: 'Public users cannot modify operational disaster management records.',
      code: 'FORBIDDEN_PUBLIC_ROLE',
    });
  };
}
