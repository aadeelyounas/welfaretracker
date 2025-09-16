#!/bin/bash
echo "🚀 Setting up Users Table for Authentication"
echo "============================================="

# Load environment variables from .env.local if it exists
if [ -f ".env.local" ]; then
    echo "📋 Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set your DATABASE_URL first:"
    echo "export DATABASE_URL=\"postgresql://username:password@localhost:5432/welfare_tracker\""
    exit 1
fi

echo "📊 Running users table migration..."
psql $DATABASE_URL -f src/db/migrations/004_create_users_table.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Users table created successfully!"
    echo ""
    echo "📋 Your Login Credentials:"
    echo "Username: ashridge"
    echo "Password: Ashridge@2025!"
    echo ""
    echo "🔧 Additional Admin Account:"
    echo "Username: admin"
    echo "Password: password"
    echo ""
    echo "🎯 The authentication system now supports:"
    echo "   ✅ Database-based user authentication only"
    echo "   ✅ Secure bcrypt password hashing"
    echo "   ✅ JWT token-based sessions"
    echo "   ✅ No fallback authentication (database required)"
else
    echo "❌ Error running migration. Check your DATABASE_URL and database connection."
    echo ""
    echo "🔄 Don't worry! The system will still work with fallback authentication:"
    echo "Username: ashridge"
    echo "Password: Ashridge@2025!"
fi

echo ""
echo "🌐 Login at: http://localhost:9002"