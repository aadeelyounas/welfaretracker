import { query } from '../src/lib/db.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function migrateToEmployeeWelfareSystem() {
  try {
    console.log('🔄 Starting migration to employee-based welfare tracking...\n');
    
    // Step 1: Get existing welfare events
    console.log('📋 Step 1: Fetching existing welfare events...');
    const existingEvents = await query(`
      SELECT * FROM welfare_events ORDER BY welfare_date DESC
    `);
    
    console.log(`   Found ${existingEvents.rows.length} existing welfare events\n`);
    
    // Step 2: Apply new schema
    console.log('🏗️  Step 2: Applying new database schema...');
    
    // Read and execute the new schema
    const fs = await import('fs');
    const path = await import('path');
    const schemaPath = path.join(process.cwd(), 'src/database/simple-welfare-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    await query(schemaSql);
    console.log('   ✅ New schema applied successfully\n');
    
    // Step 3: Migrate existing data
    console.log('📦 Step 3: Migrating existing welfare events...');
    
    const employeeMap = new Map();
    
    for (const event of existingEvents.rows) {
      // Create employee if not exists
      if (!employeeMap.has(event.name)) {
        const employeeResult = await query(`
          INSERT INTO employees (name) 
          VALUES ($1) 
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [event.name]);
        
        if (employeeResult.rows.length > 0) {
          employeeMap.set(event.name, employeeResult.rows[0].id);
        } else {
          // Employee already exists, get ID
          const existingEmployee = await query(`
            SELECT id FROM employees WHERE name = $1 LIMIT 1
          `, [event.name]);
          employeeMap.set(event.name, existingEmployee.rows[0].id);
        }
      }
      
      const employeeId = employeeMap.get(event.name);
      
      // Calculate cycle number for this employee
      const cycleResult = await query(`
        SELECT COUNT(*) as count FROM welfare_activities WHERE employee_id = $1
      `, [employeeId]);
      
      const cycleNumber = cycleResult.rows[0].count + 1;
      
      // Insert welfare activity
      await query(`
        INSERT INTO welfare_activities (
          employee_id, welfare_type, activity_date, status, notes, cycle_number
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        employeeId,
        event.event_type || 'Welfare Call',
        event.welfare_date,
        event.follow_up_completed ? 'completed' : 'pending',
        event.notes,
        cycleNumber
      ]);
    }
    
    console.log(`   ✅ Migrated ${existingEvents.rows.length} welfare events\n`);
    
    // Step 4: Set up welfare schedules
    console.log('⏰ Step 4: Setting up welfare schedules...');
    
    const employees = await query(`SELECT id FROM employees WHERE active = true`);
    
    for (const employee of employees.rows) {
      // Get the latest activity for this employee
      const latestActivity = await query(`
        SELECT activity_date 
        FROM welfare_activities 
        WHERE employee_id = $1 
        ORDER BY activity_date DESC 
        LIMIT 1
      `, [employee.id]);
      
      const lastDate = latestActivity.rows.length > 0 
        ? new Date(latestActivity.rows[0].activity_date)
        : new Date();
      
      const nextDue = new Date(lastDate);
      nextDue.setDate(nextDue.getDate() + 14);
      
      // Welfare schedule should be created automatically by trigger, but let's ensure it exists
      await query(`
        INSERT INTO welfare_schedules (employee_id, current_cycle_start, next_welfare_due)
        VALUES ($1, $2, $3)
        ON CONFLICT (employee_id) DO UPDATE SET
          current_cycle_start = $2,
          next_welfare_due = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [employee.id, lastDate.toISOString().split('T')[0], nextDue.toISOString().split('T')[0]]);
    }
    
    console.log(`   ✅ Set up welfare schedules for ${employees.rows.length} employees\n`);
    
    // Step 5: Generate summary
    console.log('📊 Migration Summary:');
    
    const employeeCount = await query(`SELECT COUNT(*) as count FROM employees WHERE active = true`);
    const activityCount = await query(`SELECT COUNT(*) as count FROM welfare_activities`);
    const scheduleCount = await query(`SELECT COUNT(*) as count FROM welfare_schedules WHERE active = true`);
    const overdueCount = await query(`SELECT COUNT(*) as count FROM welfare_schedules WHERE next_welfare_due < CURRENT_DATE AND active = true`);
    
    console.log(`   👥 Active Employees: ${employeeCount.rows[0].count}`);
    console.log(`   📋 Total Welfare Activities: ${activityCount.rows[0].count}`);
    console.log(`   ⏰ Active Welfare Schedules: ${scheduleCount.rows[0].count}`);
    console.log(`   🚨 Overdue Welfare Checks: ${overdueCount.rows[0].count}`);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n🔄 New Features Available:');
    console.log('   • Employee-based welfare tracking');
    console.log('   • Automated 14-day welfare cycles');
    console.log('   • Complete welfare history per employee');
    console.log('   • Overdue welfare detection');
    console.log('   • Cycle counting and statistics');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateToEmployeeWelfareSystem();
