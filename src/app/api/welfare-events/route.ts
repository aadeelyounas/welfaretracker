
import { NextRequest, NextResponse } from 'next/server';
import { getAllWelfareEvents, createWelfareEvent } from '@/lib/db';
import { WelfareEvent } from '@/lib/types';
import { z } from 'zod';


const welfareEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string(),
  eventType: z.enum(['Welfare Call', 'Welfare Visit', 'Dog Handler Welfare']),
  welfareDate: z.string().refine((val) => !isNaN(Date.parse(val)), {message: "Invalid date format"}),
  followUpCompleted: z.boolean(),
  notes: z.string(),
});

const welfareEventArraySchema = z.array(welfareEventSchema);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  try {
    const events = await getAllWelfareEvents();
    
    if (format === 'raw') {
      const rawData = JSON.stringify(events, null, 2);
      return new Response(rawData, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ message: 'Error fetching events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'import') {
    try {
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
          name: event.name,
          avatarUrl: event.avatarUrl,
          eventType: event.eventType,
          welfareDate: new Date(event.welfareDate),
          followUpCompleted: event.followUpCompleted,
          notes: event.notes,
        });
      }
      
      return NextResponse.json({ message: 'Data imported successfully.' });
    } catch (error) {
      console.error('Error importing data:', error);
      return NextResponse.json({ message: 'Error importing data.' }, { status: 500 });
    }
  }
    
  try {
    const newEvent: Omit<WelfareEvent, 'id' | 'avatarUrl'> = await request.json();

    const fullEvent = await createWelfareEvent({
      name: newEvent.name,
      avatarUrl: `https://picsum.photos/100/100?${Date.now()}`,
      eventType: newEvent.eventType,
      welfareDate: new Date(newEvent.welfareDate),
      followUpCompleted: newEvent.followUpCompleted,
      notes: newEvent.notes,
    });

    return NextResponse.json(fullEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ message: 'Error creating event' }, { status: 500 });
  }
}