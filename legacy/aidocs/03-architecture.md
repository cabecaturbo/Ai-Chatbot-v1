# Netia AI Chatbot - System Architecture

## High-Level Architecture

The Netia AI Chatbot system is designed as a multi-service architecture with clear separation of concerns, safety mechanisms, and production-ready deployment capabilities.

```mermaid
graph TB
    subgraph "External Services"
        Crisp[Crisp Chat Platform]
        OpenAI[OpenAI API]
        Website[Netia Website<br/>www.netia.ai]
    end
    
    subgraph "Netia AI Chatbot System"
        subgraph "Production Service"
            MainBot[netia-bot-safe<br/>Main Production Service]
        end
        
        subgraph "Legacy Code"
            Legacy[legacy/<br/>Unused/Experimental Code]
        end
        
        subgraph "Data Layer"
            Postgres[(PostgreSQL<br/>Conversations & Leads)]
            Redis[(Redis<br/>Rate Limiting & Cache)]
        end
        
        subgraph "AI Components"
            IntentDetector[Intent Detection<br/>Keyword-based Classification]
            NetiaLLM[LLM Integration<br/>OpenAI + Fallbacks]
            KnowledgeBase[Knowledge Base<br/>FAQ & System Prompts]
        end
    end
    
    subgraph "Deployment"
        Render[Render.com<br/>Production Hosting]
        Domain[api.netia.ai<br/>Custom Domain]
    end
    
    %% External connections
    Crisp -->|Webhook with website_id| MainBot
    Website -->|Chat API| MainBot
    OpenAI -->|API Calls| NetiaLLM
    
    %% Internal connections
    MainBot --> IntentDetector
    MainBot --> NetiaLLM
    MainBot --> KnowledgeBase
    MainBot --> Postgres
    MainBot --> Redis
    
    %% Deployment
    Render --> MainBot
    Domain --> Render
```

## Service Architecture

### Primary Service: netia-bot-safe

The main production service that handles all customer interactions and integrations.

```mermaid
graph TD
    subgraph "netia-bot-safe Service"
        subgraph "API Layer"
            HealthAPI[GET /health<br/>Health Check]
            MetricsAPI[GET /metrics<br/>Prometheus Metrics]
            ChatAPI[POST /chat<br/>Public Chat API]
            WebhookAPI[POST /crisp/webhook<br/>Crisp Integration]
            CalendarAPI[GET/POST /calendar/*<br/>Booking System]
        end
        
        subgraph "Middleware Stack"
            Security[Security Middleware<br/>Helmet, CORS, Rate Limiting]
            Validation[Input Validation<br/>JSON Schema, HMAC]
            Logging[Structured Logging<br/>Pino with PII Redaction]
            Metrics[Metrics Collection<br/>Prometheus Counters]
        end
        
        subgraph "Business Logic"
            IntentEngine[Intent Detection<br/>Booking, Pricing, FAQ]
            LLMEngine[Response Generation<br/>OpenAI + Templates]
            ConversationMgr[Conversation Management<br/>Session-based History]
            LeadCapture[Lead Generation<br/>Business Intent Tracking]
        end
        
        subgraph "Safety Mechanisms"
            DryRun[DRY_RUN Flag<br/>Disable External Calls]
            KillSwitch[KILL_SWITCH Flag<br/>Emergency Stop]
            DemoMode[DEMO_MODE Flag<br/>Enhanced Demo Responses]
        end
    end
    
    %% Flow connections
    HealthAPI --> Security
    MetricsAPI --> Security
    ChatAPI --> Security
    WebhookAPI --> Security
    CalendarAPI --> Security
    
    Security --> Validation
    Validation --> Logging
    Logging --> Metrics
    
    ChatAPI --> IntentEngine
    WebhookAPI --> IntentEngine
    CalendarAPI --> LeadCapture
    
    IntentEngine --> LLMEngine
    LLMEngine --> ConversationMgr
    ConversationMgr --> LeadCapture
    
    DryRun --> LLMEngine
    KillSwitch --> WebhookAPI
    DemoMode --> LLMEngine
```

## Data Flow Architecture

### Conversation Processing Flow

```mermaid
sequenceDiagram
    participant User as User/Customer
    participant Crisp as Crisp Platform
    participant API as netia-bot-safe
    participant Intent as Intent Detector
    participant LLM as LLM Engine
    participant DB as PostgreSQL
    participant Redis as Redis Cache
    
    User->>Crisp: Sends message
    Crisp->>API: Webhook POST /crisp/webhook (with website_id)
    API->>API: Validate HMAC signature
    API->>API: Identify tenant by website_id
    API->>API: Check KILL_SWITCH flag
    
    alt KILL_SWITCH enabled
        API->>Crisp: Return {ok: true, skipped: true}
    else Normal processing
        API->>Intent: Detect intent from message
        Intent->>API: Return intent + confidence
        
        API->>DB: Save user message
        API->>LLM: Generate response
        
        alt DRY_RUN mode
            LLM->>API: Return template response
        else Live mode
            LLM->>OpenAI: Call GPT API
            OpenAI->>LLM: Return AI response
            LLM->>API: Return response
        end
        
        API->>DB: Save assistant response
        API->>Redis: Update rate limiting
        
        alt Business intent (pricing/booking)
            API->>DB: Save lead record
        end
        
        alt DRY_RUN mode
            API->>API: Log response (no external send)
        else Live mode
            API->>Crisp: Send response back to user
        end
        
        API->>Crisp: Return webhook response
    end
```

### Public Chat API Flow

```mermaid
sequenceDiagram
    participant Website as Netia Website
    participant API as netia-bot-safe
    participant Intent as Intent Detector
    participant LLM as LLM Engine
    participant DB as PostgreSQL
    
    Website->>API: POST /chat {session_id, message}
    API->>API: Validate JSON schema
    API->>API: Check rate limits
    
    API->>Intent: Detect intent from message
    Intent->>API: Return intent classification
    
    API->>DB: Save user message
    API->>LLM: Generate response with context
    
    LLM->>API: Return AI response
    API->>DB: Save assistant response
    
    alt Business intent
        API->>DB: Create lead record
    end
    
    API->>Website: Return {ok, intent, response}
```

## Database Schema Architecture

```mermaid
erDiagram
    CONVERSATIONS {
        text id PK
        timestamptz created_at
    }
    
    MESSAGES {
        bigserial id PK
        text conversation_id FK
        text role
        text content
        timestamptz ts
    }
    
    LEADS {
        bigserial id PK
        text intent
        timestamptz created_at
    }
    
    CONVERSATIONS ||--o{ MESSAGES : contains
```

## Deployment Architecture

### Production Deployment on Render.com

```mermaid
graph TB
    subgraph "DNS & Domain"
        DNS[Porkbun DNS]
        Domain[api.netia.ai]
        Website[www.netia.ai]
    end
    
    subgraph "Render.com Infrastructure"
        RenderService[netia-bot-safe Service<br/>Node.js Web Service]
        RenderDB[PostgreSQL Database<br/>Managed Service]
        RenderRedis[Redis Cache<br/>Managed Service]
    end
    
    subgraph "External Integrations"
        CrispProd[Crisp Production<br/>Live Chat Platform]
        OpenAIProd[OpenAI API<br/>GPT-4o-mini]
    end
    
    subgraph "Monitoring & Observability"
        Metrics[Prometheus Metrics<br/>/metrics endpoint]
        Health[Health Checks<br/>/health endpoint]
        Logs[Structured Logs<br/>Pino + Request IDs]
    end
    
    %% DNS routing
    DNS --> Domain
    DNS --> Website
    
    %% Service connections
    Domain --> RenderService
    Website --> RenderService
    
    %% Database connections
    RenderService --> RenderDB
    RenderService --> RenderRedis
    
    %% External API connections
    RenderService --> CrispProd
    RenderService --> OpenAIProd
    
    %% Monitoring
    RenderService --> Metrics
    RenderService --> Health
    RenderService --> Logs
```

### Environment Configuration

```mermaid
graph LR
    subgraph "Environment Variables"
        subgraph "Safety Flags"
            DRY_RUN[DRY_RUN=true<br/>Disable external calls]
            KILL_SWITCH[KILL_SWITCH=false<br/>Emergency stop]
            DEMO_MODE[DEMO_MODE=true<br/>Demo responses]
        end
        
        subgraph "Service Configuration"
            PORT[PORT=3000<br/>Server port]
            LOG_LEVEL[LOG_LEVEL=info<br/>Logging level]
            CORS_ORIGIN[CORS_ORIGIN<br/>Allowed origins]
        end
        
        subgraph "External Services"
            OPENAI_API_KEY[OPENAI_API_KEY<br/>GPT API access]
            DATABASE_URL[DATABASE_URL<br/>PostgreSQL connection]
            REDIS_URL[REDIS_URL<br/>Redis connection]
            CRISP_*[CRISP_*<br/>Chat platform credentials]
        end
    end
    
    subgraph "Configuration Files"
        EnvFile[.env<br/>Local development]
        RenderYaml[render.yaml<br/>Production deployment]
        PackageJson[package.json<br/>Dependencies & scripts]
    end
    
    EnvFile --> DRY_RUN
    EnvFile --> KILL_SWITCH
    EnvFile --> DEMO_MODE
    EnvFile --> PORT
    EnvFile --> LOG_LEVEL
    EnvFile --> CORS_ORIGIN
    EnvFile --> OPENAI_API_KEY
    EnvFile --> DATABASE_URL
    EnvFile --> REDIS_URL
    EnvFile --> CRISP_*
    
    RenderYaml --> PORT
    RenderYaml --> DRY_RUN
    RenderYaml --> KILL_SWITCH
```

