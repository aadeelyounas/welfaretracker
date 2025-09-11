/**
 * Performance Monitoring API - Phase 2
 * Real-time system performance tracking
 */

import { NextResponse } from 'next/server';
import OptimizedDBPool from '@/lib/db-pool';
import { appCache } from '@/lib/cache';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Gather comprehensive performance metrics
    const dbStats = OptimizedDBPool.getStats();
    
    // Cache performance metrics
    const cacheStats = appCache.getStats();
    const memoryUsage = process.memoryUsage();
    
    // System performance metrics
    const systemStats = {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      cpuUsage: process.cpuUsage(),
      memoryUsage: memoryUsage,
    };

    // API response time benchmark
    const benchmarkTime = Date.now() - startTime;
    
    const performanceReport = {
      timestamp: new Date().toISOString(),
      database: {
        connectionPool: dbStats.poolStats,
        queryMetrics: {
          totalQueries: dbStats.totalQueries,
          averageQueryTime: Math.round(dbStats.averageQueryTime),
          totalErrors: dbStats.errors
        },
        connectionStats: {
          total: dbStats.totalConnections,
          active: dbStats.activeConnections,
          waiting: dbStats.waitingClients
        }
      },
      cache: {
        entriesCount: cacheStats.size,
        hitRatePercent: Math.round(cacheStats.hitRate * 100),
        totalHits: cacheStats.hits,
        totalMisses: cacheStats.misses
      },
      system: {
        uptimeHours: Math.round(systemStats.uptime / 3600),
        memoryUsageMB: Math.round(systemStats.memoryUsage.rss / 1024 / 1024),
        heapUsedMB: Math.round(systemStats.memoryUsage.heapUsed / 1024 / 1024),
        cpuUserTime: systemStats.cpuUsage.user,
        cpuSystemTime: systemStats.cpuUsage.system
      },
      performance: {
        apiResponseTime: benchmarkTime,
        status: benchmarkTime < 100 ? 'excellent' : benchmarkTime < 500 ? 'good' : 'needs_optimization'
      }
    };

    console.log(`📊 Performance report generated in ${benchmarkTime}ms`);

    const response = NextResponse.json(performanceReport);
    
    // Cache performance data for 1 minute
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    
    return response;
  } catch (error) {
    console.error('Error generating performance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate performance report' },
      { status: 500 }
    );
  }
}
