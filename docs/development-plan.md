# Development Plan

## Overview

This document outlines the development roadmap for transforming the current single-tenant chatbot into a multi-tenant SaaS platform.

## Current State

### ✅ What's Already Built
- **Working Chatbot**: Production-ready service with Crisp integration
- **AI Integration**: Intent detection and OpenAI response generation
- **Database**: PostgreSQL with conversation and lead storage
- **Security**: HMAC verification, rate limiting, PII redaction
- **Monitoring**: Health checks, metrics, and structured logging
- **Deployment**: Live on Render.com with custom domain

### 🎯 Target Architecture
- **Multi-Tenant Backend**: Single API serving multiple customers
- **API Key Authentication**: Tenant identification via API keys
- **Self-Hosted Papercups**: Open-source chat widget infrastructure
- **Internal Dashboard**: Web app for admin and customer management
- **Billing Integration**: Stripe for subscription management
- **Tenant Isolation**: Complete data separation between customers

## Development Phases

### Phase 1: Foundation & TypeScript Migration (Weeks 1-2)
**Goal**: Modernize codebase and prepare for multi-tenant architecture

#### 1.1 TypeScript Migration
- [x] **Setup TypeScript Configuration**
  - [x] Create `tsconfig.json` with strict settings
  - [x] Install TypeScript dependencies (`typescript`, `@types/*`)
  - [x] Update build scripts for TypeScript compilation
  - [x] Configure ESLint for TypeScript

- [x] **Core Files Migration**
  - [x] Migrate `server.js` → `server.ts` with Express types
  - [x] Migrate `llm/answer.js` → `llm/answer.ts` with OpenAI types
  - [x] Migrate `intents/detect.js` → `intents/detect.ts` with intent types
  - [x] Migrate `tools/db.js` → `tools/db.ts` with PostgreSQL types
  - [x] Migrate `tools/demo_templates.js` → `tools/demo_templates.ts`
  - [x] Migrate remaining tool files with proper typing
  - [x] Migrate `flows/calendar.js` → `flows/calendar.ts`

- [x] **Type Definitions**
  - [x] Create interfaces for `CrispPayload`, `IntentResult`, `Message`
  - [x] Add types for environment variables and configuration
  - [x] Create database schema types and query result interfaces
  - [x] Add API response/request type definitions
  - [x] Add Crisp integration types for single account multi-tenant

- [x] **Testing & Validation**
  - [x] Ensure all existing functionality works with TypeScript
  - [x] Fix any type errors and runtime issues
  - [x] Update tests to work with TypeScript
  - [x] Validate deployment pipeline with TypeScript build

### Phase 2: Multi-Tenant Backend (Weeks 3-6)
**Goal**: Transform backend to support multiple tenants

#### 2.1 Database Schema Updates
- [x] Add `tenants` table for customer accounts (with `papercups_account_id`)
- [x] Add `tenant_id` to all existing tables (conversations, messages, leads)
- [x] Create `tenant_configurations` table for custom settings
- [x] Add `api_keys` table for authentication
- [x] Implement database migrations with TypeScript

#### 2.2 API Key Authentication
- [x] Create API key generation and validation system
- [x] Add middleware to extract tenant from API key
- [x] Update all endpoints to use tenant context
- [x] Implement tenant-specific data filtering

#### 2.3 Tenant Data Isolation
- [x] Modify conversation storage to be tenant-specific
- [x] Update lead capture to include tenant context
- [x] Implement tenant-specific knowledge base storage
- [x] Add tenant-specific system prompts and configurations

#### 2.4 Backend API Updates
- [x] Update `/crisp/webhook` to use website_id for tenant identification
- [x] Update `/chat` endpoint for tenant-specific responses
- [x] Add tenant management endpoints (CRUD operations)
- [x] Implement tenant-specific rate limiting
- [x] Fix webhook to use Crisp website_id instead of hardcoded API keys

#### 2.5 Papercups Migration (NEW)
- [x] **Remove Crisp Integration**
  - [x] Remove Crisp webhook endpoint and dependencies
  - [x] Remove Crisp API client and signature verification
  - [x] Update database schema to remove `crisp_website_id`
  - [x] Clean up Crisp-specific types and interfaces

- [x] **Papercups Infrastructure Setup**
  - [x] Deploy self-hosted Papercups instance (Elixir/Phoenix)
  - [x] Configure Papercups database (PostgreSQL)
  - [x] Set up Papercups Redis for real-time features
  - [x] Configure Papercups environment variables
  - [x] Set up Papercups SSL/TLS certificates

