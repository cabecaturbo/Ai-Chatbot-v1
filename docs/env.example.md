Environment template (.env)

Copy the following into `Ai-Chatbot-v1/netia-bot-safe/.env` (keep values empty by default):

```
DRY_RUN=true
KILL_SWITCH=false
PORT=3000

# Crisp (optional for local; keep empty by default)
CRISP_IDENTIFIER=
CRISP_KEY=
CRISP_WEBSITE_ID=

# OpenAI (only required when DRY_RUN=false)
OPENAI_API_KEY=

# Demo mode
DEMO_MODE=true
```

Note: If your environment blocks dotfiles from being created automatically, create the file manually in your editor.


