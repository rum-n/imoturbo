export type ListingInput = {
  url: string;
  site: "imot.bg";
  title: string;
  price?: number;
  currency?: "EUR" | "BGN";
  sqm?: number;
  floor?: string;
  district?: string;
  areaText?: string;
  description?: string;
  photos?: string[];
  sellerType?: string;
  broker?: string;
};

export type PriceTruth = {
  district: string;
  eur_per_sqm: number | null;
  fair_min: number;
  fair_max: number;
  overpriced_pct: number;
  confidence: number;
};

export type StaleListing = {
  visits: number;
  days_seen: number;
  first_seen?: string;
  last_seen?: string;
  message: string;
  likely_negotiable: boolean;
};

export type DuplicateSignal = {
  is_duplicate: boolean;
  confidence: number;
  matches: Array<{
    url: string;
    title: string;
    seen_at: string;
  }>;
};

export type BudgetEstimate = {
  asking: number;
  notary_and_taxes: number;
  broker_commission: number;
  renovation: number;
  total: number;
  notes: string[];
};

export type AnalysisResult = {
  score: number;
  asking_price: number;
  currency: "EUR" | "BGN";
  fair_range: {
    min: number;
    max: number;
  };
  status: string;
  price_truth: PriceTruth;
  red_flags: string[];
  good_signs: string[];
  bullshit_warnings: string[];
  negotiation_points: string[];
  questions_to_ask: string[];
  budget_estimate: BudgetEstimate;
  offer_strategy: string;
  stale_listing: StaleListing;
  duplicate_signal: DuplicateSignal;
  duplicate_flag: boolean;
  cached?: boolean;
};
