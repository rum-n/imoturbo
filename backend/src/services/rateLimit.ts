import type { NextFunction, Request, Response } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const windowMs = 60 * 1000;
const maxRequests = 20;

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  if (bucket.count >= maxRequests) {
    res.status(429).json({ error: "Too many analysis requests. Try again shortly." });
    return;
  }

  bucket.count += 1;
  next();
}
