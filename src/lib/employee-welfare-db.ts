import { Pool, PoolClient } from 'pg';
import { Employee, WelfareSchedule, WelfareActivity, EmployeeWithWelfare, WelfareType, ActivityStatus } from './employee-welfare-types';
import { User, WelfareEvent } from './types';

let pool: Pool | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    console.log('🔌 Connecting to PostgreSQL database...');
    
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on('connect', () => {
      console.log('✅ Connected to PostgreSQL database');
    });
    
    pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client', err);
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]): Promise<any> {
  const db = getDatabase();
  const client = await db.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// =================== EMPLOYEE FUNCTIONS ===================

export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const result = await query(`
      SELECT 
        id::text, name, active,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM employees 
      ORDER BY name ASC
    `);
    
    return result.rows.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const result = await query(`
      SELECT 
        id::text, name, active,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM employees 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  } catch (error) {
    console.error('Error fetching employee by ID:', error);
    throw error;
  }
}

export async function createEmployee(name: string): Promise<Employee> {
  try {
    const result = await query(`
      INSERT INTO employees (name) 
      VALUES ($1)
      RETURNING 
        id::text, name, active,
        created_at as "createdAt", updated_at as "updatedAt"
    `, [name]);
    
    const row = result.rows[0];
    return {
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | null> {
  try {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
      
      setParts.push(`${key} = $${paramIndex++}`);
      values.push(value);
    });

    if (setParts.length === 0) {
      return await getEmployeeById(id);
    }

    values.push(id);

    const result = await query(`
      UPDATE employees 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id::text, name, active,
        created_at as "createdAt", updated_at as "updatedAt"
    `, values);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM employees 
      WHERE id = $1
    `, [id]);
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}

// =================== WELFARE SCHEDULE FUNCTIONS ===================

