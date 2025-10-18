# Netia Web Dashboard

Internal dashboard for Netia AI Chatbot - Admin and Customer management.

## Overview

This is the internal web application for managing the Netia AI Chatbot platform. It provides:

- **Admin Dashboard**: Manage tenants, subscriptions, billing, and system analytics
- **Customer Portal**: Configure chatbot settings, view analytics, manage account

## Tech Stack

- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **React Hook Form** with Zod validation
- **Axios** for API communication
- **JWT** authentication

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   ```
   http://localhost:3001
   ```

## Environment Variables

See `env.example` for all required environment variables.

## Features

### Admin Features
- Tenant management and onboarding
- Subscription and billing management
- System analytics and monitoring
- Customer support tools

### Customer Features
- Chatbot configuration
- Business information setup
- Conversation history and analytics
- Account management

## Development

- **Type checking**: `npm run type-check`
- **Linting**: `npm run lint`
- **Build**: `npm run build`
- **Start production**: `npm start`
