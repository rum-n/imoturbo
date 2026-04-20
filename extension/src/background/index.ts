import { enrichWithLocalSignals, getSettings, saveHistoryItem } from "../shared/storage";
import type { AnalysisResult, AnalyzeMessage } from "../shared/types";

async function postWithRetry(url: string, body: unknown): Promise<AnalysisResult> {
  const attempts = [0, 350];
  let lastError: unknown;

  for (const delay of attempts) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      return (await response.json()) as AnalysisResult;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Analyze request failed");
}

chrome.runtime.onMessage.addListener((message: AnalyzeMessage, _sender, sendResponse) => {
  if (message.type !== "IMOTURBO_ANALYZE") return false;

  void (async () => {
    try {
      const settings = await getSettings();
      const backendResult = await postWithRetry(settings.backendUrl, message.payload);
      const result = await enrichWithLocalSignals(message.payload, backendResult);
      await saveHistoryItem(message.payload, result);
      sendResponse({ ok: true, result });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Could not analyze listing"
      });
    }
  })();

  return true;
});
