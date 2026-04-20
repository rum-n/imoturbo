import OpenAI from "openai";
import type { AnalysisResult, ListingInput } from "../types.js";
import { calculatePriceTruth, priceInEur } from "./pricing.js";

const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const vagueLocationWords = [
  "до метро",
  "near metro",
  "комуникативно",
  "топ локация",
  "excellent location",
  "перфектна локация",
];

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function textFor(listing: ListingInput): string {
  return `${listing.title} ${listing.areaText ?? ""} ${listing.description ?? ""}`.toLowerCase();
}

function detectBullshitWarnings(listing: ListingInput): string[] {
  const text = textFor(listing);
  const warnings: string[] = [];

  if (/\b(luxury|лукс|луксоз)/i.test(text))
    warnings.push(
      '"Лукс" не е подкрепено, освен ако снимките ясно доказват премиум завършване',
    );
  if (/\b(unique|уникал|единствен)/i.test(text))
    warnings.push(
      '"Уникално" е маркетингов език, не доказателство за купувача',
    );
  if (/near metro|до метро|метро/i.test(text))
    warnings.push('"До метро" може да означава 12+ минути пеша');
  if (/investment|инвестици/i.test(text))
    warnings.push(
      '"Инвестиционна възможност" често означава, че продавачът цени бъдещата печалба днес',
    );
  if (
    /sunny|слънчев|южен|юг/i.test(text) &&
    (listing.photos?.length ?? 0) < 5
  ) {
    warnings.push(
      '"Слънчево" се нуждае от снимково доказателство, не само описание',
    );
  }

  return unique(warnings).slice(0, 6);
}

function detectRedFlags(
  listing: ListingInput,
  overpricedPct: number,
): string[] {
  const flags: string[] = [];
  const text = textFor(listing);
  const photoCount = listing.photos?.length ?? 0;
  const descriptionLength = listing.description?.trim().length ?? 0;

  if (photoCount === 0) flags.push("Няма открити снимки");
  if (photoCount > 0 && photoCount < 4)
    flags.push("Твърде малко снимки за оценка на състоянието");
  if (
    !listing.photos?.some((url) =>
      /facade|building|outside|exterior|външ|сграда|blok|block/i.test(url),
    )
  ) {
    flags.push("Няма очевидни снимки на екстериора");
  }
  if (!listing.sqm) flags.push("Квадратните метри не са открити");
  if (!listing.floor) flags.push("Етажът не е посочен");
  if (!listing.areaText && !listing.district)
    flags.push("Местоположението е неясно");
  if (vagueLocationWords.some((word) => text.includes(word)))
    flags.push("Формулировката за местоположение е неясна или рекламна");
  if (overpricedPct >= 8)
    flags.push(`Цената е около ${overpricedPct}% над средната за района`);
  if (descriptionLength < 180) flags.push("Описание с малко информация");
  if (
    /спешно|urgent|само за частни лица|no commission|без комисион/i.test(text)
  )
    flags.push("Подозрителна или натискова формулировка");

  return unique(flags).slice(0, 8);
}

function detectGoodSigns(listing: ListingInput): string[] {
  const text = textFor(listing);
  const signs: string[] = [];

  if (/south|юг|южен|южно/i.test(text)) signs.push("С изглед на юг");
  if (/metro|метро/i.test(text)) signs.push("Близо до метро");
  if (/park|парк/i.test(text)) signs.push("Близо до парк");
  if (/act 16|акт 16/i.test(text)) signs.push("Споменат акт 16");
  if (/renovated|ремонт|обзаведен|furnished/i.test(text))
    signs.push("Предоставени детайли за състоянието");
  if ((listing.photos?.length ?? 0) >= 10)
    signs.push("Предоставени много снимки");

  return unique(signs).slice(0, 6);
}

function calculateScore(
  overpricedPct: number,
  confidence: number,
  redFlags: string[],
  goodSigns: string[],
): number {
  let score = 72;

  if (overpricedPct > 0) score -= Math.min(28, Math.round(overpricedPct * 1.2));
  if (overpricedPct < -4) score += Math.min(12, Math.abs(overpricedPct));
  score += Math.round((confidence - 0.5) * 16);
  score += goodSigns.length * 3;
  score -= redFlags.length * 4;

  return Math.max(0, Math.min(100, score));
}

