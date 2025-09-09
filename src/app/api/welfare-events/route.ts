
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import type { WelfareEvent } from '@/lib/types';
import { z } from 'zod';

const jsonFilePath = path.join(process.cwd(), 'src', 'data', 'welfare-events.json');

const welfareEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().url(),
  eventType: z.enum(['Welfare Call', 'Welfare Visit', 'Dog Handler Welfare']),
  welfareDate: z.string().refine((val) => !isNaN(Date.parse(val)), {message: "Invalid date format"}),
  followUpCompleted: z.boolean(),
  notes: z.string(),
});

const welfareEventArraySchema = z.array(welfareEventSchema);


async function getEvents(): Promise<WelfareEvent[]> {
  try {
    const data = await fs.readFile(jsonFilePath, 'utf-8');
    const events: WelfareEvent[] = JSON.parse(data);
    // Dates are stored as strings in JSON, so we need to convert them back to Date objects
    return events.map(event => ({
        ...event,
        welfareDate: new Date(event.welfareDate),
    }));
  } catch (error) {
    // If the file doesn't exist or is empty, return an empty array
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    console.error('Error reading welfare events:', error);
    throw new Error('Could not read welfare events data.');
  }
}

async function saveEvents(events: WelfareEvent[]) {
  try {
    const data = JSON.stringify(events, null, 2);
    await fs.writeFile(jsonFilePath, data, 'utf-8');
  } catch (error) {
    console.error('Error writing welfare events:', error);
    throw new Error('Could not save welfare events data.');
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  if (format === 'raw') {
     try {
      const data = await fs.readFile(jsonFilePath, 'utf-8');
      return new Response(data, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return NextResponse.json({ message: 'Error reading raw event data' }, { status: 500 });
    }
  }

  try {
    const events = await getEvents();
    return NextResponse.json(events);
  } catch (error) {
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
        return NextResponse.json({ message: 'Invalid JSON data provided.', errors: validation.error.flatten() }, { status: 400 });
      }
      await saveEvents(body);
      return NextResponse.json({ message: 'Data imported successfully.' });
    } catch (error) {
      return NextResponse.json({ message: 'Error importing data.' }, { status: 500 });
    }
  }
    
  try {
    const newEvent: Omit<WelfareEvent, 'id' | 'avatarUrl'> = await request.json();
    const events = await getEvents();

    const fullEvent: WelfareEvent = {
        ...newEvent,
        id: `EVT${String(Date.now()).slice(-4)}`,
        avatarUrl: `https://picsum.photos/100/100?${Date.now()}`,
        welfareDate: new Date(newEvent.welfareDate)
    };

    const updatedEvents = [fullEvent, ...events];
    await saveEvents(updatedEvents);

    return NextResponse.json(fullEvent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error creating event' }, { status: 500 });
  }
}