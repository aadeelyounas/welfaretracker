
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import type { WelfareEvent } from '@/lib/types';

const jsonFilePath = path.join(process.cwd(), 'src', 'data', 'welfare-events.json');

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

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
