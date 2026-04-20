import type { AnalysisResult, DuplicateSignal, HistoryItem, ListingPayload, StaleListing } from "./types";

const HISTORY_KEY = "imoturbo.history";
const SETTINGS_KEY = "imoturbo.settings";
const MAX_HISTORY = 100;

export type Settings = {
  backendUrl: string;
};

export const defaultSettings: Settings = {
  backendUrl: "http://localhost:8787"
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaultSettings, ...(stored[SETTINGS_KEY] ?? {}) };
}

export async function setSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getHistory(): Promise<HistoryItem[]> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  return Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] : [];
}

function signatureText(value?: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 10)
    .join(" ");
}

function overlapScore(a: string, b: string): number {
  const left = new Set(a.split(/\s+/).filter(Boolean));
  const right = new Set(b.split(/\s+/).filter(Boolean));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) {
    if (right.has(word)) shared += 1;
  }
  return shared / Math.max(left.size, right.size);
}

function daysBetween(first: Date, last: Date): number {
  return Math.max(0, Math.round((last.getTime() - first.getTime()) / 86_400_000));
}

export function buildStaleListing(listing: ListingPayload, history: HistoryItem[]): StaleListing {
  const sameUrl = history.filter((item) => item.url === listing.url);
  const now = new Date();
  const dates = sameUrl.map((item) => new Date(item.createdAt)).filter((date) => !Number.isNaN(date.getTime()));
  dates.push(now);
  const first = new Date(Math.min(...dates.map((date) => date.getTime())));
  const last = new Date(Math.max(...dates.map((date) => date.getTime())));
  const visits = sameUrl.length + 1;
  const daysSeen = daysBetween(first, last);

  if (visits >= 3 || daysSeen >= 21) {
    return {
      visits,
      days_seen: daysSeen,
      first_seen: first.toISOString(),
      last_seen: last.toISOString(),
      message: `Seen before ${visits} times in ${daysSeen} days`,
      likely_negotiable: true
    };
  }

  return {
    visits,
    days_seen: daysSeen,
    first_seen: first.toISOString(),
    last_seen: last.toISOString(),
    message: visits > 1 ? `Seen before ${visits} times` : "First time seen in this browser",
    likely_negotiable: false
  };
}

export function buildDuplicateSignal(listing: ListingPayload, history: HistoryItem[]): DuplicateSignal {
  const title = signatureText(listing.title);
  const district = signatureText(listing.district || listing.areaText);
  const price = listing.price ?? 0;
  const sqm = listing.sqm ?? 0;

  const matches = history
    .filter((item) => item.url !== listing.url)
    .map((item) => {
      const other = item.listing ?? ({ title: item.title, url: item.url } as ListingPayload);
      const titleScore = overlapScore(title, signatureText(other.title));
      const districtScore = overlapScore(district, signatureText(other.district || other.areaText));
      const sqmMatch = sqm > 0 && other.sqm ? Math.abs(other.sqm - sqm) <= Math.max(2, sqm * 0.03) : false;
      const priceMatch =
        price > 0 && other.price ? Math.abs(other.price - price) <= Math.max(5000, price * 0.04) : false;
      const score = titleScore * 0.35 + districtScore * 0.2 + (sqmMatch ? 0.25 : 0) + (priceMatch ? 0.2 : 0);
      return { item, score };
    })
    .filter(({ score }) => score >= 0.68)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    is_duplicate: matches.length > 0,
    confidence: matches[0] ? Number(matches[0].score.toFixed(2)) : 0,
    matches: matches.map(({ item }) => ({
      url: item.url,
      title: item.title,
      seen_at: item.createdAt
    }))
  };
}

export async function enrichWithLocalSignals(listing: ListingPayload, result: AnalysisResult): Promise<AnalysisResult> {
  const history = await getHistory();
  const stale_listing = buildStaleListing(listing, history);
  const duplicate_signal = buildDuplicateSignal(listing, history);

  return {
    ...result,
    stale_listing,
    duplicate_signal,
    duplicate_flag: duplicate_signal.is_duplicate
  };
}

export async function saveHistoryItem(listing: ListingPayload, result: AnalysisResult): Promise<void> {
  const history = await getHistory();
  const next: HistoryItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    url: listing.url,
    title: listing.title,
    listing,
    createdAt: new Date().toISOString(),
    result
  };
  await chrome.storage.local.set({ [HISTORY_KEY]: [next, ...history].slice(0, MAX_HISTORY) });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] });
}
