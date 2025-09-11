/**
 * Analytics API - Executive Summary Endpoint
 * Phase 3: High-level Dashboard Analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { WelfareAnalytics } from '@/lib/analytics-db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🎖️ Generating executive summary dashboard...');
    
    const executiveSummary = await WelfareAnalytics.getExecutiveSummary();
    
    // Add timestamp and performance metrics
    const enhancedSummary = {
      ...executiveSummary,
      systemHealth: {
        apiResponseTime: Date.now() - startTime,
        cacheStatus: 'operational',
        lastUpdated: new Date().toISOString()
      },
      quickActions: [
        {
          id: 'review-high-risk',
          title: 'Review High-Risk Employees', 
          description: `${executiveSummary.overallHealth.highRiskEmployees} employees need attention`,
          priority: executiveSummary.overallHealth.highRiskEmployees > 5 ? 'high' : 'medium',
          url: '/analytics/risk-scores?riskLevel=High'
        },
        {
          id: 'overdue-activities',
          title: 'Address Overdue Activities',
          description: `${executiveSummary.keyMetrics.overdueActivities} activities are overdue`,
          priority: executiveSummary.keyMetrics.overdueActivities > 10 ? 'high' : 'low',
          url: '/welfare-activities?status=overdue'
        },
        {
          id: 'performance-review',
          title: 'Review Monthly Performance',
          description: `Completion rate: ${executiveSummary.keyMetrics.employeeEngagement}%`,
          priority: executiveSummary.overallHealth.completionRate < 80 ? 'medium' : 'low',
          url: '/analytics/performance?preset=month'
        }
      ]
    };
    
    console.log(`GET /api/analytics/summary completed in ${Date.now() - startTime}ms`);
    
    const response = NextResponse.json({
      success: true,
      data: enhancedSummary,
      metadata: {
        generatedAt: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        version: '3.0'
      }
    });
    
    // Cache executive summary for 30 minutes - needs frequent updates
    response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=900');
    
    return response;
  } catch (error) {
    console.error('Error generating executive summary:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate executive summary',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
