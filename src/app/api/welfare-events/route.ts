
import { NextRequest, NextResponse } from 'next/server';
import { getAllWelfareEvents, createWelfareEvent } from '@/lib/db';
import { WelfareEvent } from '@/lib/types';
import { OptimizedWelfareDB } from '@/lib/optimized-db';
import { z } from 'zod';

// Modern welfare event schema
const welfareEventSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string().optional(),
  eventType: z.enum(['Welfare Call', 'Welfare Visit', 'Dog Handler Welfare', 'Mental Health Check', 'General Welfare']),
  welfareDate: z.string().refine((val) => !isNaN(Date.parse(val)), {message: "Invalid date format"}),
  status: z.enum(['pending', 'completed', 'overdue', 'cancelled']).optional(),
  outcome: z.enum(['positive', 'concerns_raised', 'follow_up_required', 'escalated']).optional(),
  notes: z.string().optional(),
  conductedBy: z.string().optional(),
  // Legacy fields for backward compatibility
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  followUpCompleted: z.boolean().optional(),
});

const welfareEventArraySchema = z.array(welfareEventSchema);

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const employeeId = searchParams.get('employeeId');

  try {
    console.log('🔍 Fetching welfare events...');
    
    const events = await getAllWelfareEvents();
    
    // Filter by employeeId if provided
    let filteredEvents = events;
    if (employeeId) {
      filteredEvents = events.filter(event => 
        String(event.employeeId) === String(employeeId)
      );
    }
    
    console.log(`GET /api/welfare-events completed in ${Date.now() - startTime}ms`);
    
    if (format === 'raw') {
      const rawData = JSON.stringify(filteredEvents, null, 2);
      return new Response(rawData, {
        headers: { 
          'Content-Type': 'application/json',
          // Cache for 15 minutes for raw data (used less frequently)
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=450'
        },
      });
    }

    const response = NextResponse.json(filteredEvents);
    
    // Cache for 5 minutes - welfare events update frequently
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=150');
    
    return response;
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ message: 'Error fetching events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'import') {
    try {
      console.log('🔍 Importing welfare events...');
      
      const body = await request.json();
      const validation = welfareEventArraySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ 
          message: 'Invalid JSON data provided.', 
          errors: validation.error.flatten() 
        }, { status: 400 });
      }
      
      // Import events one by one to PostgreSQL
      for (const event of body) {
        await createWelfareEvent({
          employeeId: event.employeeId || '',
          eventType: event.eventType,
          welfareDate: new Date(event.welfareDate),
          dueDate: new Date(event.welfareDate),
          status: event.status || 'completed',
          outcome: event.outcome || 'positive',
          notes: event.notes || '',
          conductedBy: event.conductedBy || '',
          conductedByName: event.conductedByName || '',
          createdAt: new Date().toISOString(),
          // Legacy fields for backward compatibility
          name: event.name || event.employeeName,
          avatarUrl: event.avatarUrl || '',
          followUpCompleted: event.followUpCompleted || (event.status === 'completed'),
        });
      }
      
      // Invalidate all caches after bulk import
      OptimizedWelfareDB.invalidateCaches('all');
      
      console.log(`POST /api/welfare-events (import) completed in ${Date.now() - startTime}ms`);
      
      return NextResponse.json({ message: 'Data imported successfully.' });
    } catch (error) {
      console.error('Error importing data:', error);
      return NextResponse.json({ message: 'Error importing data.' }, { status: 500 });
    }
  }
    
  try {
    console.log('🔍 Creating welfare event...');
    
    const newEvent = await request.json();

    const fullEvent = await createWelfareEvent({
      employeeId: newEvent.employeeId,
      eventType: newEvent.eventType,
      welfareDate: new Date(newEvent.welfareDate),
      dueDate: newEvent.dueDate ? new Date(newEvent.dueDate) : new Date(newEvent.welfareDate),
      status: newEvent.status || 'completed',
      outcome: newEvent.outcome || 'positive',
      notes: newEvent.notes || '',
      conductedBy: newEvent.conductedBy || '',
      conductedByName: newEvent.conductedByName || '',
      createdAt: new Date().toISOString(),
      // Legacy fields for backward compatibility
      name: newEvent.name,
      avatarUrl: newEvent.avatarUrl || `https://picsum.photos/100/100?${Date.now()}`,
      followUpCompleted: newEvent.followUpCompleted || (newEvent.status === 'completed'),
    });

    // Invalidate activity and dashboard caches after new event
    OptimizedWelfareDB.invalidateCaches('activity');
    
    console.log(`POST /api/welfare-events completed in ${Date.now() - startTime}ms`);

    return NextResponse.json(fullEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ message: 'Error creating event' }, { status: 500 });
  }
}