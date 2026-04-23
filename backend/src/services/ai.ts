import OpenAI from "openai";
import type { AnalysisResult, BudgetEstimate, ListingInput } from "../types.js";
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
  if (/спешно|urgent|само за частни лица|no commission|без комисион/i.test(text))
    flags.push("Подозрителна или натискова формулировка");
  if (/панел|епк|epk/i.test(text))
    flags.push("Панелна/ЕПК сграда — по-ниска дълготрайност и по-скъпа поддръжка");

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
  if (/тухла|тухлена|brick/i.test(text))
    signs.push("Тухлено строителство — по-добра изолация и дълготрайност");

  return unique(signs).slice(0, 6);
}

function buildQuestionsToAsk(listing: ListingInput): string[] {
  const text = textFor(listing);
  const questions: string[] = [];

  const isNewBuilding = /ново строителство|нова сграда|в строеж|акт 14|акт 15|груб строеж/i.test(text)
    || /\b20(2\d|30)\b/.test(text);
  if (isNewBuilding && !/акт 16/i.test(text))
    questions.push("Издаден ли е Акт 16? Ако не — кога се очаква?");

  if (listing.floor) {
    const floorMatch = listing.floor.match(/(\d+)\s*[/\\]\s*(\d+)/);
    if (floorMatch) {
      const floor = parseInt(floorMatch[1]);
      const total = parseInt(floorMatch[2]);
      if (floor === total && total >= 3)
        questions.push("Кога е правен последен ремонт на покрива?");
      if (floor === 1)
        questions.push("Има ли влага по стените или мазето?");
    }
    if (/партер|приземен/.test(listing.floor.toLowerCase()))
      questions.push("Има ли влага по стените или мазето?");
  }

  if (/панел|епк|epk/i.test(text))
    questions.push("Санирана ли е сградата? Има ли планирано саниране?");

  if (/без асансьор|no elevator|no lift/i.test(text))
    questions.push("Планира ли се монтиране на асансьор?");

  if (/за ремонт|нуждае се от ремонт|изисква ремонт/i.test(text))
    questions.push("Какво точно се нуждае от ремонт и има ли скрити проблеми?");

  if (listing.sellerType === "Broker" || listing.broker)
    questions.push("Каква е брокерската комисионна и кой я плаща?");

  if (!listing.sqm)
    questions.push("Какъв е точният застроен и жилищен метраж?");

  if ((listing.photos?.length ?? 0) < 5)
    questions.push("Може ли да споделите повече снимки, включително на общите части?");

  return unique(questions).slice(0, 7);
}

function buildBudgetEstimate(listing: ListingInput): BudgetEstimate {
  const asking = priceInEur(listing) ?? listing.price ?? 0;
  if (!asking) {
    return { asking: 0, notary_and_taxes: 0, broker_commission: 0, renovation: 0, total: 0, notes: ["Цената не е открита"] };
  }

  const notaryAndTaxes = Math.round(asking * 0.02);
  const isBroker = listing.sellerType === "Broker" || !!listing.broker;
  const brokerCommission = isBroker ? Math.round(asking * 0.03) : 0;

  const text = textFor(listing);
  const needsRenovation = /за ремонт|нуждае се от ремонт|изисква ремонт/i.test(text);
  const renovation = needsRenovation
    ? listing.sqm ? Math.round(listing.sqm * 250) : 15000
    : 0;

  const notes: string[] = ["Нотариални такси и данъци ~2%"];
  if (brokerCommission > 0) notes.push("Брокерска комисионна ~3%");
  if (renovation > 0) notes.push(`Груба оценка за ремонт (~€250/кв.м)`);

  return {
    asking,
    notary_and_taxes: notaryAndTaxes,
    broker_commission: brokerCommission,
    renovation,
    total: asking + notaryAndTaxes + brokerCommission + renovation,
    notes,
  };
}

function detectNegotiationPoints(listing: ListingInput, overpricedPct: number): string[] {
  const text = textFor(listing);
  const points: string[] = [];

  if (listing.floor) {
    const floorLower = listing.floor.toLowerCase();
    if (/партер|приземен/.test(floorLower)) {
      points.push("Партерен/приземен етаж — шум, сигурност и влага са чести проблеми");
    }
    const floorMatch = listing.floor.match(/(\d+)\s*[/\\]\s*(\d+)/);
    if (floorMatch) {
      const floor = parseInt(floorMatch[1]);
      const total = parseInt(floorMatch[2]);
      if (floor === 1) points.push("Първи етаж — шум от улицата и сигурностни съображения");
      if (floor === total && total >= 3) points.push("Последен етаж — по-висок риск от течове и топлинни загуби");
    }
  }

  if (/без асансьор|no elevator|no lift/.test(text)) {
    points.push("Без асансьор — съществен проблем при по-високи етажи");
  }

  if (/панел|епк|epk/.test(text)) {
    points.push("Панелна сграда — по-ниска пазарна стойност и по-скъпа поддръжка");
  }

  if (/за ремонт|нуждае се от ремонт|изисква ремонт|needs renovation/.test(text)) {
    points.push("Нуждае се от ремонт — добавете ремонтните разходи към преговорите");
  }

  if (/влага|мухъл|mold|damp/.test(text)) {
    points.push("Спомената влага или мухъл — поискайте инспекция или намаление на цената");
  }

  if (/север|north/i.test(text) && !/юг|south/i.test(text)) {
    points.push("Северно изложение — по-малко слънчева светлина");
  }

  if (/без гараж|без паркинг|no parking|no garage/.test(text)) {
    points.push("Без паркинг — значителен недостатък в градски условия");
  }

  if (overpricedPct >= 8) {
    points.push(`Цената е ${overpricedPct}% над средната за района — директен аргумент за отстъпка`);
  }

  return unique(points).slice(0, 6);
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

  if (overpricedPct <= 0) {
    const asking = priceInEur(listing) ?? listing.price ?? 0;
    if (!asking) return "Цената изглежда справедлива — малко пространство за преговори";
    const discount = overpricedPct <= -7 ? 0.99 : 0.97;
    const offer = Math.round((asking * discount) / 1000) * 1000;
    const context = overpricedPct <= -7
      ? "Цената е под пазарната — не чакайте дълго"
      : "Цената е справедлива — скромна отстъпка е реалистична";
    return `${context}. Опитайте €${offer.toLocaleString()} първо`;
  }

  const conservativeFair = ((fairMin + fairMax) / 2) * listing.sqm;
  const openingDiscount = overpricedPct > 8 ? 0.9 : 0.93;
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
  const negotiationPoints = detectNegotiationPoints(listing, priceTruth.overpriced_pct);
  const questionsToAsk = buildQuestionsToAsk(listing);
  const budgetEstimate = buildBudgetEstimate(listing);
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
    negotiation_points: negotiationPoints,
    questions_to_ask: questionsToAsk,
    budget_estimate: budgetEstimate,
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
            "You are Imoturbo, a Bulgarian real-estate buyer-intelligence assistant. Output JSON with keys: red_flags[], good_signs[], bullshit_warnings[], negotiation_points[], offer_strategy. Do not invent exact addresses or map facts.",
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
      negotiation_points: Array.isArray(parsed.negotiation_points)
        ? unique(parsed.negotiation_points).slice(0, 6)
        : fallback.negotiation_points,
      offer_strategy:
        typeof parsed.offer_strategy === "string"
          ? parsed.offer_strategy
          : fallback.offer_strategy,
    };
  } catch {
    return fallback;
  }
}
