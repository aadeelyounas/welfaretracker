import { Pool, PoolClient } from 'pg';
import { WelfareEvent, User } from './types';

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

// Modern Employee Functions
export async function getAllEmployees(): Promise<any[]> {
  try {
    const result = await query(`
      SELECT 
        e.id::text,
        e.name,
        e.department,
        e.position,
        e.email,
        e.phone,
        e.active,
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM employees e
      WHERE e.active = true
      ORDER BY e.name
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

export async function createEmployee(employee: Omit<any, 'id'>): Promise<any> {
  try {
    const result = await query(`
      INSERT INTO employees (name, department, position, email, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id::text, name, department, position, email, phone, active,
        created_at as "createdAt", updated_at as "updatedAt"
    `, [
      employee.name,
      employee.department || null,
      employee.position || null,
      employee.email || null,
      employee.phone || null
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
}

export async function updateEmployee(id: string, updates: any): Promise<any | null> {
  try {
    const result = await query(`
      UPDATE employees 
      SET 
        name = COALESCE($2, name),
        department = COALESCE($3, department),
        position = COALESCE($4, position),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        active = COALESCE($7, active)
      WHERE id = $1
      RETURNING 
        id::text, name, department, position, email, phone, active,
        created_at as "createdAt", updated_at as "updatedAt"
    `, [
      id,
      updates.name,
      updates.department,
      updates.position,
      updates.email,
      updates.phone,
      updates.active
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    const result = await query(`
      UPDATE employees SET active = false WHERE id = $1
    `, [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}

// Modern Welfare Activity Functions
export async function getAllWelfareEvents(): Promise<WelfareEvent[]> {
  try {
    const result = await query(`
      SELECT 
        id::text, 
        employee_id as "employeeId",
        welfare_type as "eventType",
        activity_date as "welfareDate",
        activity_date as "dueDate",
        status,
        'positive' as outcome,
        conducted_by as "conductedBy",
        conducted_by as "conductedByName",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt",
        -- Legacy fields for backward compatibility
        '' as name,
        '' as "avatarUrl"
      FROM welfare_activities 
      ORDER BY activity_date DESC, created_at DESC
    `);
    
    return result.rows.map((row: any) => ({
      ...row,
      welfareDate: new Date(row.welfareDate),
      dueDate: row.dueDate ? new Date(row.dueDate) : new Date(row.welfareDate),
      avatarUrl: row.avatarUrl || '',
      notes: row.notes || '',
      // Legacy compatibility
      followUpCompleted: row.status === 'completed'
    }));
  } catch (error) {
    console.error('Error fetching welfare activities:', error);
    throw error;
  }
}

export async function createWelfareEvent(event: Omit<WelfareEvent, 'id'>): Promise<WelfareEvent> {
  try {
    const result = await query(`
      INSERT INTO welfare_activities (
        employee_id, welfare_type, activity_date, status, 
        notes, conducted_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id::text,
        employee_id as "employeeId",
        welfare_type as "eventType",
        activity_date as "welfareDate",
        activity_date as "dueDate",
        status,
        notes,
        conducted_by as "conductedBy",
        conducted_by as "conductedByName",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      event.employeeId,
      event.eventType,
      event.welfareDate.toISOString().split('T')[0], // Convert to date string
      event.status || 'completed',
      event.notes || null,
      event.conductedBy || null
    ]);
    
    const row = result.rows[0];
    
    // Fetch employee name if not provided
    let employeeName = '';
    if (row.employeeId) {
      const employeeResult = await query(`
        SELECT name, department FROM employees WHERE id = $1
      `, [row.employeeId]);
      
      if (employeeResult.rows.length > 0) {
        employeeName = employeeResult.rows[0].name;
        row.employeeName = employeeResult.rows[0].name;
        row.department = employeeResult.rows[0].department;
        row.name = employeeResult.rows[0].name;
      }
    }
    
    return {
      ...row,
      welfareDate: new Date(row.welfareDate),
      dueDate: row.dueDate ? new Date(row.dueDate) : new Date(row.welfareDate),
      avatarUrl: '',
      notes: row.notes || '',
      outcome: 'positive',
      name: employeeName,
      // Legacy compatibility
      followUpCompleted: row.status === 'completed'
    };
  } catch (error) {
    console.error('Error creating welfare activity:', error);
    throw error;
  }
}

export async function getWelfareEventById(id: string): Promise<WelfareEvent | null> {
  try {
    const result = await query(`
      SELECT 
        wa.id::text,
        wa.employee_id as "employeeId",
        e.name as "employeeName",
        e.department,
        wa.welfare_type as "eventType",
        wa.activity_date as "welfareDate",
        wa.activity_date as "dueDate",
        wa.status,
        'positive' as outcome,
        wa.notes,
        wa.conducted_by as "conductedBy",
        wa.conducted_by as "conductedByName",
        wa.created_at as "createdAt",
        wa.updated_at as "updatedAt",
        -- Legacy fields for backward compatibility
        '' as name,
        '' as "avatarUrl"
      FROM welfare_activities wa
      LEFT JOIN employees e ON wa.employee_id = e.id
      WHERE wa.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      welfareDate: new Date(row.welfareDate),
      dueDate: row.dueDate ? new Date(row.dueDate) : new Date(row.welfareDate),
      // Legacy compatibility
      name: row.employeeName || row.name,
      avatarUrl: row.avatarUrl || '',
      followUpCompleted: row.status === 'completed'
    };
  } catch (error) {
    console.error('Error fetching welfare activity by ID:', error);
    throw error;
  }
}

export async function updateWelfareEvent(id: string, updates: Partial<WelfareEvent>): Promise<WelfareEvent | null> {
  try {
    const result = await query(`
      UPDATE welfare_activities 
      SET 
        welfare_type = COALESCE($2, welfare_type),
        activity_date = COALESCE($3, activity_date),
        status = COALESCE($4, status),
        notes = COALESCE($5, notes),
        conducted_by = COALESCE($6, conducted_by),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id::text,
        employee_id as "employeeId",
        welfare_type as "eventType",
        activity_date as "welfareDate",
        activity_date as "dueDate",
        status,
        notes,
        conducted_by as "conductedBy",
        conducted_by as "conductedByName",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      id,
      updates.eventType,
      updates.welfareDate,
      updates.status,
      updates.notes,
      updates.conductedBy
    ]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    
    // Fetch employee name
    const employeeResult = await query(`
      SELECT name, department FROM employees WHERE id = $1
    `, [row.employeeId]);
    
    return {
      ...row,
      welfareDate: new Date(row.welfareDate),
      dueDate: new Date(row.dueDate),
      outcome: 'positive',
      avatarUrl: '',
      employeeName: employeeResult.rows[0]?.name,
      department: employeeResult.rows[0]?.department,
      // Legacy compatibility
      name: employeeResult.rows[0]?.name,
      followUpCompleted: row.status === 'completed'
    };
  } catch (error) {
    console.error('Error updating welfare activity:', error);
    throw error;
  }
}

export async function deleteWelfareEvent(id: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM welfare_activities WHERE id = $1
    `, [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting welfare activity:', error);
    throw error;
  }
}

// User Database Functions
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

export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await query(`
      SELECT 
        id::text, username, password, role, name, active,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users 
      ORDER BY created_at DESC
    `);
    
    return result.rows.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// Health check
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
