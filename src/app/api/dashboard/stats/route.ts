/**
 * Optimized dashboard statistics API
 * Cached and aggregated for better performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { OptimizedWelfareDB } from '@/lib/optimized-db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Fetching dashboard statistics...');
    
    const stats = await OptimizedWelfareDB.getDashboardStats();
    
    console.log(`GET /api/dashboard/stats completed in ${Date.now() - startTime}ms`);
    
    const response = NextResponse.json(stats);
    
    // Cache dashboard stats for 5 minutes
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return response;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
