
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import type { WelfareEvent } from '@/lib/types';

const jsonFilePath = path.join(process.cwd(), 'src', 'data', 'welfare-events.json');

async function getEvents(): Promise<WelfareEvent[]> {
  try {
    const data = await fs.readFile(jsonFilePath, 'utf-8');
    const events: WelfareEvent[] = JSON.parse(data);
    return events.map(event => ({
        ...event,
        welfareDate: new Date(event.welfareDate),
    }));
  } catch (error) {
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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const updatedData: Partial<WelfareEvent> = await request.json();
    const events = await getEvents();
    
    let eventUpdated = false;
    const updatedEvents = events.map(event => {
      if (event.id === id) {
        eventUpdated = true;
        return { ...event, ...updatedData, welfareDate: new Date(updatedData.welfareDate || event.welfareDate) };
      }
      return event;
    });

    if (!eventUpdated) {
        return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    await saveEvents(updatedEvents);
    return NextResponse.json(updatedEvents.find(e => e.id === id));
  } catch (error) {
    return NextResponse.json({ message: 'Error updating event' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const events = await getEvents();
        const filteredEvents = events.filter(event => event.id !== id);

        if (events.length === filteredEvents.length) {
            return NextResponse.json({ message: 'Event not found' }, { status: 404 });
        }

        await saveEvents(filteredEvents);
        return NextResponse.json({ message: 'Event deleted' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting event' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string; action?: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    if (body.action === 'toggleFollowUp') {
      const { followUpInterval } = body;
      let events = await getEvents();
      const eventToUpdate = events.find(e => e.id === id);

      if (!eventToUpdate) {
        return NextResponse.json({ message: 'Event not found' }, { status: 404 });
      }
      
      let newEvent: WelfareEvent | null = null;
      
      const updatedEvents = events.map(e => {
        if (e.id === id) {
          return { ...e, followUpCompleted: !e.followUpCompleted };
        }
        return e;
      });

      // If marking as complete, create a new event for the next follow-up
      if (!eventToUpdate.followUpCompleted) {
        newEvent = {
          ...eventToUpdate,
          id: `EVT${String(Date.now()).slice(-4)}`,
          welfareDate: new Date(new Date().getTime() + followUpInterval * 24 * 60 * 60 * 1000),
          followUpCompleted: false,
          notes: `Scheduled follow-up after completion on ${new Date().toLocaleDateString()}.`,
        };
        updatedEvents.push(newEvent);
      }
      
      await saveEvents(updatedEvents);
      return NextResponse.json({ updatedEvent: updatedEvents.find(e => e.id === id), newEvent });
    }
    
    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });

  } catch (error) {
      return NextResponse.json({ message: 'Error performing action on event' }, { status: 500 });
  }
}