function statusFor(overpricedPct: number): string {
  if (overpricedPct >= 5) return `Вероятно надценено (+${overpricedPct}%)`;
  if (overpricedPct <= -7)
    return `Възможно под пазарната цена (${overpricedPct}%)`;
  return "В рамките на справедливия диапазон";
}

function buildOfferStrategy(
  listing: ListingInput,
  fairMin: number,
  fairMax: number,
  overpricedPct: number,
): string {
  if (!listing.sqm)
    return "Поискайте липсващите квадратни метри и сравними продадени обяви преди да направите оферта";
  const conservativeFair = ((fairMin + fairMax) / 2) * listing.sqm;
  const openingDiscount =
    overpricedPct > 8 ? 0.9 : overpricedPct > 0 ? 0.93 : 0.96;
  const offer = Math.round((conservativeFair * openingDiscount) / 1000) * 1000;
  return `Опитайте €${offer.toLocaleString()} първо`;
}

function emptyStaleListing() {
  return {
    visits: 1,
    days_seen: 0,
    message: "За първи път видяно в този браузър",
    likely_negotiable: false,
  };
}

function emptyDuplicateSignal() {
  return {
    is_duplicate: false,
    confidence: 0,
    matches: [],
  };
}

function ruleBasedAnalysis(listing: ListingInput): AnalysisResult {
  const priceTruth = calculatePriceTruth(listing);
  const redFlags = detectRedFlags(listing, priceTruth.overpriced_pct);
  const goodSigns = detectGoodSigns(listing);
  const bullshitWarnings = detectBullshitWarnings(listing);
  const askingPrice = priceInEur(listing) ?? listing.price ?? 0;
  const score = calculateScore(
    priceTruth.overpriced_pct,
    priceTruth.confidence,
    redFlags,
    goodSigns,
  );

  return {
    score,
    asking_price: askingPrice,
    currency: "EUR",
    fair_range: {
      min: listing.sqm
        ? Math.round(priceTruth.fair_min * listing.sqm)
        : priceTruth.fair_min,
      max: listing.sqm
        ? Math.round(priceTruth.fair_max * listing.sqm)
        : priceTruth.fair_max,
    },
    status: statusFor(priceTruth.overpriced_pct),
    price_truth: priceTruth,
    red_flags: redFlags,
    good_signs: goodSigns,
    bullshit_warnings: bullshitWarnings,
    offer_strategy: buildOfferStrategy(
      listing,
      priceTruth.fair_min,
      priceTruth.fair_max,
      priceTruth.overpriced_pct,
    ),
    stale_listing: emptyStaleListing(),
    duplicate_signal: emptyDuplicateSignal(),
    duplicate_flag: false,
  };
}

export async function analyzeListing(
  listing: ListingInput,
): Promise<AnalysisResult> {
  const fallback = ruleBasedAnalysis(listing);
  if (!client) return fallback;

  const prompt = [
    "Analyze this Bulgarian apartment listing for buyer intelligence.",
    "Improve only text-derived warnings, good signs, red flags, and offer strategy. Keep numeric pricing from fallback unless clearly impossible.",
    "Return compact JSON matching the system schema.",
    "",
    `Listing: ${JSON.stringify(listing)}`,
    `Fallback: ${JSON.stringify(fallback)}`,
  ].join("\n");

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Imoturbo, a Bulgarian real-estate buyer-intelligence assistant. Output JSON with keys: red_flags[], good_signs[], bullshit_warnings[], offer_strategy. Do not invent exact addresses or map facts.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) return fallback;

    const parsed = JSON.parse(content) as Partial<AnalysisResult>;
    return {
      ...fallback,
      red_flags: Array.isArray(parsed.red_flags)
        ? unique(parsed.red_flags).slice(0, 8)
        : fallback.red_flags,
      good_signs: Array.isArray(parsed.good_signs)
        ? unique(parsed.good_signs).slice(0, 6)
        : fallback.good_signs,
      bullshit_warnings: Array.isArray(parsed.bullshit_warnings)
        ? unique(parsed.bullshit_warnings).slice(0, 6)
        : fallback.bullshit_warnings,
      offer_strategy:
        typeof parsed.offer_strategy === "string"
          ? parsed.offer_strategy
          : fallback.offer_strategy,
    };
  } catch {
    return fallback;
  }
}
