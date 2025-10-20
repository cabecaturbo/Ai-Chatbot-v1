import { Request, Response, NextFunction } from 'express';
import { getTenantByAccountId } from '../tools/db';

// Simplified tenant info interface
export interface SimplifiedTenantInfo {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  papercupsAccountId: string;
  papercupsInboxId?: string;
  isActive: boolean;
}

// Extend Express Request type to include simplified tenant info
declare global {
  namespace Express {
    interface Request {
      simplifiedTenant?: SimplifiedTenantInfo;
    }
  }
}

// AuthenticatedRequest interface removed to avoid conflicts with existing Request type

// Middleware to authenticate using Papercups account tokens
async function authenticateAccountToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const accountToken = req.headers['x-api-key'] as string;
    
    if (!accountToken) {
      res.status(401).json({ 
        error: 'Account token required',
        message: 'Please provide your Papercups account token in the X-API-Key header'
      });
      return;
    }
    
    // Look up tenant by Papercups account ID (which is the same as the token)
    const tenant = await getTenantByAccountId(accountToken);
    
    if (!tenant) {
      res.status(401).json({ 
        error: 'Invalid account token',
        message: 'The provided account token is invalid or not found'
      });
      return;
    }
    
    if (!tenant.is_active) {
      res.status(403).json({ 
        error: 'Tenant inactive',
        message: 'Your subscription is not active. Please contact support.'
      });
      return;
    }
    
    // Attach simplified tenant info to request
    req.simplifiedTenant = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      subscriptionStatus: tenant.subscription_status,
      subscriptionPlan: tenant.subscription_plan,
      papercupsAccountId: tenant.papercups_account_id,
      papercupsInboxId: tenant.papercups_inbox_id,
      isActive: tenant.is_active
    };
    
    next();
  } catch (error) {
    console.error('Account token authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
}

// Optional authentication middleware (doesn't fail if no token)
async function optionalAccountTokenAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const accountToken = req.headers['x-api-key'] as string;
    
    if (accountToken) {
      const tenant = await getTenantByAccountId(accountToken);
      if (tenant && tenant.is_active) {
        req.simplifiedTenant = {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          subscriptionStatus: tenant.subscription_status,
          subscriptionPlan: tenant.subscription_plan,
          papercupsAccountId: tenant.papercups_account_id,
          papercupsInboxId: tenant.papercups_inbox_id,
          isActive: tenant.is_active
        };
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional account token authentication error:', error);
    // Continue without authentication for optional auth
    next();
  }
}

// Middleware to check subscription status
function requireActiveSubscription(req: Request, res: Response, next: NextFunction): void {
  if (!req.simplifiedTenant) {
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please authenticate first'
    });
    return;
  }
  
  if (req.simplifiedTenant.subscriptionStatus !== 'active' && req.simplifiedTenant.subscriptionStatus !== 'trial') {
    res.status(403).json({ 
      error: 'Subscription required',
      message: 'An active subscription is required for this feature'
    });
    return;
  }
  
  next();
}

// Middleware to check specific subscription plan
function requirePlan(requiredPlan: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.simplifiedTenant) {
      res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
      return;
    }
    
    const planHierarchy = ['basic', 'pro', 'enterprise'];
    const tenantPlanIndex = planHierarchy.indexOf(req.simplifiedTenant.subscriptionPlan);
    const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
    
    if (tenantPlanIndex < requiredPlanIndex) {
      res.status(403).json({ 
        error: 'Plan upgrade required',
        message: `This feature requires a ${requiredPlan} plan or higher`
      });
      return;
    }
    
    next();
  };
}

export {
  authenticateAccountToken,
  optionalAccountTokenAuth,
  requireActiveSubscription,
  requirePlan
};

// SimplifiedTenantInfo is already exported above