## Security Architecture

### Security Layers

```mermaid
graph TD
    subgraph "External Security"
        HTTPS[HTTPS/TLS<br/>Encrypted transport]
        HSTS[HSTS Headers<br/>Force HTTPS]
        CSP[Content Security Policy<br/>XSS protection]
    end
    
    subgraph "API Security"
        HMAC[HMAC Verification<br/>Crisp webhook signatures]
        CORS[CORS Protection<br/>Origin restrictions]
        RateLimit[Rate Limiting<br/>Redis-backed throttling]
        Validation[Input Validation<br/>JSON schema validation]
    end
    
    subgraph "Data Security"
        PIIRedaction[PII Redaction<br/>Log sanitization]
        BodyLimits[Body Size Limits<br/>DoS protection]
        SQLInjection[SQL Injection Prevention<br/>Parameterized queries]
    end
    
    subgraph "Operational Security"
        KillSwitch[KILL_SWITCH<br/>Emergency stop]
        DryRun[DRY_RUN<br/>Safe testing mode]
        Secrets[Secret Management<br/>Environment variables]
    end
    
    HTTPS --> HMAC
    HSTS --> CORS
    CSP --> RateLimit
    RateLimit --> Validation
    Validation --> PIIRedaction
    PIIRedaction --> BodyLimits
    BodyLimits --> SQLInjection
    SQLInjection --> KillSwitch
    KillSwitch --> DryRun
    DryRun --> Secrets
```

## Monitoring & Observability

### Metrics Collection

```mermaid
graph LR
    subgraph "Application Metrics"
        HTTPMetrics[HTTP Request Metrics<br/>Count, Duration, Status]
        LLMMetrics[LLM Request Metrics<br/>Success/Error rates]
        BusinessMetrics[Business Metrics<br/>Leads, Conversions]
    end
    
    subgraph "System Metrics"
        SystemMetrics[System Metrics<br/>CPU, Memory, Uptime]
        DatabaseMetrics[Database Metrics<br/>Connections, Queries]
        CacheMetrics[Cache Metrics<br/>Hit rates, Latency]
    end
    
    subgraph "Prometheus Endpoints"
        MetricsEndpoint[/metrics<br/>Prometheus format]
        HealthEndpoint[/health<br/>Service health]
    end
    
    HTTPMetrics --> MetricsEndpoint
    LLMMetrics --> MetricsEndpoint
    BusinessMetrics --> MetricsEndpoint
    SystemMetrics --> MetricsEndpoint
    DatabaseMetrics --> MetricsEndpoint
    CacheMetrics --> MetricsEndpoint
    
    MetricsEndpoint --> HealthEndpoint
```

## Implementation Status

Based on the existing documentation, here's the current implementation status:

### ✅ Completed Features
- **Core Service**: netia-bot-safe with Express.js framework
- **Safety Mechanisms**: DRY_RUN, KILL_SWITCH, DEMO_MODE flags
- **API Endpoints**: /health, /metrics, /chat, /crisp/webhook, /calendar/*
- **AI Components**: IntentDetector, NetiaLLM with OpenAI integration
- **Database**: PostgreSQL with automatic schema initialization
- **Security**: HMAC verification, CORS, rate limiting, PII redaction
- **Monitoring**: Prometheus metrics, structured logging
- **Deployment**: Render.com configuration with custom domain

### 🔄 In Progress
- **TypeScript Migration**: Planned for core modules
- **Load Testing**: Performance validation
- **CI/CD Pipeline**: Automated testing and deployment

### 📋 Planned Features
- **Advanced Analytics**: Business intelligence and reporting
- **Multi-language Support**: Internationalization
- **Advanced AI Features**: Context-aware responses, sentiment analysis
- **Integration Expansion**: Additional chat platforms and CRM systems

## Performance Characteristics

### SLOs (Service Level Objectives)
- **Uptime**: 99.5%
- **Latency**: p95 < 1.5s
- **Error Rate**: < 1%

### Scalability Features
- **Stateless Design**: Horizontal scaling capability
- **Database Connection Pooling**: Efficient resource utilization
- **Redis Caching**: Performance optimization
- **Rate Limiting**: Protection against abuse
- **Graceful Degradation**: Fallback responses during service issues

This architecture provides a robust, scalable, and maintainable foundation for the Netia AI Chatbot system, with clear separation of concerns and comprehensive safety mechanisms for production deployment.
