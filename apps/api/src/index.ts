import "dotenv/config";
import express from "express";
import cors from "cors";
import health from "./routes/health.js";
import chat from "./routes/chat.js";
import crispWebhook from "./routes/crispWebhook.js";

const app = express();
app.use(cors({ origin: (process.env.CORS_ORIGIN || "*").split(",") }));
app.use(express.json({ limit: "1mb" }));

app.use("/health", health);
app.use("/chat", chat);
app.use("/crisp/webhook", crispWebhook);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("api listening on :" + port));


