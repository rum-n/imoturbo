import { enrichWithLocalSignals, getSettings, saveHistoryItem } from "../shared/storage";
import type { AnalysisResult, AnalyzeMessage } from "../shared/types";

async function postWithRetry(url: string, body: unknown, openaiApiKey?: string): Promise<AnalysisResult> {
  const attempts = [0, 350];
  let lastError: unknown;

  for (const delay of attempts) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (openaiApiKey) headers["x-openai-api-key"] = openaiApiKey;
      const response = await fetch(`${url.replace(/\/$/, "")}/analyze`, {
        method: "POST",
        headers,
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
      const backendResult = await postWithRetry(settings.backendUrl, message.payload, settings.openaiApiKey || undefined);
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
