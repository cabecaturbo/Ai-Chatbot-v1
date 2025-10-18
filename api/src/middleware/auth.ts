import { Request, Response, NextFunction } from 'express';
import { validateApiKey, hasPermission, isTenantActive, ApiKeyInfo } from '../tools/api_keys';

// Extend Express Request type to include tenant info
declare global {
  namespace Express {
    interface Request {
      tenant?: ApiKeyInfo;
    }
  }
}

interface AuthenticatedRequest extends Request {
  tenant: ApiKeyInfo;
}

// Middleware to authenticate API key and extract tenant information
async function authenticateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({ 
        error: 'API key required',
        message: 'Please provide an API key in the X-API-Key header'
      });
      return;
    }
    
    const keyInfo = await validateApiKey(apiKey);
    
    if (!keyInfo) {
      res.status(401).json({ 
        error: 'Invalid API key',
        message: 'The provided API key is invalid or has been revoked'
      });
      return;
    }
    
    if (!isTenantActive(keyInfo)) {
      res.status(403).json({ 
        error: 'Tenant inactive',
        message: 'Your subscription is not active. Please contact support.'
      });
      return;
    }
    
    // Attach tenant info to request
    req.tenant = keyInfo;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
}

// Middleware to check specific permissions
function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
      return;
    }
    
    if (!hasPermission(req.tenant, permission)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires '${permission}' permission`
      });
      return;
    }
    
    next();
  };
}

// Middleware for admin-only endpoints
function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.tenant) {
    _res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please authenticate first'
    });
    return;
  }
  
  if (!hasPermission(req.tenant, 'admin')) {
    _res.status(403).json({ 
      error: 'Admin access required',
      message: 'This endpoint requires admin privileges'
    });
    return;
  }
  
  next();
}

// Optional authentication middleware (doesn't fail if no API key)
async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (apiKey) {
      const keyInfo = await validateApiKey(apiKey);
      if (keyInfo && isTenantActive(keyInfo)) {
        req.tenant = keyInfo;
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Continue without authentication for optional auth
    next();
  }
}

export {
  authenticateApiKey,
  requirePermission,
  requireAdmin,
  optionalAuth,
  AuthenticatedRequest
};
