#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const { initializeDatabase, migrateFromJSON } = require('./src/database/init.ts');

async function main() {
  try {
    console.log('🚀 Starting database setup...');
    
    await initializeDatabase();
    await migrateFromJSON();
    
    console.log('✅ Database setup completed successfully!');
    console.log('🔐 Default admin credentials:');
    console.log('   Username: ashridge');
    console.log('   Password: Ashridge@!2025');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

main();
