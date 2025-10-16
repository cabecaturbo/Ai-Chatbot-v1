# AI Chatbot v1

This repo contains legacy demo servers and the safe server. Prefer:

```
cd netia-bot-safe
npm run dev
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

## API Endpoints (safe server)

- `GET /health`
- `GET /metrics`
- `POST /crisp/webhook`

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
- `NODE_ENV` - Environment (development/production)
