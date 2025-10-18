# Netia AI Chatbot - Multi-Tenant SaaS Platform

A multi-tenant SaaS platform that provides AI-powered chatbots for businesses with Crisp integration, calendar booking, and lead capture.

## Monorepo Structure

```
/
├── api/                    # Backend API (Node.js/Express)
├── web/                    # Internal Dashboard (Next.js)
├── aidocs/                 # AI-generated documentation
├── legacy/                 # Legacy code and old docs
└── package.json           # Root monorepo scripts
```

## Quick Start

### Install All Dependencies
```bash
npm run install:all
```

### Development (Both API and Web)
```bash
npm run dev
```

### Individual Services
```bash
# API only
npm run dev:api

# Web dashboard only  
npm run dev:web
```

### Health Checks
```bash
npm run check:health
npm run check:webhook
```

## Features

- Real-time chat using WebSocket (Socket.IO)
- RESTful API for conversation management
- Simple bot response generation
- Conversation history tracking
- CORS enabled for cross-origin requests

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Start the server:
   ```bash
   npm run dev  # for development with auto-reload
   # or
   npm start    # for production
   ```

## API Endpoints

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics (includes HTTP and LLM metrics)
- `POST /crisp/webhook` - Crisp webhook handler
- `POST /chat` - Public chat API
- `GET /calendar/slots` - Mock availability
- `POST /calendar/book` - Mock booking (returns eventId)

## WebSocket Events

### Client to Server:
- `join-conversation` - Join a conversation room
- `send-message` - Send a message to the bot

### Server to Client:
- `conversation-history` - Receive conversation history when joining
- `new-message` - Receive new messages (both user and bot)

## Example Client Usage

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.emit('join-conversation', 'conversation-123');
socket.emit('send-message', {
  conversationId: 'conversation-123',
  message: 'Hello bot!',
  userId: 'user-456'
});

socket.on('new-message', (message) => {
  console.log('New message:', message);
});
```

## Configuration

Set environment variables in `.env`:
- `PORT` - Server port (default: 3000)
- `DRY_RUN` - true to disable external effects
- `KILL_SWITCH` - true to pause webhook logic
- `DEMO_MODE` - true to enable demo templates
- `OPENAI_API_KEY`, `OPENAI_MODEL` - LLM live mode
- `DATABASE_URL` - Postgres connection
- `REDIS_URL` - Redis connection (rate limiting)
- `CORS_ORIGIN` - Allowed origin(s)
- `CRISP_IDENTIFIER`, `CRISP_KEY`, `CRISP_WEBSITE_ID` - Crisp credentials
- `CRISP_WEBHOOK_SECRET` - Verify webhook signatures
