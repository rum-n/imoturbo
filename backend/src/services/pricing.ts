import pricingConfig from "../config/pricing.json" with { type: "json" };
import type { ListingInput, PriceTruth } from "../types.js";

type PricingRange = {
  avg: number;
  min: number;
  max: number;
};

const ranges = pricingConfig as Record<string, PricingRange>;

const aliases: Record<string, string> = {
  "doktorski pametnik": "Докторски паметник",
  "ivan vazov": "Иван Вазов",
  "izgrev": "Изгрев",
  "yuzhen park": "Южен парк",
  "iuzhen park": "Южен парк",
  "yavorov": "Яворов",
  "meditsinska akademiya": "Медицинска академия",
  "medical academy": "Медицинска академия",
  "iztok": "Изток",
  "lozenets": "Лозенец",
  "oborishte": "Оборище",
  "geo milev": "Гео Милев",
  "geo-milev": "Гео Милев",
  "hladilnika": "Хладилника",
  "hipodruma": "Хиподрума",
  "zona b 5 3": "Зона Б-5-3",
  "center": "Център",
  "tsentar": "Център",
  "dianabad": "Дианабад",
  "belite brezi": "Белите брези",
  "borovo": "Борово",
  "gotse delchev": "Гоце Делчев",
  "musagenitsa": "Мусагеница",
  "strelbishte": "Стрелбище",
  "reduta": "Редута",
  "gevgelijski": "Гевгелийски",
  "gevgelijskiy": "Гевгелийски",
  "krastova vada": "Кръстова вада",
  "krasno selo": "Красно село",
  "lagera": "Лагера",
  "zapaden park": "Западен парк",
  "mladost 1a": "Младост 1А",
  "mladost 1": "Младост 1",
  "mladost 2": "Младост 2",
  "mladost 3": "Младост 3",
  "mladost 4": "Младост 4",
  "manastirski livadi": "Манастирски ливади",
  "sveta troitsa": "Света Троица",
  "krasna polyana 1": "Красна поляна 1",
  "krasna polyana 2": "Красна поляна 2",
  "krasna polyana 3": "Красна поляна 3",
  "bukston": "Бъкстон",
  "buxton": "Бъкстон",
  "poduyane": "Подуяне",
  "ilinden": "Илинден",
  "razsadnika": "Разсадника",
  "pavlovo": "Павлово",
  "poligona": "Полигона",
  "vitosha": "Витоша",
  "slatina": "Слатина",
  "darvenitsa": "Дървеница",
  "durvenitsa": "Дървеница",
  "banishora": "Банишора",
  "studentski grad": "Студентски град",
  "serdika": "Сердика",
  "svoboda": "Свобода",
  "suhata reka": "Сухата река",
  "nadezhda 1": "Надежда 1",
  "nadezhda 2": "Надежда 2",
  "nadezhda 3": "Надежда 3",
  "nadezhda 4": "Надежда 4",
  "druzhba 1": "Дружба 1",
  "druzhba 2": "Дружба 2",
  "hadzhi dimitar": "Хаджи Димитър",
  "lyulin center": "Люлин - център",
  "lyulin centar": "Люлин - център",
  "lyulin 1": "Люлин 1",
  "lyulin 2": "Люлин 2",
  "lyulin 3": "Люлин 3",
  "lyulin 4": "Люлин 4",
  "lyulin 5": "Люлин 5",
  "lyulin 6": "Люлин 6",
  "lyulin 7": "Люлин 7",
  "lyulin 8": "Люлин 8",
  "lyulin 9": "Люлин 9",
  "lyulin 10": "Люлин 10",
  "knyazhevo": "Княжево",
  "fondovi zhilishta": "Фондови жилища",
  "tolstoy": "Толстой",
  "vrabnitsa 1": "Връбница 1",
  "vrabnitsa 2": "Връбница 2",
  "slavia": "Славия",
  "ovcha kupel 1": "Овча купел 1",
  "ovcha kupel 2": "Овча купел 2",
  "ovcha kupel": "Овча купел",
  "zaharna fabrika": "Захарна фабрика",
  "obelya 1": "Обеля 1",
  "obelya 2": "Обеля 2",
  "obelya": "Обеля",
  "levski g": "Левски Г",
  "levski v": "Левски В",
  "levski": "Левски"
};

const defaultRange: PricingRange = { avg: 2400, min: 2232, max: 2568 };

function normalizeComparableText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/а/g, "а")
    .replace(/[.,;:()"'“”„]/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAreaName(raw?: string): string {
  if (!raw) return "Unknown Sofia area";
  const lower = normalizeComparableText(raw);
  const entries = Object.keys(ranges).sort((a, b) => b.length - a.length);
  for (const area of entries) {
    if (lower.includes(normalizeComparableText(area))) return area;
  }
  for (const [needle, area] of Object.entries(aliases)) {
    if (lower.includes(needle)) return area;
  }
  return "Unknown Sofia area";
}

export function inferArea(listing: ListingInput): { name: string; score: number } {
  const primaryText = `${listing.district ?? ""} ${listing.areaText ?? ""} ${listing.title}`;
  const primary = normalizeAreaName(primaryText);
  if (primary !== "Unknown Sofia area") {
    return { name: primary, score: ranges[primary] ? 0.86 : 0.45 };
  }

  const normalized = normalizeAreaName(listing.description);
  return {
    name: normalized,
    score: ranges[normalized] ? 0.58 : 0.35
  };
}

export function getPricingRange(area: string): PricingRange {
  return ranges[area] ?? defaultRange;
}

export function priceInEur(listing: ListingInput): number | null {
  if (!listing.price || listing.price <= 0) return null;
  return listing.currency === "BGN" ? Math.round(listing.price / 1.95583) : listing.price;
}

export function eurPerSqm(listing: ListingInput): number | null {
  const price = priceInEur(listing);
  if (!price || !listing.sqm || listing.sqm <= 0) return null;
  return Math.round(price / listing.sqm);
}

export function calculatePriceTruth(listing: ListingInput): PriceTruth {
  const area = inferArea(listing);
  const fair = getPricingRange(area.name);
  const eurSqm = eurPerSqm(listing);
  const midpoint = fair.avg;
  const overpricedPct = eurSqm ? Math.round(((eurSqm - midpoint) / midpoint) * 100) : 0;

  let confidence = area.score;
  if (eurSqm) confidence += 0.1;
  if (listing.sqm) confidence += 0.06;
  if (listing.description && listing.description.length > 180) confidence += 0.04;

  return {
    district: area.name,
    eur_per_sqm: eurSqm,
    fair_min: fair.min,
    fair_max: fair.max,
    overpriced_pct: overpricedPct,
    confidence: Math.min(0.92, Math.max(0.25, Number(confidence.toFixed(2))))
  };
}
