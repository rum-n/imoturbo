import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import {
  clearHistory,
  defaultSettings,
  getHistory,
  getSettings,
  setSettings,
} from "../shared/storage";
import type { HistoryItem } from "../shared/types";

function Popup() {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [backendUrl, setBackendUrl] = React.useState(
    defaultSettings.backendUrl,
  );
  const [saved, setSaved] = React.useState(false);
  const [injectStatus, setInjectStatus] = React.useState<string>();

  React.useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const [items, settings] = await Promise.all([getHistory(), getSettings()]);
    setHistory(items);
    setBackendUrl(settings.backendUrl);
  }

  async function saveSettings() {
    await setSettings({ backendUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  async function wipeHistory() {
    await clearHistory();
    setHistory([]);
  }

  async function showButtonOnCurrentTab() {
    setInjectStatus("Отваряне на Imoturbo на този таб...");
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      setInjectStatus("Няма активен таб.");
      return;
    }

    if (!tab.url || !/https?:\/\/([^/]+\.)?imot\.bg\//i.test(tab.url)) {
      setInjectStatus("Първо отворете таб с обява на imot.bg.");
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["assets/content.js"],
      });
      setInjectStatus(
        "Бутонът за анализ трябва да се вижда в долния десен ъгъл.",
      );
    } catch (error) {
      setInjectStatus(
        error instanceof Error
          ? error.message
          : "Не можа да се инжектира в този таб.",
      );
    }
  }

  return (
    <main className="w-[360px] p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-700">
            Imoturbo
          </p>
          <h1 className="mt-1 text-xl font-semibold">Последни анализи</h1>
        </div>
        <button
          className="rounded-md border border-stone-200 px-3 py-2 text-xs font-semibold hover:bg-white"
          onClick={wipeHistory}
        >
          Изчисти
        </button>
      </header>

      <section className="mt-4 rounded-lg border border-stone-200 bg-white p-3">
        <button
          className="w-full rounded-md bg-[#171717] px-3 py-3 text-sm font-semibold text-white"
          onClick={showButtonOnCurrentTab}
        >
          Покажи бутон на този таб
        </button>
        {injectStatus && (
          <p className="mt-2 text-xs text-stone-500">{injectStatus}</p>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-stone-200 bg-white p-3">
        <label
          className="text-xs font-semibold text-stone-500"
          htmlFor="backend-url"
        >
          URL на бекенда
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="backend-url"
            className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
            value={backendUrl}
            onChange={(event) => setBackendUrl(event.target.value)}
          />
          <button
            className="rounded-md bg-[#171717] px-3 py-2 text-sm font-semibold text-white"
            onClick={saveSettings}
          >
            {saved ? "Запазено" : "Запази"}
          </button>
        </div>
      </section>

      <section className="mt-4 space-y-3">
        {history.length === 0 && (
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500">
            Анализирайте обява на imot.bg и тя ще се появи тук.
          </div>
        )}

        {history.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-stone-200 bg-white p-4 no-underline transition hover:border-emerald-700"
          >
            <p className="line-clamp-2 text-sm font-semibold text-[#171717]">
              {item.title}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
              <span>{item.result.price_truth.district}</span>
              <span>{item.result.score}/100</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-[#171717]">
                {item.result.price_truth.eur_per_sqm
                  ? `€${item.result.price_truth.eur_per_sqm.toLocaleString()} / кв.м`
                  : "Цена неизвестна"}
              </span>
              {item.result.duplicate_signal.is_duplicate && (
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                  Дубликат?
                </span>
              )}
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
