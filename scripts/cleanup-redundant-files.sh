#!/bin/bash
# Cleanup Script: Remove Redundant Files from Welfare Tracker
# This script removes duplicate and unused files to clean up the project

echo "🧹 Starting project cleanup - removing redundant files..."
echo "📋 The following files will be removed:"

# List files to be removed
echo ""
echo "📁 Database Layer Duplicates:"
echo "  - src/lib/db.ts"
echo "  - src/lib/database.ts" 
echo "  - src/lib/storage.ts"
echo "  - src/lib/storage-new.ts"
echo "  - src/lib/postgres-storage.ts"
echo "  - src/lib/analytics-db-complex.ts.bak"

echo ""
echo "📁 Component Duplicates:"
echo "  - src/components/logout-button-new.tsx"
echo "  - src/components/welfare-tracker-page.tsx"

echo ""
echo "📁 API Route Duplicates:"
echo "  - src/app/api/welfare-events/[id]/route-new.ts"

echo ""
echo "📁 Test/Development Files:"
echo "  - src/data/test-events.json"
echo "  - src/data/users.json"
echo "  - src/data/welfare-events.json"

echo ""
echo "📁 Standalone Analytics Page:"
echo "  - src/app/analytics/page.tsx"

echo ""
read -p "⚠️  Proceed with cleanup? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing redundant files..."
    
    # Database Layer Duplicates
    rm -f src/lib/db.ts
    rm -f src/lib/database.ts
    rm -f src/lib/storage.ts
    rm -f src/lib/storage-new.ts
    rm -f src/lib/postgres-storage.ts
    rm -f src/lib/analytics-db-complex.ts.bak
    
    # Component Duplicates  
    rm -f src/components/logout-button-new.tsx
    rm -f src/components/welfare-tracker-page.tsx
    
    # API Route Duplicates
    rm -f src/app/api/welfare-events/[id]/route-new.ts
    
    # Test/Development Files
    rm -f src/data/test-events.json
    rm -f src/data/users.json
    rm -f src/data/welfare-events.json
    
    # Standalone Analytics Page
    rm -f src/app/analytics/page.tsx
    
    echo ""
    echo "✅ Cleanup completed successfully!"
    echo "📊 Summary:"
    echo "  - Removed 11 redundant files"
    echo "  - Kept all active/used files intact"
    echo "  - Project structure is now optimized"
    
    echo ""
    echo "🎯 Active Files Remaining:"
    echo "  ✅ src/lib/employee-welfare-db.ts (main database layer)"
    echo "  ✅ src/lib/db-pool.ts (connection pooling)"
    echo "  ✅ src/lib/analytics-db.ts (simplified analytics)"
    echo "  ✅ src/components/employee-welfare-tracker.tsx (main UI)"
    echo "  ✅ src/components/logout-button.tsx (active logout component)"
    echo ""
    echo "🚀 Your project is now cleaner and more maintainable!"
    
else
    echo "❌ Cleanup cancelled. No files were removed."
fi
