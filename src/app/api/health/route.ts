import { NextRequest, NextResponse } from 'next/server';
import { getAllWelfareEvents, query } from '@/lib/employee-welfare-db';

// Simple database health check function
async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

export async function GET() {
  try {
    const [events, dbHealthy] = await Promise.all([
      getAllWelfareEvents(),
      healthCheck()
    ]);
    
    return NextResponse.json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      database: dbHealthy ? 'connected' : 'disconnected',
      eventCount: events.length,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Database system error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
