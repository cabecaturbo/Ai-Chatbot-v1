# Netia Web Dashboard

Internal dashboard for Netia AI Chatbot - Admin and Customer management with passwordless authentication.

## Overview

This is the internal web application for managing the Netia AI Chatbot platform. It provides:

- **Admin Dashboard**: Manage tenants, subscriptions, billing, and system analytics
- **Customer Portal**: Configure chatbot settings, view analytics, manage account
- **Passwordless Authentication**: Magic link sign-in via Neon Auth

## Tech Stack

- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **React Hook Form** with Zod validation
- **Axios** for API communication
- **Neon Auth** for passwordless magic link authentication
- **Stack Auth** as authentication provider

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Neon account with Neon Auth enabled

### Setup Neon Auth

1. **Go to Neon Console** → Auth section
2. **Click "Setup Stack Auth"** → One-click provisioning
3. **Copy credentials** → Project ID, Publishable Key, Secret Key
4. **Add to environment** → Update `.env` file

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Neon Auth credentials
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   ```
   http://localhost:3001
   ```

### Authentication Flow

1. **User enters email** → Magic link sent automatically
2. **User clicks link** → Automatically signed in
3. **Role-based access** → Admin vs Customer permissions
4. **User data synced** → Automatically stored in Neon database

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
