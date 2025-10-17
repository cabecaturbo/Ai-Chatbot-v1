# Netia AI Chatbot - Detailed Functionality

## API Endpoints

### Health & Monitoring
- **`GET /health`** - Health check endpoint
  - Returns server status, environment, uptime, and version
  - Used for load balancer health checks and monitoring
  - Response: `{ status: 'ok', env: 'development', uptime_sec: 123, version: '0.1.0' }`

- **`GET /metrics`** - Prometheus metrics endpoint
  - Exposes HTTP request counters and histograms
  - LLM request metrics (success/error rates, duration)
  - Crisp send operation metrics
  - Default system metrics (CPU, memory, etc.)

### Chat & Conversation
- **`POST /chat`** - Public chat API
  - Session-based conversation management
  - Intent detection and AI response generation
  - Lead capture for pricing/booking intents
  - Input validation with JSON schema
  - Response includes intent classification and confidence scores

- **`POST /crisp/webhook`** - Crisp chat platform integration
  - HMAC signature verification for security
  - Payload normalization for different Crisp webhook formats
  - Automatic response sending back to Crisp
  - Respects DRY_RUN and KILL_SWITCH flags
  - Comprehensive error handling and logging

### Calendar & Booking
- **`GET /calendar/slots`** - Mock availability endpoint
  - Returns available time slots for the next 3 days
  - Generates slots at 10am, 11am, 2pm, 3pm, 4pm
  - Response: `{ ok: true, slots: [{ iso: "2024-01-15T10:00:00.000Z" }] }`

- **`POST /calendar/book`** - Mock booking creation
  - Accepts slot and customer information
  - Generates unique event ID
  - Response: `{ ok: true, event: { eventId: "evt_abc123", when: "2024-01-15T10:00:00.000Z", customer: {} } }`

## AI & Intent Processing

### Intent Detection System
The `IntentDetector` class provides keyword-based intent classification:

- **Booking Intent**: Keywords like 'book', 'schedule', 'appointment', 'reserve'
- **Pricing Intent**: Keywords like 'price', 'cost', 'rate', 'plans'
- **FAQ Intent**: Keywords like 'hours', 'location', 'support', 'help'
- **General Intent**: Fallback for unrecognized queries

**Intent Response Format**:
```json
{
  "intent": "booking",
  "confidence": 0.8,
  "entities": {},
  "missing_slots": ["date", "time"]
}
```

### LLM Integration
The `NetiaLLM` class handles response generation with two modes:

**DRY_RUN Mode** (Development/Testing):
- Returns deterministic template-based responses
- No external API calls to OpenAI
- Demo-friendly responses for different intents
- Fallback responses for general queries

**Live Mode** (Production):
- Integrates with OpenAI GPT API
- Uses conversation history for context
- System prompt and FAQ knowledge base integration
- Graceful fallback to templates on API failures

### Knowledge Base System
- **System Prompts**: Stored in `config/system_prompt.txt`
- **FAQ Content**: YAML-based knowledge base in `kb/faq.yaml`
- **Caching**: In-memory caching for performance
- **Content Management**: Easy updates without code changes

## Data Management

### Database Schema
PostgreSQL tables with automatic schema initialization:

**Conversations Table**:
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Messages Table**:
```sql
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW()
);
```

**Leads Table**:
```sql
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  intent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Conversation Management
- **Session-based**: Each conversation identified by unique session ID
- **History Tracking**: Maintains conversation context for AI responses
- **Message Persistence**: All messages stored in PostgreSQL
- **Memory Management**: Conversation history limited to last 20 messages
- **Lead Capture**: Automatic lead generation for business-relevant intents

## Safety & Security Features

### Safety Mechanisms
- **DRY_RUN Flag**: Disables all external API calls and integrations
- **KILL_SWITCH Flag**: Completely disables webhook processing
- **DEMO_MODE Flag**: Enables enhanced demo responses

### Security Measures
- **HMAC Verification**: Crisp webhook signature validation
- **CORS Protection**: Configurable origin restrictions
- **Rate Limiting**: Redis-backed request throttling
- **PII Redaction**: Automatic removal of sensitive information from logs
- **Input Validation**: JSON schema validation for all endpoints
- **Security Headers**: Helmet.js for CSP, HSTS, and other protections

### Error Handling
- **Global Error Middleware**: Centralized error processing
- **Graceful Degradation**: Fallback responses when services fail
- **Structured Logging**: Comprehensive error tracking with Pino
- **Timeout Protection**: Request timeouts to prevent hanging connections

## External Integrations

### Crisp Chat Platform
- **Webhook Reception**: Handles incoming messages from Crisp
- **Response Sending**: Posts AI-generated responses back to conversations
- **Authentication**: Basic auth using Crisp API credentials
- **Payload Normalization**: Handles various Crisp webhook formats

### OpenAI Integration
- **API Client**: Dedicated OpenAI client with error handling
- **Model Configuration**: Configurable model selection
- **Context Management**: Conversation history and system prompts
- **Fallback Handling**: Template responses when API is unavailable

### Redis Integration
- **Rate Limiting**: Distributed rate limiting across instances
- **Session Storage**: Optional session persistence
- **Caching**: Performance optimization for frequent requests

## Configuration & Environment

### Environment Variables
- **`DRY_RUN`**: Enable/disable external effects (default: true)
- **`KILL_SWITCH`**: Emergency stop for webhook processing (default: false)
- **`DEMO_MODE`**: Enhanced demo responses (default: false)
- **`PORT`**: Server port (default: 3000)
- **`OPENAI_API_KEY`**: OpenAI API authentication
- **`DATABASE_URL`**: PostgreSQL connection string
- **`REDIS_URL`**: Redis connection for rate limiting
- **`CRISP_*`**: Crisp chat platform credentials
- **`CORS_ORIGIN`**: Allowed origins for CORS

### Feature Flags
The system uses runtime feature flags for safe deployment:
- **DRY_RUN**: Prevents external API calls during development
- **KILL_SWITCH**: Emergency stop mechanism for production issues
- **DEMO_MODE**: Enhanced responses for demonstration purposes

## Performance & Scalability

### Metrics Collection
- **HTTP Metrics**: Request counts, durations, and status codes
- **LLM Metrics**: AI request success rates and response times
- **Business Metrics**: Lead generation and conversion tracking
- **System Metrics**: CPU, memory, and uptime monitoring

### Optimization Features
- **Connection Pooling**: Efficient database connection management
- **Response Caching**: In-memory caching for knowledge base content
- **Rate Limiting**: Protection against abuse and overload
- **Graceful Shutdown**: Clean resource cleanup on server restart

### Scalability Considerations
- **Stateless Design**: Horizontal scaling capability
- **Database Persistence**: Conversation and lead data persistence
- **Redis Integration**: Distributed rate limiting and caching
- **Load Balancer Ready**: Health check endpoints for load balancing
