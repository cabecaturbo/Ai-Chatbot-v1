## Netia Crisp Bot

Production-ready Node/Express service that connects Crisp to an LLM to answer questions about Netia for small-business owners.

### Tech
- Node 20+, Express, axios, zod, yaml, pino, dotenv, cors

### Install & Run
```bash
npm i
cp .env.example .env   # fill in values
npm start
```

### Expose locally for Crisp webhooks
```bash
npx ngrok http $PORT
```
Paste the HTTPS URL into Crisp → Plugins → Webhooks (Call to URL).

### Crisp Webhook Setup
In Crisp Dashboard → Plugins → Webhooks (or "Call to URL"), create a webhook for New message events pointing to:
```
POST https://YOUR_DOMAIN/webhook/crisp
```

We only respond to incoming text from visitors (ignore operator messages).

### Crisp REST API for replies
```
POST https://api.crisp.chat/v1/website/{CRISP_WEBSITE_ID}/conversation/{session_id}/message
```
Auth: Basic using `CRISP_TOKEN_IDENTIFIER:CRISP_TOKEN_KEY`.

### Health check
```
GET /healthz  -> { ok: true, uptime, version }
```

### Test with curl (minimal payload)
```bash
curl -X POST http://localhost:${PORT:-8080}/webhook/crisp \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "message:received",
    "website_id": "'$CRISP_WEBSITE_ID'",
    "session_id": "session_123",
    "data": {
      "text": "How much is it?",
      "from": "visitor",
      "type": "text"
    }
  }'
```

Expected: 200 and the bot replies into the same Crisp conversation.

### Crisp website snippet reminder
Replace `CRISP_WEBSITE_ID` accordingly.
```html
<script type="text/javascript">window.$crisp=[];window.CRISP_WEBSITE_ID="CRISP_WEBSITE_ID";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>
```

### Deploy notes
- Render / Railway / Fly.io: run as a long-lived service with `npm start`.
- Vercel serverless: expose the Express app via a single API route (advanced). Ensure a 60s max runtime.


