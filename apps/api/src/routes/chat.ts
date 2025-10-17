import { Router } from "express";
import { resolveTenant, requireActiveSubscription } from "../middleware/tenant.js";
import { runLLM } from "../ai/runtime.js";
const r = Router();

r.post("/", resolveTenant, requireActiveSubscription, async (req, res) => {
  const { text = "" } = (req.body || {}) as { text?: string };
  const reply = await runLLM([{ role: "user", content: String(text) }]);
  res.json({ reply });
});

export default r;


