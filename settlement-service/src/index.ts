/// Settlement Service — Express server for on-chain Aptos settlement
/// Called by Supabase settle-call Edge Function to sign + submit txns

import crypto from "crypto";
import express from "express";
import { settleCall, expireCall, healthCheck, getCallOnchainStatus } from "./aptos-settler";
import { syncSettlementToDb } from "./db-sync";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 3001);
const SERVICE_SECRET = process.env.SERVICE_SECRET ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Fail startup in production if SERVICE_SECRET is not configured
if (IS_PRODUCTION && !SERVICE_SECRET) {
  console.error("FATAL: SERVICE_SECRET must be set in production");
  process.exit(1);
}

/** Timing-safe string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Validate that value is a non-negative integer */
function isValidId(val: unknown): val is number {
  const n = Number(val);
  return Number.isInteger(n) && n >= 0;
}

/** Auth middleware — verify shared secret from Edge Function */
function authGuard(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  if (!SERVICE_SECRET) {
    next(); // no secret configured = dev mode (blocked in production above)
    return;
  }
  const token = req.headers.authorization?.replace("Bearer ", "") ?? "";
  if (!safeCompare(token, SERVICE_SECRET)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.use("/settle", authGuard);
app.use("/expire", authGuard);

/** POST /settle — settle a call with Pyth oracle price */
app.post("/settle", async (req, res) => {
  const { call_id, asset } = req.body;
  if (!isValidId(call_id) || !isValidId(asset) || Number(asset) > 4) {
    res.status(400).json({ error: "Invalid call_id or asset" });
    return;
  }

  console.log(`[settle] call_id=${call_id} asset=${asset}`);
  const result = await settleCall(Number(call_id), Number(asset));
  console.log(`[settle] success=${result.success} hash=${result.hash.slice(0, 16)}...`);

  // Sync to DB if settlement succeeded
  if (result.success && result.hash) {
    const verdictMap: Record<number, "settled_true" | "settled_false"> = { 1: "settled_true", 2: "settled_false" };
    const dbVerdict = verdictMap[result.verdict ?? 0];
    if (dbVerdict) {
      try {
        await syncSettlementToDb({
          callIdOnchain: Number(call_id),
          verdict: dbVerdict,
          actualPrice: result.actualPrice ?? 0,
          txHash: result.hash,
        });
      } catch (err) {
        console.error("[settle] DB sync failed:", err);
      }
    }
  }

  res.status(result.success ? 200 : 502).json({
    hash: result.hash,
    success: result.success,
    ...(result.error ? { error: IS_PRODUCTION ? "Settlement failed" : result.error } : {}),
  });
});

/** POST /expire — expire a call, refund all buyers */
app.post("/expire", async (req, res) => {
  const { call_id } = req.body;
  if (!isValidId(call_id)) {
    res.status(400).json({ error: "Invalid call_id" });
    return;
  }

  console.log(`[expire] call_id=${call_id}`);
  const result = await expireCall(Number(call_id));
  console.log(`[expire] success=${result.success} hash=${result.hash.slice(0, 16)}...`);

  // Sync expiry to DB
  if (result.success && result.hash) {
    try {
      await syncSettlementToDb({
        callIdOnchain: Number(call_id),
        verdict: "expired",
        actualPrice: 0,
        txHash: result.hash,
      });
    } catch (err) {
      console.error("[expire] DB sync failed:", err);
    }
  }

  res.status(result.success ? 200 : 502).json({
    hash: result.hash,
    success: result.success,
    ...(result.error ? { error: IS_PRODUCTION ? "Expiry failed" : result.error } : {}),
  });
});

/** POST /reconcile — sync on-chain status to DB for a call */
app.post("/reconcile", authGuard, async (req, res) => {
  const { call_id_onchain } = req.body;
  if (!isValidId(call_id_onchain)) {
    res.status(400).json({ error: "Invalid call_id_onchain" });
    return;
  }

  const onchain = await getCallOnchainStatus(Number(call_id_onchain));
  if (!onchain) {
    res.status(404).json({ error: "Call not found on-chain" });
    return;
  }

  const statusMap: Record<number, "active" | "settled_true" | "settled_false" | "expired"> = {
    0: "active", 1: "settled_true", 2: "settled_false", 3: "expired",
  };
  const dbStatus = statusMap[onchain.status] ?? "active";

  if (dbStatus !== "active") {
    try {
      await syncSettlementToDb({
        callIdOnchain: Number(call_id_onchain),
        verdict: dbStatus as "settled_true" | "settled_false" | "expired",
        actualPrice: 0,
        txHash: "reconciled",
      });
    } catch (err) {
      console.error("[reconcile] sync failed:", err);
    }
  }

  res.json({ call_id_onchain, onchain_status: onchain.status, db_status: dbStatus });
});

/** GET /health — verify oracle account is configured and funded */
app.get("/health", async (_req, res) => {
  try {
    const info = await healthCheck();
    res.json({ status: "ok", ...info });
  } catch (err) {
    res.status(500).json({ status: "error", error: "Health check failed" });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Settlement service running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  server.close(() => process.exit(0));
});
