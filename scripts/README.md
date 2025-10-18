# Database Setup Scripts

This directory contains SQL scripts and setup tools for the Netia AI Chatbot database.

## Files

### SQL Scripts

- **`sql/01-create-tables.sql`** - Creates all database tables, indexes, and RLS policies
- **`sql/02-seed-data.sql`** - Adds sample data for development and testing
- **`sql/03-cleanup.sql`** - Removes all data and tables (use with caution!)

### Setup Script

- **`setup-db.sh`** - Automated setup script that runs the SQL files in order

## Quick Start

### 1. Set Environment Variable

```bash
export DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 2. Run Setup Script

```bash
# Basic setup (tables only)
./scripts/setup-db.sh

# Setup with sample data
./scripts/setup-db.sh --with-seed

# Clean and setup with sample data
./scripts/setup-db.sh --clean --with-seed
```

## Manual Setup

If you prefer to run the SQL files manually:

```bash
# 1. Create tables
psql $DATABASE_URL -f scripts/sql/01-create-tables.sql

# 2. Add sample data (optional)
psql $DATABASE_URL -f scripts/sql/02-seed-data.sql
```

## What Gets Created

### Tables
- `tenants` - Customer accounts and subscription info
- `api_keys` - API keys for tenant authentication
- `conversations` - Chat conversation sessions
- `messages` - Individual messages within conversations
- `leads` - Captured leads from conversations
- `tenant_configurations` - Tenant-specific settings
- `knowledge_bases` - FAQ and system prompts

### Features
- **Indexes** for optimal query performance
- **Row Level Security (RLS)** for tenant data isolation
- **Foreign key constraints** for data integrity
- **UUID primary keys** for security
- **JSONB fields** for flexible data storage

### Sample Data (with --with-seed)
- 3 sample tenants (1 admin, 2 customers)
- API keys for each tenant
- Sample conversations and messages
- Sample leads and configurations
- Knowledge base content

## Environment Variables

Make sure these are set in your `.env` file:

```bash
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Troubleshooting

### Connection Issues
- Verify your `DATABASE_URL` is correct
- Check that your Neon database is accessible
- Ensure SSL mode is set to `require`

### Permission Issues
- Make sure the script is executable: `chmod +x scripts/setup-db.sh`
- Check that `psql` is installed and in your PATH

### RLS Policy Issues
- RLS policies are created but may need adjustment based on your auth implementation
- Check the `current_setting('app.current_tenant_id')` function usage

## Development Workflow

1. **Initial Setup**: Run `./scripts/setup-db.sh --with-seed`
2. **Development**: Use the sample data for testing
3. **Reset**: Run `./scripts/setup-db.sh --clean --with-seed` to start fresh
4. **Production**: Run `./scripts/setup-db.sh` (no seed data)

## Security Notes

- The cleanup script (`03-cleanup.sql`) will delete ALL data
- RLS policies provide tenant isolation at the database level
- API keys are hashed before storage
- All sensitive data uses proper constraints and validation
