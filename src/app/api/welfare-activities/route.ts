import { NextRequest, NextResponse } from 'next/server';
import { getAllWelfareActivities, createWelfareActivity } from '@/lib/employee-welfare-db';
import { WelfareType } from '@/lib/employee-welfare-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const activities = await getAllWelfareActivities(limit);
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching welfare activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch welfare activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, welfareType, activityDate, notes, conductedBy } = body;
    
    // Validate required fields
    if (!employeeId || !welfareType || !activityDate) {
      return NextResponse.json(
        { error: 'employeeId, welfareType, and activityDate are required' },
        { status: 400 }
      );
    }
    
    // Validate welfare type
    const validTypes: WelfareType[] = [
      'Welfare Call', 
      'Welfare Visit', 
      'Dog Handler Welfare', 
      'Mental Health Check', 
      'General Welfare'
    ];
    
    if (!validTypes.includes(welfareType)) {
      return NextResponse.json(
        { error: 'Invalid welfare type' },
        { status: 400 }
      );
    }
    
    const activity = await createWelfareActivity({
      employeeId,
      welfareType,
      activityDate: new Date(activityDate),
      notes: notes || undefined,
      conductedBy: conductedBy || undefined,
    });
    
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Error creating welfare activity:', error);
    return NextResponse.json(
      { error: 'Failed to create welfare activity' },
      { status: 500 }
    );
  }
}
