import { NextRequest, NextResponse } from 'next/server';
import { OptimizedWelfareDB } from '@/lib/optimized-db';
import { WelfareAnalytics } from '@/lib/analytics-db';
import { appCache } from '@/lib/cache';

/**
 * POST /api/cache/refresh
 * Force refresh caches for immediate data updates
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { type, pattern } = body;

    console.log(`🔄 Cache refresh requested - type: ${type}, pattern: ${pattern}`);

    switch (type) {
      case 'analytics':
        WelfareAnalytics.invalidateAllCaches();
        break;
        
      case 'activities': 
        OptimizedWelfareDB.invalidateCaches('activity');
        break;
        
      case 'employees':
        OptimizedWelfareDB.invalidateCaches('employee');
        break;
        
      case 'dashboard':
        appCache.invalidate('dashboard:.*');
        break;
        
      case 'all':
        OptimizedWelfareDB.invalidateCaches('all');
        break;
        
      case 'pattern':
        if (pattern) {
          appCache.forceRefresh(pattern);
        }
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid refresh type' },
          { status: 400 }
        );
    }

    const cacheStats = appCache.getStats();
    
    console.log(`POST /api/cache/refresh completed in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      message: `Cache refreshed for type: ${type}`,
      cacheStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error refreshing cache:', error);
    return NextResponse.json(
      { error: 'Failed to refresh cache' },
      { status: 500 }
    );
  }
}