export async function getWelfareScheduleByEmployeeId(employeeId: string): Promise<WelfareSchedule | null> {
  try {
    const result = await query(`
      SELECT 
        id::text, employee_id as "employeeId",
        current_cycle_start as "currentCycleStart",
        next_welfare_due as "nextWelfareDue",
        total_cycles_completed as "totalCyclesCompleted",
        active,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM welfare_schedules 
      WHERE employee_id = $1 AND active = true
    `, [employeeId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      currentCycleStart: new Date(row.currentCycleStart),
      nextWelfareDue: new Date(row.nextWelfareDue),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  } catch (error) {
    console.error('Error fetching welfare schedule:', error);
    throw error;
  }
}

export async function getOverdueWelfareSchedules(): Promise<WelfareSchedule[]> {
  try {
    const result = await query(`
      SELECT 
        id::text, employee_id as "employeeId",
        current_cycle_start as "currentCycleStart",
        next_welfare_due as "nextWelfareDue",
        total_cycles_completed as "totalCyclesCompleted",
        active,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM welfare_schedules 
      WHERE next_welfare_due < CURRENT_DATE AND active = true
      ORDER BY next_welfare_due ASC
    `);
    
    return result.rows.map((row: any) => ({
      ...row,
      currentCycleStart: new Date(row.currentCycleStart),
      nextWelfareDue: new Date(row.nextWelfareDue),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching overdue welfare schedules:', error);
    throw error;
  }
}

// =================== WELFARE ACTIVITY FUNCTIONS ===================

export async function getWelfareActivitiesByEmployeeId(employeeId: string, limit: number = 10): Promise<WelfareActivity[]> {
  try {
    const result = await query(`
      SELECT 
        id::text, employee_id as "employeeId",
        welfare_type as "welfareType", activity_date as "activityDate",
        status, notes, cycle_number as "cycleNumber",
        days_since_last as "daysSinceLast", conducted_by as "conductedBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM welfare_activities 
      WHERE employee_id = $1
      ORDER BY activity_date DESC, created_at DESC
      LIMIT $2
    `, [employeeId, limit]);
    
    return result.rows.map((row: any) => ({
      ...row,
      activityDate: new Date(row.activityDate),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching welfare activities:', error);
    throw error;
  }
}

export async function getAllWelfareActivities(limit: number = 50, offset: number = 0): Promise<WelfareActivity[]> {
  try {
    const result = await query(`
      SELECT 
        wa.id::text, wa.employee_id as "employeeId",
        wa.welfare_type as "welfareType", wa.activity_date as "activityDate",
        wa.status, wa.notes, wa.cycle_number as "cycleNumber",
        wa.days_since_last as "daysSinceLast", wa.conducted_by as "conductedBy",
        wa.created_at as "createdAt", wa.updated_at as "updatedAt",
        e.name as "employeeName"
      FROM welfare_activities wa
      JOIN employees e ON wa.employee_id = e.id
      ORDER BY wa.activity_date DESC, wa.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      employeeId: row.employeeId,
      welfareType: row.welfareType,
      activityDate: new Date(row.activityDate),
      status: row.status,
      notes: row.notes,
      cycleNumber: row.cycleNumber,
      daysSinceLast: row.daysSinceLast,
      conductedBy: row.conductedBy,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      employeeName: row.employeeName, // Extra field for display
    }));
  } catch (error) {
    console.error('Error fetching welfare activities:', error);
    throw error;
  }
}

export async function createWelfareActivity(activity: {
  employeeId: string;
  welfareType: WelfareType;
  activityDate: Date;
  notes?: string;
  conductedBy?: string;
}): Promise<WelfareActivity> {
  try {
    // Calculate cycle number and days since last activity
    const lastActivityResult = await query(`
      SELECT activity_date, cycle_number
      FROM welfare_activities 
      WHERE employee_id = $1 
      ORDER BY activity_date DESC, created_at DESC 
      LIMIT 1
    `, [activity.employeeId]);
    
    let cycleNumber = 1;
    let daysSinceLast = null;
    
    if (lastActivityResult.rows.length > 0) {
      const lastActivity = lastActivityResult.rows[0];
      cycleNumber = lastActivity.cycle_number + 1;
      
      const lastDate = new Date(lastActivity.activity_date);
      const currentDate = new Date(activity.activityDate);
      daysSinceLast = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const result = await query(`
      INSERT INTO welfare_activities (
        employee_id, welfare_type, activity_date, notes, conducted_by, cycle_number, days_since_last
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id::text, employee_id as "employeeId",
        welfare_type as "welfareType", activity_date as "activityDate",
        status, notes, cycle_number as "cycleNumber",
        days_since_last as "daysSinceLast", conducted_by as "conductedBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `, [
      activity.employeeId,
      activity.welfareType,
      activity.activityDate.toISOString().split('T')[0],
      activity.notes || null,
      activity.conductedBy || null,
      cycleNumber,
      daysSinceLast
    ]);
    
    const row = result.rows[0];
    return {
      ...row,
      activityDate: new Date(row.activityDate),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  } catch (error) {
    console.error('Error creating welfare activity:', error);
    throw error;
  }
}

// =================== COMBINED EMPLOYEE + WELFARE FUNCTIONS ===================

export async function getEmployeesWithWelfare(): Promise<EmployeeWithWelfare[]> {
  try {
    const employees = await getAllEmployees();
    const employeesWithWelfare: EmployeeWithWelfare[] = [];
    
    for (const employee of employees) {
      if (!employee.active) continue;
      
      const schedule = await getWelfareScheduleByEmployeeId(employee.id);
      const recentActivities = await getWelfareActivitiesByEmployeeId(employee.id, 5);
      
      const lastActivityDate = recentActivities.length > 0 ? recentActivities[0].activityDate : null;
      const nextDue = schedule?.nextWelfareDue || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const isOverdue = nextDue < new Date();
      
      let daysSinceLastWelfare = null;
      if (lastActivityDate) {
        daysSinceLastWelfare = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      employeesWithWelfare.push({
        ...employee,
        schedule: schedule || undefined,
        recentActivities,
        nextDue,
        totalActivities: recentActivities.length,
        lastActivityDate: lastActivityDate || undefined,
        isOverdue,
        daysSinceLastWelfare: daysSinceLastWelfare || undefined,
      });
    }
    
    return employeesWithWelfare.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
  } catch (error) {
    console.error('Error fetching employees with welfare:', error);
    throw error;
  }
}

// =================== LEGACY COMPATIBILITY FUNCTIONS ===================

export async function getAllWelfareEvents(): Promise<WelfareEvent[]> {
  try {
    const activities = await getAllWelfareActivities();
    
    return activities.map((activity: any) => ({
      id: activity.id,
      employeeId: activity.employeeId,
      employeeName: activity.employeeName || 'Unknown Employee',
      name: activity.employeeName || 'Unknown Employee', // Legacy field
      avatarUrl: `https://picsum.photos/100/100?${activity.employeeId}`,
      eventType: activity.welfareType as 'Welfare Call' | 'Welfare Visit' | 'Dog Handler Welfare',
      welfareDate: activity.activityDate,
      dueDate: activity.activityDate, // Use activity date as due date for legacy
      status: activity.status as 'pending' | 'completed' | 'overdue' | 'cancelled',
      followUpCompleted: activity.status === 'completed', // Legacy field
      notes: activity.notes || '',
      conductedBy: activity.conductedBy,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    }));
  } catch (error) {
    console.error('Error fetching welfare events (legacy):', error);
    throw error;
  }
}

export async function createWelfareEvent(event: Omit<WelfareEvent, 'id'>): Promise<WelfareEvent> {
  try {
    // Find or create employee by name
    let employee = await query(`
      SELECT id::text FROM employees WHERE name = $1 LIMIT 1
    `, [event.name]);
    
    let employeeId: string;
    if (employee.rows.length === 0) {
      const newEmployee = await createEmployee(event.name || 'Unknown Employee');
      employeeId = newEmployee.id;
    } else {
      employeeId = employee.rows[0].id;
    }
    
    // Map event type to welfare type
    const welfareType: WelfareType = ['Welfare Call', 'Welfare Visit', 'Dog Handler Welfare'].includes(event.eventType) 
      ? event.eventType as WelfareType 
      : 'General Welfare';
    
    // Create welfare activity
    const activity = await createWelfareActivity({
      employeeId,
      welfareType,
      activityDate: event.welfareDate,
      notes: event.notes,
    });
    
    return {
      id: activity.id,
      employeeId,
      employeeName: event.name || 'Unknown Employee',
      name: event.name || 'Unknown Employee', // Legacy field
      avatarUrl: event.avatarUrl,
      eventType: activity.welfareType as 'Welfare Call' | 'Welfare Visit' | 'Dog Handler Welfare',
      welfareDate: activity.activityDate,
      dueDate: activity.activityDate, // Use activity date as due date for legacy
      status: activity.status as 'pending' | 'completed' | 'overdue' | 'cancelled',
      followUpCompleted: activity.status === 'completed', // Legacy field
      notes: activity.notes || '',
      conductedBy: activity.conductedBy,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
  } catch (error) {
    console.error('Error creating welfare event (legacy):', error);
    throw error;
  }
}

// =================== USER FUNCTIONS (unchanged) ===================

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const result = await query(`
      SELECT 
        id::text, username, password, role, name, active,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users 
      WHERE username = $1 AND active = true
    `, [username]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    };
  } catch (error) {
    console.error('Error fetching user by username:', error);
    throw error;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows.length > 0 && result.rows[0].health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
