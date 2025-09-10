#!/usr/bin/env node

/**
 * Data Migration Utility for Welfare Tracker
 * 
 * This script helps migrate JSON data for production deployment.
 * Usage:
 *   node scripts/migrate-data.js export    # Export current data
 *   node scripts/migrate-data.js import    # Import data from JSON
 */

const fs = require('fs').promises;
const path = require('path');

const JSON_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'welfare-events.json');

async function exportData() {
  try {
    const data = await fs.readFile(JSON_FILE_PATH, 'utf-8');
    const compactData = JSON.stringify(JSON.parse(data));
    
    console.log('=== WELFARE EVENTS DATA ===');
    console.log('Copy this to your production environment variable WELFARE_EVENTS_DATA:');
    console.log('');
    console.log(compactData);
    console.log('');
    console.log('=== END DATA ===');
    
    // Also save to a backup file
    const backupPath = path.join(process.cwd(), 'welfare-events-backup.json');
    await fs.writeFile(backupPath, data);
    console.log(`Backup saved to: ${backupPath}`);
    
  } catch (error) {
    console.error('Error exporting data:', error.message);
    process.exit(1);
  }
}

async function importData() {
  const envData = process.env.WELFARE_EVENTS_DATA;
  
  if (!envData) {
    console.error('No WELFARE_EVENTS_DATA environment variable found');
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(envData);
    const formattedData = JSON.stringify(data, null, 2);
    
    await fs.writeFile(JSON_FILE_PATH, formattedData);
    console.log('Data imported successfully from environment variable');
    
  } catch (error) {
    console.error('Error importing data:', error.message);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'export':
      await exportData();
      break;
    case 'import':
      await importData();
      break;
    default:
      console.log('Usage:');
      console.log('  node scripts/migrate-data.js export    # Export current data');
      console.log('  node scripts/migrate-data.js import    # Import data from env var');
      process.exit(1);
  }
}

main().catch(console.error);
