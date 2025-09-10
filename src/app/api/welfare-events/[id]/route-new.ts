import { NextResponse } from 'next/server';
import type { WelfareEvent } from '@/lib/types';
import { getPostgreSQLAdapter } from '@/lib/storage';

const pgAdapter = getPostgreSQLAdapter();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const updatedData: Partial<WelfareEvent> = await request.json();
    
    // Convert welfareDate to Date object if provided
    if (updatedData.welfareDate) {
      updatedData.welfareDate = new Date(updatedData.welfareDate);
    }
    
    const updatedEvent = await pgAdapter.updateWelfareEvent(id, updatedData);

    if (!updatedEvent) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ message: 'Error updating event' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = await pgAdapter.deleteWelfareEvent(id);

    if (!success) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ message: 'Error deleting event' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const event = await pgAdapter.getWelfareEventById(id);

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ message: 'Error fetching event' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'toggleFollowUp') {
      const { followUpInterval } = body;
      const eventToUpdate = await pgAdapter.getWelfareEventById(id);

      if (!eventToUpdate) {
        return NextResponse.json({ message: 'Event not found' }, { status: 404 });
      }
      
      // Toggle follow-up status
      const updatedEvent = await pgAdapter.updateWelfareEvent(id, {
        followUpCompleted: !eventToUpdate.followUpCompleted
      });

      let newEvent: WelfareEvent | null = null;

      // If marking as complete, create a new event for the next follow-up
      if (!eventToUpdate.followUpCompleted) {
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + followUpInterval);
        
        newEvent = await pgAdapter.createWelfareEvent({
          name: eventToUpdate.name,
          avatarUrl: eventToUpdate.avatarUrl,
          eventType: eventToUpdate.eventType,
          welfareDate: followUpDate,
          followUpCompleted: false,
          notes: `Scheduled follow-up after completion on ${new Date().toLocaleDateString()}.`,
        });
      }

      return NextResponse.json({ 
        updatedEvent, 
        newEvent,
        message: updatedEvent?.followUpCompleted 
          ? 'Follow-up marked as completed' + (newEvent ? ' and new event scheduled' : '')
          : 'Follow-up reopened'
      });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST action:', error);
    return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
  }
}
