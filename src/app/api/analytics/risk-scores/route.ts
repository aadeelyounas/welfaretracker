/**
 * Analytics API - Risk Scores Endpoint  
 * Phase 3: Predictive Employee Risk Assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { WelfareAnalytics } from '@/lib/analytics-db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get('riskLevel'); // Filter by risk level
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log('🎯 Calculating employee risk scores...');
    
    const allRiskScores = await WelfareAnalytics.getEmployeeRiskScores();
    
    // Filter by risk level if specified
    let filteredScores = allRiskScores;
    if (riskLevel && ['Critical', 'High', 'Medium', 'Low'].includes(riskLevel)) {
      filteredScores = allRiskScores.filter(score => score.riskLevel === riskLevel);
    }
    
    // Apply limit
    const limitedScores = filteredScores.slice(0, limit);
    
    // Calculate summary statistics
    const riskSummary = {
      total: allRiskScores.length,
      critical: allRiskScores.filter(s => s.riskLevel === 'Critical').length,
      high: allRiskScores.filter(s => s.riskLevel === 'High').length,
      medium: allRiskScores.filter(s => s.riskLevel === 'Medium').length,
      low: allRiskScores.filter(s => s.riskLevel === 'Low').length,
      averageRiskScore: allRiskScores.reduce((sum, s) => sum + s.riskScore, 0) / allRiskScores.length
    };
    
    console.log(`GET /api/analytics/risk-scores completed in ${Date.now() - startTime}ms`);
    
    const response = NextResponse.json({
      success: true,
      data: limitedScores,
      summary: riskSummary,
      metadata: {
        totalRecords: allRiskScores.length,
        filteredRecords: limitedScores.length,
        filterApplied: riskLevel,
        generatedAt: new Date().toISOString()
      }
    });
    
    // Cache risk scores for 1 hour - they update with new activities
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
    
    return response;
  } catch (error) {
    console.error('Error calculating risk scores:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to calculate employee risk scores',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
