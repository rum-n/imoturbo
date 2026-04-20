import type { ListingPayload } from "../shared/types";

function textOf(selector: string): string {
  return document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function allText(selector: string): string {
  return Array.from(document.querySelectorAll(selector))
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

function parseNumber(raw: string): number | undefined {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function parsePrice(text: string): { price?: number; currency?: "EUR" | "BGN" } {
  const eurMatch = text.match(/(?:€|EUR)\s*([\d\s.,]+)|([\d\s.,]+)\s*(?:€|EUR)/i);
  if (eurMatch) return { price: parseNumber(eurMatch[1] || eurMatch[2]), currency: "EUR" };

  const bgnMatch = text.match(/(?:лв\.?|BGN)\s*([\d\s.,]+)|([\d\s.,]+)\s*(?:лв\.?|BGN)/i);
  if (bgnMatch) return { price: parseNumber(bgnMatch[1] || bgnMatch[2]), currency: "BGN" };

  const price = parseNumber(text);
  return price ? { price, currency: "EUR" } : {};
}

function bodyText(): string {
  return document.body.innerText.replace(/\s+/g, " ").trim();
}

function findByRegex(regex: RegExp): string {
  return bodyText().match(regex)?.[0]?.trim() ?? "";
}

function metaContent(selector: string): string {
  return document.querySelector<HTMLMetaElement>(selector)?.content?.trim() ?? "";
}

function firstValidPrice(candidates: string[]): { price?: number; currency?: "EUR" | "BGN" } {
  for (const candidate of candidates) {
    const parsed = parsePrice(candidate);
    if (parsed.price && parsed.price >= 1000) return parsed;
  }
  return {};
}

function extractStructuredPrice(): { price?: number; currency?: "EUR" | "BGN" } {
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script[type='application/ld+json']"));

  function visit(value: unknown): { price?: number; currency?: "EUR" | "BGN" } | undefined {
    if (!value || typeof value !== "object") return undefined;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item);
        if (found?.price) return found;
      }
      return undefined;
    }

    const record = value as Record<string, unknown>;
    const rawPrice = record.price;
    const rawCurrency = String(record.priceCurrency ?? "").toUpperCase();
    if ((typeof rawPrice === "number" || typeof rawPrice === "string") && Number(rawPrice) > 0) {
      return {
        price: Number(rawPrice),
        currency: rawCurrency === "BGN" ? "BGN" : "EUR"
      };
    }

    for (const child of Object.values(record)) {
      const found = visit(child);
      if (found?.price) return found;
    }

    return undefined;
  }

  for (const script of scripts) {
    try {
      const found = visit(JSON.parse(script.textContent ?? ""));
      if (found?.price) return found;
    } catch {
      // Invalid third-party JSON-LD should not block extraction.
    }
  }

  return {};
}

function extractPrice(): { price?: number; currency?: "EUR" | "BGN" } {
  const structured = extractStructuredPrice();
  if (structured.price) return structured;

  const candidates = [
    textOf(".adPrice .cena"),
    textOf(".Price"),
    textOf(".galleryInfo .title"),
    metaContent("meta[property='product:price:amount']"),
    metaContent("meta[name='description']"),
    document.title,
    findByRegex(/showpricechange\([^)]*['"](\d{4,})['"]\s*,\s*['"](EUR|BGN)['"]/i),
    findByRegex(/(?:€|EUR)\s?[\d\s.,]+|[\d\s.,]+\s?(?:€|EUR|лв|BGN)/i)
  ];

  return firstValidPrice(candidates);
}

function normalizeUrl(url: string): string | undefined {
  try {
    return new URL(url, location.href).href;
  } catch {
    return undefined;
  }
}

function extractPhotos(): string[] {
  const candidates = [
    ...Array.from(document.images).map((image) => image.currentSrc || image.src),
    ...Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).map((anchor) => anchor.href),
    ...Array.from(document.querySelectorAll<HTMLElement>("[style*='background-image']")).flatMap((element) =>
      Array.from(element.style.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)).map((match) => match[1])
    )
  ];

  return Array.from(
    new Set(
      candidates
        .map((src) => normalizeUrl(src))
        .filter((src): src is string => Boolean(src))
        .filter((src) => /^https?:\/\//.test(src))
        .filter((src) => !/logo|sprite|icon|banner|facebook|google/i.test(src))
    )
  ).slice(0, 20);
}

function extractDescription(): string {
  const selectors = [
    "[itemprop='description']",
    "[class*='description']",
    "[id*='description']",
    ".description",
    ".imotDescr",
    "td:has(#description_div)"
  ];

  for (const selector of selectors) {
    try {
      const value = textOf(selector);
      if (value.length > 80) return value;
    } catch {
      // :has is not available in every extension context.
    }
  }

  const text = bodyText();
  const marker = text.match(/Описание|Description/i);
  if (marker?.index) return text.slice(marker.index, marker.index + 2500);
  return text.slice(0, 2500);
}

function extractStructuredListingText(): string {
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script[type='application/ld+json']"));
  const chunks: string[] = [];

  function visit(value: unknown): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, unknown>;
    for (const key of ["name", "description", "sku"]) {
      if (typeof record[key] === "string") chunks.push(record[key]);
    }
    for (const child of Object.values(record)) visit(child);
  }

  for (const script of scripts) {
    try {
      visit(JSON.parse(script.textContent ?? ""));
    } catch {
      // Invalid third-party JSON-LD should not block extraction.
    }
  }

  return chunks.join(" ");
}

