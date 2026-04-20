import type { AnalysisResult, ListingPayload } from "../shared/types";

type Props = {
  listing: ListingPayload;
  result?: AnalysisResult;
  status: "idle" | "loading" | "done" | "error";
  error?: string;
  onAnalyze: () => void;
  onClose: () => void;
};

const eur = (value?: number) =>
  typeof value === "number"
    ? `€${Math.round(value).toLocaleString()}`
    : "Неизвестно";
const percent = (value: number) => `${Math.round(value * 100)}%`;

function scoreTone(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-800";
  if (score >= 55) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export function Sidebar({
  listing,
  result,
  status,
  error,
  onAnalyze,
  onClose,
}: Props) {
  return (
    <aside className="fixed right-4 top-4 z-[2147483647] flex max-h-[calc(100vh-32px)] w-[390px] max-w-[calc(100vw-20px)] flex-col overflow-hidden rounded-lg border border-stone-200 bg-[#fbfbf8] text-[#171717] shadow-lens">
      <div className="border-b border-stone-200 bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700">
              Imoturbo
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight">
              Покупателска интелигентност
            </h2>
          </div>
          <button
            className="rounded-md px-2 py-1 text-xl leading-none hover:bg-stone-100"
            onClick={onClose}
            aria-label="Затвори Imoturbo"
          >
            x
          </button>
        </div>
        <p className="mt-3 line-clamp-2 text-sm font-medium text-stone-700">
          {listing.title}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {status === "loading" && <LoadingState />}

        {status === "error" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error ?? "Не можа да се анализира тази обява."}
          </div>
        )}

        {status === "idle" && (
          <button
            className="w-full rounded-lg bg-[#171717] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
            onClick={onAnalyze}
          >
            Анализирай с Imoturbo
          </button>
        )}

        {result && (
          <div className="space-y-4">
            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-stone-500">
                    Резултат Imoturbo
                  </p>
                  <p className="mt-1 text-3xl font-bold">
                    {result.score} / 100
                  </p>
                </div>
                <span
                  className={`rounded-md px-3 py-2 text-sm font-bold ${scoreTone(result.score)}`}
                >
                  {result.status}
                </span>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <Metric
                label="Цена на предлагане"
                value={eur(result.asking_price)}
              />
              <Metric
                label="Справедлив диапазон"
                value={`${eur(result.fair_range.min)} - ${eur(result.fair_range.max)}`}
              />
              <Metric
                label="EUR / кв.м"
                value={
                  result.price_truth.eur_per_sqm
                    ? eur(result.price_truth.eur_per_sqm)
                    : "Неизвестно"
                }
              />
              <Metric
                label="Достоверност"
                value={percent(result.price_truth.confidence)}
                accent={
                  result.price_truth.overpriced_pct > 5
                    ? "text-rose-700"
                    : "text-emerald-700"
                }
              />
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Разлика в цената</p>
                <span
                  className={
                    result.price_truth.overpriced_pct > 0
                      ? "font-bold text-rose-700"
                      : "font-bold text-emerald-700"
                  }
                >
                  {result.price_truth.overpriced_pct > 0 ? "+" : ""}
                  {result.price_truth.overpriced_pct}%
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-600">
                В сравнение със средните цени за 2025 г. в{" "}
                {result.price_truth.district}. Справедливият диапазон е{" "}
                {eur(result.price_truth.fair_min)}-
                {eur(result.price_truth.fair_max)} на кв.м.
              </p>
            </section>

            <Details
              title="Червени флагове"
              items={result.red_flags}
              tone="red"
            />
            <Details
              title="Добри знаци"
              items={result.good_signs}
              tone="green"
            />
            <Details
              title="Детектор за глупости"
              items={result.bullshit_warnings}
              tone="amber"
            />

            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="text-sm font-semibold">Стратегия за оферта</p>
              <p className="mt-2 text-base font-semibold text-[#171717]">
                {result.offer_strategy}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                {result.stale_listing.message}
              </p>
              {result.stale_listing.likely_negotiable && (
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Вероятно подлежащ на договаряне
                </p>
              )}
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Проверка за дубликати</p>
                <span
                  className={
                    result.duplicate_signal.is_duplicate
                      ? "font-bold text-amber-700"
                      : "font-bold text-emerald-700"
                  }
                >
                  {result.duplicate_signal.is_duplicate
                    ? "Възможен дубликат"
                    : "Няма локално съвпадение"}
                </span>
              </div>
              {result.duplicate_signal.matches.length > 0 && (
                <ul className="mt-3 space-y-2 text-xs text-stone-600">
                  {result.duplicate_signal.matches.map((match) => (
                    <li
                      key={`${match.url}-${match.seen_at}`}
                      className="line-clamp-2"
                    >
                      {match.title}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-lg bg-stone-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-20 animate-pulse rounded-lg bg-stone-200" />
      </div>
      <div className="h-36 animate-pulse rounded-lg bg-stone-200" />
    </div>
  );
}

function Metric({
  label,
  value,
  accent = "text-[#171717]",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className={`mt-2 text-lg font-bold leading-tight ${accent}`}>
        {value}
      </p>
    </div>
  );
}

function Details({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "red" | "green" | "amber";
}) {
  const color =
    tone === "red"
      ? "text-rose-700"
      : tone === "green"
        ? "text-emerald-700"
        : "text-amber-700";
  return (
    <details
      className="rounded-lg border border-stone-200 bg-white p-4"
      open={tone !== "green"}
    >
      <summary className="cursor-pointer select-none text-sm font-semibold">
        {title}
      </summary>
      <ul className="mt-3 space-y-2 text-sm">
        {items.length ? (
          items.map((item) => (
            <li key={item} className="flex gap-2 leading-snug text-stone-700">
              <span className={color}>-</span>
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="text-stone-500">Нищо очевидно не е открито.</li>
        )}
      </ul>
    </details>
  );
}
