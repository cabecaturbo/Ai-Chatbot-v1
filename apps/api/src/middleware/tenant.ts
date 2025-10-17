import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("X-API-Key");
  if (apiKey) {
    const found = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { tenant: { include: { subscription: true, profile: true } } },
    });
    if (found?.tenant) {
      (req as any).tenant = found.tenant;
      return next();
    }
  }
  const websiteId = (req.body && req.body.website_id) || undefined;
  if (websiteId) {
    const tenant = await prisma.tenant.findUnique({
      where: { crispWebsiteId: websiteId },
      include: { subscription: true, profile: true },
    });
    if (tenant) {
      (req as any).tenant = tenant;
      return next();
    }
  }
  return res.status(401).json({ error: "Tenant not found" });
}

export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  const tenant = (req as any).tenant;
  if (!tenant?.subscription || tenant.subscription.status !== "active") {
    return res.status(402).json({ error: "Subscription inactive" });
  }
  next();
}


