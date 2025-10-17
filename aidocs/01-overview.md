# Netia AI Chatbot - Codebase Overview

## Project Summary

The Netia AI Chatbot is a comprehensive customer service automation system designed for small businesses. It consists of multiple Node.js services that provide AI-powered chat capabilities through various channels including web interfaces and the Crisp chat platform.

## Repository Structure

The codebase has been cleaned up and organized for clarity:

### Active Production Service

**`netia-bot-safe/`** - Main production service (moved to root level)
- Safe-by-default webhook server with comprehensive safety features
- Handles Crisp webhook integration, public chat API, and calendar booking
- Includes DRY_RUN and KILL_SWITCH safety mechanisms
- Production-ready with metrics, logging, and database integration

### Legacy Code

**`legacy/`** - Contains unused/experimental code
- `Ai-Chatbot-v1/` - Legacy implementations and duplicate services
- `netia-crisp-bot/` - Alternative lightweight Crisp integration (unused)
- Moved here for reference but not actively deployed

### Supporting Components

- **`docs/`** - Comprehensive documentation including deployment guides, runbooks, and project plans
- **Configuration files** - Environment templates, system prompts, and knowledge base content
- **Test suites** - Health checks, webhook validation, and conversation testing

## Core Functionality

### AI-Powered Chat System
- **Intent Detection**: Keyword-based classification for pricing, booking, and FAQ requests
- **LLM Integration**: OpenAI GPT integration with fallback to template-based responses
- **Conversation Management**: Session-based chat history with PostgreSQL persistence
- **Knowledge Base**: FAQ system with YAML-based content management

### Integration Capabilities
- **Crisp Chat Platform**: Webhook-based integration for live customer support
- **Calendar System**: Mock booking system with availability slots
- **Lead Capture**: Automatic lead generation for pricing and booking intents
- **Public API**: RESTful endpoints for website integration

### Safety & Operations
- **DRY_RUN Mode**: Disables external API calls for safe testing
- **KILL_SWITCH**: Emergency stop mechanism for webhook processing
- **Rate Limiting**: Redis-backed request throttling
- **Monitoring**: Prometheus metrics and structured logging
- **Security**: HMAC webhook verification, CORS protection, and PII redaction

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** for conversation and lead storage
- **Redis** for rate limiting and caching
- **OpenAI API** for LLM responses
- **Prometheus** for metrics collection

### Frontend Integration
- **Crisp Chat Widget** for live customer support
- **Public Chat API** for website embedding
- **Static HTML** landing page with Crisp integration

### Development & Operations
- **ESLint & Prettier** for code quality
- **Husky** for git hooks
- **Nodemon** for development hot-reload
- **Render.com** for production deployment

## Deployment Architecture

The system is designed for cloud deployment with:
- **Custom Domain**: `https://api.netia.ai` for production API
- **Website**: `https://www.netia.ai` hosted on Framer
- **Database**: PostgreSQL with automatic schema initialization
- **Monitoring**: Health checks and metrics endpoints
- **Security**: HTTPS, HSTS, and CSP headers

## Development Status

The project follows a phased development approach:
- **Phase 0**: Safe base setup with health checks and safety flags
- **Phase 1**: Conversational AI with intent detection and FAQ system
- **Phase 2**: Core hardening with error handling and rate limiting
- **Phase 3**: External integrations (Crisp, calendar, lead capture)
- **Phase 4**: Observability and operational runbooks
- **Phase 5**: Security hardening and production optimization

Current implementation covers Phases 0-3 with ongoing work on observability and security features.
