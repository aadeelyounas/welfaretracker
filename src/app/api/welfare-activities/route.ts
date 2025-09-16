import { NextRequest, NextResponse } from 'next/server';
import { getAllWelfareActivities, createWelfareActivity, query } from '@/lib/employee-welfare-db';
import { WelfareType } from '@/lib/employee-welfare-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeTotal = searchParams.get('includeTotal') === 'true';
    const employeeId = searchParams.get('employeeId');
    
    if (employeeId) {
      // Get activities for specific employee
      let activitiesQuery = `
        SELECT 
          wa.id,
          wa.employee_id as "employeeId", 
          e.name as "employeeName",
          wa.welfare_type as "welfareType",
          wa.activity_date as "activityDate",
          wa.notes,
          wa.conducted_by as "conductedBy",
          wa.created_at as "createdAt",
          'completed' as status,
          1 as "cycleNumber"
        FROM welfare_activities wa
        JOIN employees e ON wa.employee_id = e.id
        WHERE wa.employee_id = $1
        ORDER BY wa.activity_date DESC, wa.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const activities = await query(activitiesQuery, [employeeId, limit, offset]);
      
      if (includeTotal) {
        const totalResult = await query(
          'SELECT COUNT(*) as count FROM welfare_activities WHERE employee_id = $1', 
          [employeeId]
        );
        
        return NextResponse.json({
          activities: activities.rows,
          total: parseInt(totalResult.rows[0].count),
          limit,
          offset
        });
      } else {
        return NextResponse.json(activities.rows);
      }
    } else {
      // Get all activities (existing behavior)
      if (includeTotal) {
        // Get both activities and total count
        const [activities, totalResult] = await Promise.all([
          getAllWelfareActivities(limit, offset),
          query('SELECT COUNT(*) as count FROM welfare_activities', [])
        ]);
        
        return NextResponse.json({
          activities,
          total: parseInt(totalResult.rows[0].count),
          limit,
          offset
        });
      } else {
        const activities = await getAllWelfareActivities(limit, offset);
        return NextResponse.json(activities);
      }
    }
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
