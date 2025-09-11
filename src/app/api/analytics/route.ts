/**
 * Analytics API for reporting and insights
 * Designed for future analytics dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsDB } from '@/lib/optimized-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const days = parseInt(searchParams.get('days') || '30');
    
    let data;
    
    switch (type) {
      case 'trends':
        data = await AnalyticsDB.getCompletionTrends(days);
        break;
        
      case 'employee-metrics':
        data = await AnalyticsDB.getEmployeeMetrics();
        break;
        
      case 'overdue-patterns':
        data = await AnalyticsDB.getOverduePatterns();
        break;
        
      case 'summary':
        // Get all analytics data for dashboard
        const [trends, metrics, patterns] = await Promise.all([
          AnalyticsDB.getCompletionTrends(30),
          AnalyticsDB.getEmployeeMetrics(),
          AnalyticsDB.getOverduePatterns()
        ]);
        
        data = {
          trends: trends.rows,
          metrics: metrics.rows,
          patterns: patterns.rows,
          generatedAt: new Date().toISOString()
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type. Use: trends, employee-metrics, overdue-patterns, or summary' },
          { status: 400 }
        );
    }
    
    const response = NextResponse.json({
      type,
      data: data.rows || data,
      generatedAt: new Date().toISOString()
    });
    
    // Cache analytics data for longer periods (they change less frequently)
    response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600'); // 30min cache
    
    return response;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
