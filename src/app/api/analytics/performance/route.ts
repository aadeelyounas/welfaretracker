/**
 * Analytics API - Performance Metrics Endpoint
 * Phase 3: Team Performance Analysis  
 */

import { NextRequest, NextResponse } from 'next/server';
import { WelfareAnalytics } from '@/lib/analytics-db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse date range parameters
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const preset = searchParams.get('preset'); // 'week', 'month', 'quarter'
    
    let startDate: Date;
    let endDate: Date = new Date();
    
    // Handle preset periods
    if (preset) {
      switch (preset) {
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        default:
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1); // Default to last month
      }
    } else if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        );
      }
    } else {
      // Default to last month
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    console.log(`📈 Calculating performance metrics from ${startDate.toISOString()} to ${endDate.toISOString()}...`);
    
    const performanceMetrics = await WelfareAnalytics.getPerformanceMetrics({
      start: startDate,
      end: endDate
    });
    
    // Add additional insights
    const insights = {
      productivityScore: Math.round(performanceMetrics.summary.overallCompletionRate * 0.7 + 
                                   (performanceMetrics.patterns.weekdayPercentage > 70 ? 30 : 
                                    performanceMetrics.patterns.weekdayPercentage * 0.43)),
      recommendedActions: [
        performanceMetrics.summary.overdueActivities > 5 
          ? 'Focus on reducing overdue activities'
          : 'Maintain current activity completion rate',
        performanceMetrics.patterns.weekendActivities > performanceMetrics.patterns.weekdayActivities * 0.4
          ? 'Consider weekend coverage optimization'
          : 'Good work-life balance maintained',
        performanceMetrics.summary.averageCompletionDays > 3
          ? 'Improve response time to welfare needs'
          : 'Excellent response time performance'
      ].filter(Boolean),
      performanceGrade: performanceMetrics.summary.overallCompletionRate >= 90 ? 'A' :
                       performanceMetrics.summary.overallCompletionRate >= 80 ? 'B' :
                       performanceMetrics.summary.overallCompletionRate >= 70 ? 'C' :
                       performanceMetrics.summary.overallCompletionRate >= 60 ? 'D' : 'F'
    };
    
    console.log(`GET /api/analytics/performance completed in ${Date.now() - startTime}ms`);
    
    const response = NextResponse.json({
      success: true,
      data: performanceMetrics,
      insights: insights,
      metadata: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          preset: preset || 'custom'
        },
        generatedAt: new Date().toISOString()
      }
    });
    
    // Cache performance metrics for 6 hours - historical data
    response.headers.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=10800');
    
    return response;
  } catch (error) {
    console.error('Error calculating performance metrics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to calculate performance metrics',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
