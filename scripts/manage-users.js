import { getAllUsers, getUserByUsername } from '../src/lib/db.ts';
import { query } from '../src/lib/db.ts';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function resetUserPassword(username, newPassword) {
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password in the database
    const result = await query(`
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE username = $2 AND active = true
      RETURNING id::text, username, name, role, active
    `, [hashedPassword, username]);
    
    if (result.rows.length === 0) {
      throw new Error(`User '${username}' not found or not active`);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 Fetching all users from database...\n');
    
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log('👥 Current users in database:');
    users.forEach(user => {
      console.log(`   - ID: ${user.id}`);
      console.log(`     Username: ${user.username}`);
      console.log(`     Name: ${user.name}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Active: ${user.active}`);
      console.log('');
    });
    
    // Get the first active user or create a default one
    let targetUser = users.find(user => user.active);
    
    if (!targetUser && users.length > 0) {
      targetUser = users[0];
    }
    
    if (!targetUser) {
      console.log('❌ No suitable user found to reset password');
      return;
    }
    
    console.log(`🔑 Resetting password for user: ${targetUser.username}`);
    console.log(`    New password: Ashridge@2025!\n`);
    
    const updatedUser = await resetUserPassword(targetUser.username, 'Ashridge@2025!');
    
    console.log('✅ Password reset successful!');
    console.log(`   Username: ${updatedUser.username}`);
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Password: Ashridge@2025!`);
    console.log('\n🎯 You can now login with these credentials!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