- [x] **Papercups Integration**
  - [x] Create Papercups account management system
  - [x] Implement Papercups widget embedding for tenants
  - [x] Connect Papercups webhooks to our `/chat` API
  - [x] Add Papercups account ID to tenant database schema
  - [x] Create Papercups API client for message sending
  - [x] **Simplified Multi-Tenant Architecture**: Use Papercups account tokens as API keys
    - [x] Single source of truth for tenant identification
    - [x] Automatic tenant isolation through Papercups
    - [x] Simplified authentication using account tokens

#### 2.6 Simplified Multi-Tenant Implementation (NEW)
- [ ] **Update Authentication System**
  - [ ] Modify API key validation to use Papercups account tokens
  - [ ] Remove separate API key management system
  - [ ] Update middleware to authenticate via account tokens
- [ ] **Database Schema Updates**
  - [ ] Simplify tenants table to use account tokens as primary identifiers
  - [ ] Remove redundant API key storage
  - [ ] Update tenant lookup functions
- [ ] **Tenant Onboarding Flow**
  - [ ] Create Papercups account for new tenants
  - [ ] Use account token as tenant's API key
  - [ ] Generate widget code with tenant's account token
- [ ] **Integration Testing**
  - [ ] Test end-to-end chat flow with account tokens
  - [ ] Verify webhook routing by account ID
  - [ ] Validate tenant isolation

### Phase 3: Web Dashboard (Weeks 7-10)
**Goal**: Build internal dashboard for admin and customer management

#### 3.1 Authentication System
- [ ] Implement Neon Auth (passwordless magic link authentication)
- [ ] Create admin and customer user types
- [ ] Add role-based access control
- [ ] Configure Stack Auth integration

#### 3.2 Admin Dashboard
- [ ] Tenant creation and onboarding flow
- [ ] Subscription management interface
- [ ] Customer support tools
- [ ] System analytics and reporting

#### 3.3 Customer Portal
- [ ] Business information setup
- [ ] Chatbot configuration interface
- [ ] Conversation history and analytics
- [ ] Account management

#### 3.4 Billing Integration
- [ ] Integrate Stripe for payment processing
- [ ] Implement subscription plans and pricing
- [ ] Add usage tracking and billing
- [ ] Create invoice and payment management

### Phase 4: Advanced Features (Weeks 11-14)
**Goal**: Add advanced SaaS features and optimizations

#### 4.1 Advanced Analytics
- [ ] Tenant-specific conversation analytics
- [ ] Lead conversion tracking
- [ ] Performance metrics and insights
- [ ] Custom reporting and exports

#### 4.2 Integration Enhancements
- [ ] Multiple chat platform support
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Calendar integrations (Calendly, Google Calendar)
- [ ] Email marketing integrations

#### 4.3 Advanced Customization
- [ ] Custom AI model fine-tuning per tenant
- [ ] Advanced intent detection training
- [ ] Multi-language support
- [ ] White-label branding options

#### 4.4 Enterprise Features
- [ ] Team collaboration tools
- [ ] Advanced user permissions
- [ ] SSO integration
- [ ] API access for enterprise customers

### Phase 5: Production Optimization (Weeks 15-18)
**Goal**: Optimize for production scale and reliability

#### 5.1 Performance Optimization
- [ ] Implement Redis caching for frequently accessed data
- [ ] Add response caching for common queries
- [ ] Optimize database queries and add connection pooling
- [ ] Implement lazy loading for knowledge base content

#### 5.2 Scalability Enhancements
- [ ] Add horizontal scaling capabilities
- [ ] Implement load balancing and auto-scaling
- [ ] Add database read replicas for improved performance
- [ ] Implement distributed rate limiting

#### 5.3 Monitoring & Observability
- [ ] Enhance Prometheus metrics with business KPIs
- [ ] Add distributed tracing for request flow analysis
- [ ] Implement alerting for system health and performance
- [ ] Create comprehensive dashboards for operations

#### 5.4 Security Hardening
- [ ] Implement advanced threat detection and prevention
- [ ] Add data encryption at rest and in transit
- [ ] Implement audit logging and compliance features
- [ ] Add advanced access control and authentication

## Technical Implementation

### TypeScript Migration Benefits
The TypeScript migration in Phase 1 provides several key advantages for the multi-tenant SaaS development:

- **Type Safety**: Catch errors at compile time, reducing runtime bugs
- **Better IDE Support**: Enhanced autocomplete, refactoring, and navigation
- **Self-Documenting Code**: Types serve as living documentation
- **Easier Refactoring**: Safe code changes with confidence
- **Team Collaboration**: Clear interfaces and contracts between modules
- **Future-Proofing**: Better foundation for complex multi-tenant features

