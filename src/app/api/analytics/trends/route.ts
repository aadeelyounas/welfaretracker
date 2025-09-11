/**
 * Analytics API - Welfare Trends Endpoint
 * Phase 3: Advanced Analytics & Reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { WelfareAnalytics } from '@/lib/analytics-db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6');
    
    // Validate months parameter
    if (months < 1 || months > 24) {
      return NextResponse.json(
        { error: 'Months parameter must be between 1 and 24' },
        { status: 400 }
      );
    }
    
    console.log(`📊 Fetching welfare trends for ${months} months...`);
    
    const trends = await WelfareAnalytics.getWelfareTrends(months);
    
    console.log(`GET /api/analytics/trends completed in ${Date.now() - startTime}ms`);
    
    const response = NextResponse.json({
      success: true,
      data: trends,
      metadata: {
        months: months,
        recordCount: trends.length,
        generatedAt: new Date().toISOString()
      }
    });
    
    // Cache trends for 2 hours - historical data doesn't change often
    response.headers.set('Cache-Control', 'public, max-age=7200, stale-while-revalidate=3600');
    
    return response;
  } catch (error) {
    console.error('Error fetching welfare trends:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch welfare trends',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
