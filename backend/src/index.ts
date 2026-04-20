import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { analyzeRouter } from "./routes/analyze.js";
import { healthRouter } from "./routes/health.js";
import { rateLimit } from "./services/rateLimit.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "chrome-extension://*,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = allowedOrigins.some((entry) => {
        if (entry.endsWith("*")) return origin.startsWith(entry.slice(0, -1));
        return origin === entry;
      });
      callback(allowed ? null : new Error("CORS origin not allowed"), allowed);
    }
  })
);

app.use("/health", healthRouter);
app.use("/analyze", rateLimit, analyzeRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Analysis failed" });
});

app.listen(port, () => {
  console.log(`Imoturbo backend listening on http://localhost:${port}`);
});
