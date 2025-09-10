import { NextResponse } from 'next/server';
import { getAllWelfareEvents, healthCheck } from '@/lib/db';

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
