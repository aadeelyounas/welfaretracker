import { NextRequest, NextResponse } from 'next/server';
import { OptimizedWelfareDB } from '@/lib/optimized-db';
import { WelfareAnalytics } from '@/lib/analytics-db';
import { appCache } from '@/lib/cache';

/**
 * DELETE /api/cache/clear
 * Hard clear all caches - completely removes all cached data
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🗑️ Hard cache clear requested - clearing ALL cached data');

    // Clear all application caches
    appCache.clear();
    
    // Invalidate all analytics caches
    WelfareAnalytics.invalidateAllCaches();
    
    // Clear all optimized database caches
    OptimizedWelfareDB.invalidateCaches('all');
    
    // Get fresh cache stats
    const cacheStats = appCache.getStats();
    
    console.log(`🧹 Hard cache clear completed in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully',
      action: 'hard_clear',
      cacheStats,
      timestamp: new Date().toISOString(),
      clearedItems: [
        'Application cache',
        'Analytics cache', 
        'Database cache',
        'Dashboard cache',
        'Employee cache',
        'Activity cache'
      ]
    });
    
  } catch (error) {
    console.error('Error clearing caches:', error);
    return NextResponse.json(
      { error: 'Failed to clear caches' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/clear 
 * Alternative endpoint for hard clear (some clients prefer POST for actions)
 */
export async function POST(request: NextRequest) {
  return DELETE(request);
}