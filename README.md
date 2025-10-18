# Netia AI Chatbot 🤖

**An intelligent chatbot platform that helps businesses communicate with their customers automatically.**

This system provides AI-powered customer service that can:
- 💬 **Chat with website visitors** in real-time
- 📅 **Schedule appointments** and manage bookings
- 💰 **Answer pricing questions** and provide quotes
- 📝 **Remember conversations** and customer preferences
- 🎯 **Understand customer intent** and provide relevant responses
- 📊 **Track leads** and customer interactions

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Customer      │    │   Admin         │    │   Website       │
│   Websites      │    │   Dashboard     │    │   Visitors      │
│   (Crisp Chat)  │    │   (Management)  │    │   (End Users)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Backend API          │
                    │   (Node.js/Express)       │
                    │  - Multi-tenant support   │
                    │  - API key authentication │
                    │  - Intent detection       │
                    │  - AI response generation │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Neon Database          │
                    │   (PostgreSQL)            │
                    │  - Tenant data isolation  │
                    │  - Conversation history   │
                    │  - User management        │
                    └───────────────────────────┘
```

### Key Components:
- **🤖 Backend API**: The brain that processes messages and generates responses
- **🎛️ Admin Dashboard**: Web interface for managing customers and settings
- **💾 Database**: Stores all conversations, user data, and system information
- **🌐 Chat Integration**: Connects to customer websites via Crisp chat widget

## 🔄 How It Works

```mermaid
graph TD
    A[👤 Customer visits website] --> B[💬 Types message in chat]
    B --> C[🤖 AI analyzes the message]
    C --> D{🧠 Intent Detection}
    D -->|Booking Request| E[📅 Process appointment booking]
    D -->|Pricing Inquiry| F[💰 Provide pricing information]
    D -->|General Question| G[❓ Generate contextual response]
    E --> H[📝 Save conversation & lead data]
    F --> H
    G --> H
    H --> I[📊 Update analytics & metrics]
    I --> J[✅ Response sent to customer]
```

**The Process:**
1. **Customer Interaction**: A visitor types a message on your website's chat widget
2. **Message Processing**: Our AI system receives and analyzes the message
3. **Intent Recognition**: The system determines what the customer is trying to accomplish
4. **Response Generation**: Based on the intent, an appropriate response is generated
5. **Data Storage**: The conversation and any relevant data (like leads) are saved
6. **Analytics Update**: System metrics and customer data are updated
7. **Response Delivery**: The AI response is sent back to the customer through the chat widget

## 📁 Monorepo Structure

```
/
├── api/                    # Backend API (Node.js/Express)
│   ├── src/               # Source code
│   ├── config/            # Configuration files
│   ├── tests/             # Test suites
│   └── package.json       # API dependencies
├── web/                    # Internal Dashboard (Next.js)
│   ├── src/               # React components
│   ├── public/            # Static assets
│   └── package.json       # Web dependencies
├── docs/                   # Target architecture documentation
│   ├── system-architecture.md
│   ├── development-plan.md
│   └── application-overview.md
├── aidocs/                 # AI-generated documentation
├── legacy/                 # Legacy code and old docs
└── package.json           # Root monorepo scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Neon Database account
- OpenAI API key
- Crisp account (for chat integration)

### Install All Dependencies
```bash
npm run install:all
```

### Environment Setup
```bash
# API environment
cp api/env.example api/.env
# Edit api/.env with your credentials

# Web environment  
cp web/env.example web/.env.local
# Edit web/.env.local with your settings
```

### Development
```bash
# Run both API and Web dashboard
npm run dev

# Or run individually:
npm run dev:api    # API only (port 3000)
npm run dev:web    # Web dashboard only (port 3001)
```

### Health Checks
```bash
npm run check:health    # API health check
npm run check:webhook   # Webhook endpoint test
```

## 🎯 Application Overview

### How It Works
1. **Customer Integration**: Businesses embed Crisp chat widget on their websites
2. **AI Processing**: When users chat, messages are sent to our API via Crisp webhooks
3. **Intent Detection**: Our AI analyzes messages to understand user intent (booking, pricing, support, etc.)
4. **Smart Responses**: AI generates contextual responses using tenant-specific knowledge
5. **Lead Capture**: Booking and pricing inquiries automatically create leads
6. **Admin Management**: Business owners manage their chatbot through our web dashboard

### Key Features
- **Multi-Tenant Architecture**: Each customer has isolated data and configuration
- **API Key Authentication**: Secure access control for each tenant
- **Intent Detection**: AI-powered understanding of user messages
- **Knowledge Base**: Tenant-specific FAQ and system prompts
- **Calendar Integration**: Automated booking and scheduling
- **Lead Management**: Automatic lead capture and tracking
- **Real-time Chat**: Crisp webhook integration for instant responses
- **Admin Dashboard**: Comprehensive management interface
- **Billing Integration**: Stripe-powered subscription management

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
