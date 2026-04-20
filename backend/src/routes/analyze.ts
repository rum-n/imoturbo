import { Router } from "express";
import { z } from "zod";
import { analyzeListing } from "../services/ai.js";
import { analysisCacheKey, TtlCache } from "../services/cache.js";
import type { AnalysisResult } from "../types.js";

const listingSchema = z.object({
  url: z.string().url(),
  site: z.literal("imot.bg"),
  title: z.string().min(1),
  price: z.number().positive().optional(),
  currency: z.enum(["EUR", "BGN"]).optional(),
  sqm: z.number().positive().optional(),
  floor: z.string().optional(),
  district: z.string().optional(),
  areaText: z.string().optional(),
  description: z.string().optional(),
  photos: z.array(z.string().url()).max(20).optional(),
  sellerType: z.string().optional(),
  broker: z.string().optional()
});

const cache = new TtlCache<AnalysisResult>();

export const analyzeRouter = Router();

analyzeRouter.post("/", async (req, res, next) => {
  try {
    const listing = listingSchema.parse(req.body);
    const key = analysisCacheKey(listing.url, listing.price, listing.sqm);
    const cached = cache.get(key);

    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    const result = await analyzeListing(listing);
    cache.set(key, result);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid listing payload", details: error.flatten() });
      return;
    }
    next(error);
  }
});
