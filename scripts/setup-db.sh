#!/bin/bash

# =============================================================================
# NETIA AI CHATBOT - DATABASE SETUP SCRIPT
# =============================================================================
# This script sets up your Neon database using the SQL files
# Make sure to set your DATABASE_URL environment variable first

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set!"
    print_status "Please set it with your Neon database connection string:"
    print_status "export DATABASE_URL='postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require'"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    print_error "psql command not found!"
    print_status "Please install PostgreSQL client tools:"
    print_status "  - macOS: brew install postgresql"
    print_status "  - Ubuntu: sudo apt-get install postgresql-client"
    print_status "  - Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_DIR="$SCRIPT_DIR/sql"

print_status "Starting Netia AI Chatbot database setup..."
print_status "Database URL: ${DATABASE_URL:0:20}..."

# Function to run SQL file
run_sql_file() {
    local file=$1
    local description=$2
    
    if [ ! -f "$file" ]; then
        print_error "SQL file not found: $file"
        exit 1
    fi
    
    print_status "Running: $description"
    if psql "$DATABASE_URL" -f "$file" -v ON_ERROR_STOP=1; then
        print_success "Completed: $description"
    else
        print_error "Failed: $description"
        exit 1
    fi
}

# Check if we want to clean up first
if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
    print_warning "Cleaning up existing database..."
    run_sql_file "$SQL_DIR/03-cleanup.sql" "Database cleanup"
fi

# Run setup scripts in order
print_status "Setting up database schema..."

run_sql_file "$SQL_DIR/01-create-tables.sql" "Creating tables and indexes"

# Ask if user wants to add seed data
if [ "$1" = "--with-seed" ] || [ "$1" = "-s" ]; then
    print_status "Adding seed data..."
    run_sql_file "$SQL_DIR/02-seed-data.sql" "Adding sample data"
else
    print_warning "Skipping seed data. Use --with-seed to add sample data."
fi

print_success "🎉 Database setup completed successfully!"
print_status ""
print_status "Next steps:"
print_status "1. Update your .env file with the correct DATABASE_URL"
print_status "2. Start your API server: npm run dev"
print_status "3. Test the connection with: npm run check:health"
print_status ""
print_status "To add sample data later, run:"
print_status "  psql \$DATABASE_URL -f scripts/sql/02-seed-data.sql"
print_status ""
print_status "To clean up and start over, run:"
print_status "  ./scripts/setup-db.sh --clean --with-seed"
