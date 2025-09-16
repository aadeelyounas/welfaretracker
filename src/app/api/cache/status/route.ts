import { NextRequest, NextResponse } from 'next/server';
import { appCache } from '@/lib/cache';

/**
 * GET /api/cache/status
 * Get cache statistics and health information
 */
export async function GET(request: NextRequest) {
  try {
    const stats = appCache.getStats();
    
    return NextResponse.json({
      success: true,
      cache: {
        ...stats,
        hitRatePercent: Math.round(stats.hitRate * 100),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      recommendations: [
        stats.hitRate < 0.7 ? 'Consider adjusting cache TTL values' : null,
        stats.size > 1000 ? 'Cache size is large - consider cleanup' : null,
        'Cache is performing within normal parameters'
      ].filter(Boolean),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting cache status:', error);
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    );
  }
}