function extractDistrict(title: string): string | undefined {
  const focusedCandidates = [
    title,
    textOf(".galleryInfo .title"),
    metaContent("meta[name='description']"),
    document.title,
    decodeURIComponent(location.pathname.replace(/[-_/]+/g, " ")),
    extractStructuredListingText()
  ].filter(Boolean);

  const focused = focusedCandidates.join(" ");
  const focusedMatch =
    focused.match(/(?:град|гр\.|район|кв\.|жк|ж\.к\.)\s*София[,\s-]+([А-ЯA-Z][^,.|/]{2,60})/i) ||
    focused.match(/sofiya[,\s-]+([a-z][a-z\s-]{2,60})/i) ||
    focused.match(/sofia[,\s-]+([a-z][a-z\s-]{2,60})/i);
  if (focusedMatch?.[1]) return focusedMatch[1].trim();

  const directFocused = focused.match(/(?:район|кв\.|жк|ж\.к\.)\s*([А-ЯA-Z][^,.|/]{2,60})/i);
  if (directFocused?.[1]) return directFocused[1].trim();

  const pageLocation = allText("[itemprop='address'], .location, .address, .locat, [class='location'], [class='address']");
  if (pageLocation) return pageLocation;

  return findByRegex(/(?:район|кв\.|жк|ж\.к\.|гр\.)\s?[А-ЯA-Z][^,.|]{2,60}/i) || undefined;
}

function extractSeller(): { broker?: string; sellerType?: string } {
  const text = bodyText();
  const broker =
    textOf("[class*='broker']") ||
    textOf("[class*='agency']") ||
    findByRegex(/(?:Агенция|Брокер|Посредник)\s*:?\s*[А-ЯA-Z][^,\n|]{2,80}/i);
  const sellerType = /частно лице|owner|собственик/i.test(text) ? "Owner" : broker ? "Broker" : undefined;
  return { broker: broker || undefined, sellerType };
}

export function isSupportedListingPage(): boolean {
  if (!/(^|\.)imot\.bg$/.test(location.hostname)) return false;
  const text = bodyText();
  const hasPrice = /(?:€|EUR|лв|BGN)\s?[\d\s.,]+|[\d\s.,]+\s?(?:€|EUR|лв|BGN)/i.test(text);
  const hasArea = /\d+(?:[,.]\d+)?\s?(?:кв\.?\s?м|m2|sqm|sq\.?m)/i.test(text);
  const looksLikeListing = /obiava|offer|listing|prodava|naem|имот|апартамент|двустаен|тристаен/i.test(location.href + " " + document.title);
  return hasPrice && hasArea && looksLikeListing;
}

export function extractListing(): ListingPayload {
  const title =
    textOf("h1") ||
    metaContent("meta[property='og:title']") ||
    textOf(".title") ||
    document.title.replace(/\s+-\s+.*$/, "").trim() ||
    "Untitled listing";

  const price = extractPrice();
  const sqmText = findByRegex(/\d+(?:[,.]\d+)?\s?(?:кв\.?\s?м|m2|sqm|sq\.?m)/i);
  const floor = findByRegex(/(?:етаж|floor)\s*:?\s*[\w\d/+-]+/i) || undefined;
  const areaText = extractDistrict(title);
  const description = extractDescription();
  const seller = extractSeller();

  return {
    url: location.href,
    site: "imot.bg",
    title,
    ...price,
    sqm: parseNumber(sqmText),
    floor,
    district: areaText,
    areaText,
    description,
    photos: extractPhotos(),
    ...seller
  };
}
