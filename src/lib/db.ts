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

// Welfare Events Database Functions
export async function getAllWelfareEvents(): Promise<WelfareEvent[]> {
  try {
    const result = await query(`
      SELECT 
        id::text, name, avatar_url as "avatarUrl", event_type as "eventType",
        welfare_date as "welfareDate", follow_up_completed as "followUpCompleted", notes,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM welfare_events 
      ORDER BY welfare_date DESC, created_at DESC
    `);
    
    return result.rows.map((row: any) => ({
      ...row,
      welfareDate: new Date(row.welfareDate),
      avatarUrl: row.avatarUrl || '',
      notes: row.notes || '',
    }));
  } catch (error) {
    console.error('Error fetching welfare events:', error);
    throw error;
  }
}

export async function getWelfareEventById(id: string): Promise<WelfareEvent | null> {
  try {
    const result = await query(`
      SELECT 
        id::text, name, avatar_url as "avatarUrl", event_type as "eventType",
        welfare_date as "welfareDate", follow_up_completed as "followUpCompleted", notes,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM welfare_events 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      welfareDate: new Date(row.welfareDate),
      avatarUrl: row.avatarUrl || '',
      notes: row.notes || '',
    };
  } catch (error) {
    console.error('Error fetching welfare event by ID:', error);
    throw error;
  }
}

export async function createWelfareEvent(event: Omit<WelfareEvent, 'id'>): Promise<WelfareEvent> {
  try {
    const result = await query(`
      INSERT INTO welfare_events (
        name, avatar_url, event_type, welfare_date, follow_up_completed, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id::text, name, avatar_url as "avatarUrl", event_type as "eventType",
        welfare_date as "welfareDate", follow_up_completed as "followUpCompleted", notes,
        created_at as "createdAt", updated_at as "updatedAt"
    `, [
      event.name,
      event.avatarUrl || null,
      event.eventType,
      event.welfareDate.toISOString().split('T')[0], // Convert to date string
      event.followUpCompleted || false,
      event.notes || null
    ]);
    
    const row = result.rows[0];
    return {
      ...row,
      welfareDate: new Date(row.welfareDate),
      avatarUrl: row.avatarUrl || '',
      notes: row.notes || '',
    };
  } catch (error) {
    console.error('Error creating welfare event:', error);
    throw error;
  }
}

export async function updateWelfareEvent(id: string, updates: Partial<WelfareEvent>): Promise<WelfareEvent | null> {
  try {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic SET clause
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return;
      
      const dbColumn = key === 'avatarUrl' ? 'avatar_url' 
                    : key === 'eventType' ? 'event_type'
                    : key === 'welfareDate' ? 'welfare_date'
                    : key === 'followUpCompleted' ? 'follow_up_completed'
                    : key;
      
      setParts.push(`${dbColumn} = $${paramIndex++}`);
      
      // Convert Date to string for welfare_date
      if (key === 'welfareDate' && value instanceof Date) {
        values.push(value.toISOString().split('T')[0]);
      } else {
        values.push(value);
      }
    });

    if (setParts.length === 0) {
      return await getWelfareEventById(id);
    }

    values.push(id); // Add ID for WHERE clause

    const result = await query(`
      UPDATE welfare_events 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id::text, name, avatar_url as "avatarUrl", event_type as "eventType",
        welfare_date as "welfareDate", follow_up_completed as "followUpCompleted", notes,
        created_at as "createdAt", updated_at as "updatedAt"
    `, values);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      welfareDate: new Date(row.welfareDate),
      avatarUrl: row.avatarUrl || '',
      notes: row.notes || '',
    };
  } catch (error) {
    console.error('Error updating welfare event:', error);
    throw error;
  }
}

export async function deleteWelfareEvent(id: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM welfare_events WHERE id = $1
    `, [id]);
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting welfare event:', error);
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
