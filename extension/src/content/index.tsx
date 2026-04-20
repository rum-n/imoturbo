import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { extractListing, isSupportedListingPage } from "./extract";
import { Sidebar } from "./Sidebar";
import type { AnalysisResult, AnalyzeMessage } from "../shared/types";

const ROOT_ID = "imoturbo-root";
const BUTTON_ID = "imoturbo-analyze-button";

function mountButton() {
  document.getElementById(BUTTON_ID)?.remove();
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.textContent = "⚡ Анализирай с Imoturbo";
  button.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:20px",
    "z-index:2147483646",
    "border:0",
    "border-radius:8px",
    "background:#171717",
    "color:#fff",
    "padding:13px 16px",
    "font:700 14px system-ui",
    "box-shadow:0 18px 45px rgba(23,23,23,.24)",
    "cursor:pointer",
  ].join(";");
  document.body.appendChild(button);
  return button;
}

function ImoturboApp() {
  const listing = useMemo(() => extractListing(), []);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "loading",
  );
  const [result, setResult] = useState<AnalysisResult>();
  const [error, setError] = useState<string>();

  const analyze = React.useCallback(() => {
    setStatus("loading");
    setError(undefined);
    const message: AnalyzeMessage = {
      type: "IMOTURBO_ANALYZE",
      payload: listing,
    };
    chrome.runtime.sendMessage(message).then((response) => {
      if (response?.ok) {
        setResult(response.result);
        setStatus("done");
      } else {
        setError(response?.error ?? "Could not analyze listing");
        setStatus("error");
      }
    });
  }, [listing]);

  React.useEffect(() => {
    analyze();
  }, [analyze]);

  return (
    <Sidebar
      listing={listing}
      result={result}
      status={status}
      error={error}
      onAnalyze={analyze}
      onClose={() => {
        document.getElementById(ROOT_ID)?.remove();
        mountButton().addEventListener("click", openPanel);
      }}
    />
  );
}

function openPanel() {
  document.getElementById(BUTTON_ID)?.remove();
  let rootEl = document.getElementById(ROOT_ID);
  if (!rootEl) {
    rootEl = document.createElement("div");
    rootEl.id = ROOT_ID;
    document.body.appendChild(rootEl);
  }
  createRoot(rootEl).render(<ImoturboApp />);
}

if (
  isSupportedListingPage() &&
  !document.getElementById(ROOT_ID) &&
  !document.getElementById(BUTTON_ID)
) {
  mountButton().addEventListener("click", openPanel);
}