### Database Schema
```sql
-- Core tenant management
tenants (id, name, email, subscription_status, papercups_account_id, created_at)
api_keys (id, tenant_id, key_hash, name, permissions, created_at)

-- Tenant-specific data
conversations (id, tenant_id, session_id, created_at)
messages (id, tenant_id, conversation_id, role, content, timestamp)
leads (id, tenant_id, intent, contact_info, created_at)

-- Configuration
tenant_configurations (id, tenant_id, config_type, config_data)
knowledge_bases (id, tenant_id, content, updated_at)
```

### API Architecture
```
POST /api/v1/chat
Headers: X-API-Key: tenant-api-key
Body: { session_id, message }

POST /papercups/webhook
Headers: X-Papercups-Signature: webhook-signature
Body: { account_id, event, data: { content, from, conversation_id } }

GET /api/v1/admin/tenants
Headers: Authorization: Bearer admin-token

GET /api/v1/customer/config
Headers: Authorization: Bearer customer-token
```

### Backend Architecture (Post-TypeScript Migration)
- **Node.js** with **TypeScript** for type safety
- **Express.js** with typed middleware and routes
- **PostgreSQL** with typed database queries
- **Redis** for caching and rate limiting
- **OpenAI API** with typed response interfaces
- **Prometheus** metrics with typed collectors

### Frontend Architecture
- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **React Hook Form** with Zod validation
- **Neon Auth** with passwordless magic link authentication
- **Stack Auth** for authentication provider
- **Axios** for API communication

## Success Metrics

### Technical Goals
- **Multi-Tenancy**: Support 100+ concurrent tenants
- **Performance**: < 500ms response time per tenant
- **Uptime**: 99.9% availability
- **Security**: Zero data leakage between tenants

### Business Goals
- **Customer Onboarding**: < 5 minutes to first working chatbot
- **Self-Service**: 80% of configuration done by customers
- **Retention**: 90%+ monthly retention rate
- **Revenue**: $10K+ MRR within 6 months

## Risk Mitigation

### Technical Risks
- **Data Isolation**: Comprehensive testing of tenant separation
- **Performance**: Load testing with multiple tenants
- **Security**: Regular security audits and penetration testing
- **Scalability**: Database optimization and caching strategies

### Business Risks
- **Customer Adoption**: Gradual rollout with early adopters
- **Competition**: Focus on unique value propositions
- **Support Load**: Self-service tools and documentation
- **Revenue Model**: Flexible pricing and free trial options

## Papercups Migration Strategy

### Why Papercups?
Based on the [Papercups documentation](https://docs.papercups.io/), Papercups offers several advantages for our multi-tenant SaaS:

- **Open Source**: Full control over data and infrastructure
- **Self-Hosted**: No third-party dependencies or data sharing
- **Elixir/Phoenix**: Built for real-time, fault-tolerant applications
- **Custom Widget**: Embeddable React component for tenant websites
- **Webhook Support**: Real-time event notifications
- **Multi-Platform**: React, React Native, Flutter support
- **Team Features**: Built-in collaboration and conversation management

### Migration Benefits
1. **Data Sovereignty**: Complete control over customer data
2. **Cost Control**: No per-seat or per-message fees
3. **Customization**: Full control over widget appearance and behavior
4. **Integration**: Direct connection to our existing `/chat` API
5. **Scalability**: Self-hosted infrastructure scales with our needs

### Infrastructure Requirements
- **Elixir/Phoenix Application**: Main Papercups server
- **PostgreSQL Database**: Papercups data storage
- **Redis**: Real-time features and caching
- **SSL/TLS**: Secure communication
- **Docker**: Containerized deployment
- **Load Balancer**: For high availability

## Implementation Priorities

### High Priority (Immediate)
1. **Papercups Migration**: Remove Crisp, deploy Papercups infrastructure
2. **Database Schema**: Multi-tenant data structure with Papercups integration
3. **API Authentication**: API key system
4. **Data Isolation**: Tenant-specific data filtering
5. **Basic Web Dashboard**: Admin and customer interfaces

### Medium Priority (Next Quarter)
1. **Billing Integration**: Stripe subscription management
2. **Advanced Analytics**: Tenant-specific insights
3. **Integration Enhancements**: Multiple chat platforms
4. **Performance Optimization**: Caching and scaling

### Low Priority (Future)
1. **Enterprise Features**: SSO, advanced permissions
2. **White-Label Options**: Custom branding
3. **API Marketplace**: Third-party integrations
4. **Advanced AI Features**: Custom model training
