import { Router } from "express";
import { resolveTenant, requireActiveSubscription } from "../middleware/tenant.js";
import { verifyCrispSignature } from "../lib/crisp.js";
import { runLLM } from "../ai/runtime.js";

const r = Router();

r.post("/", resolveTenant, requireActiveSubscription, async (req, res) => {
  if (!verifyCrispSignature(req)) return res.status(401).json({ error: "Bad signature" });
  const userText = String(req.body?.text || "");
  const reply = await runLLM([{ role: "user", content: userText }]);
  return res.json({ reply });
});

export default r;


