# Production Deployment Guide

This guide explains how to deploy the Welfare Tracker application to production with proper JSON database handling.

## Overview

The application has been updated with a flexible storage system that can work in both development and production environments:

- **Development**: Uses local JSON file storage
- **Production**: Uses in-memory storage with environment variable backup

## Pre-Deployment Steps

### 1. Export Current Data

Before deploying, export your current welfare events data:

```bash
npm run data:export
```

This will output your data in a format suitable for environment variables and create a backup file.

### 2. Set Environment Variables

In your production environment, set the following variables:

```bash
NODE_ENV=production
STORAGE_TYPE=memory
WELFARE_EVENTS_DATA='[{"id":"EVT001","name":"John Doe",...}]'
```

Copy the exact output from the `data:export` command for `WELFARE_EVENTS_DATA`.

## Deployment Platforms

### Firebase App Hosting

Your `apphosting.yaml` is already configured. Add environment variables in the Firebase Console:

1. Go to Firebase Console → App Hosting
2. Select your site
3. Go to Settings → Environment variables
4. Add:
   - `NODE_ENV`: `production`
   - `STORAGE_TYPE`: `memory`
   - `WELFARE_EVENTS_DATA`: `[your exported data]`

### Vercel

```bash
# Set environment variables
vercel env add NODE_ENV production
vercel env add STORAGE_TYPE memory
vercel env add WELFARE_EVENTS_DATA '[your exported data]'

# Deploy
vercel --prod
```

### Netlify

Add to your `netlify.toml`:

```toml
[build.environment]
NODE_ENV = "production"
STORAGE_TYPE = "memory"
WELFARE_EVENTS_DATA = "[your exported data]"
```

## Data Persistence in Production

### Important Limitations

⚠️ **Data in production is stored in memory only**. This means:

- Data persists during the application session
- Data is lost when the application restarts
- Changes are logged to console for manual backup

### Recommended Production Setup

For a more robust production deployment, consider upgrading to:

1. **Firebase Firestore** (recommended)
2. **PostgreSQL** with services like Supabase or Neon
3. **MongoDB Atlas**
4. **SQLite** with persistent volumes

## Data Backup Strategy

### Automatic Logging

In production, all data changes are logged to the console with the prefix `WELFARE_EVENTS_BACKUP:`. Monitor your application logs to capture data changes.

### Manual Backup

Periodically export data from the production application:

```bash
# Call the API endpoint to get current data
curl -X GET "https://your-app.com/api/welfare-events?format=raw" > backup.json
```

### Regular Backups

Set up a cron job or scheduled function to regularly backup data:

```javascript
// Example backup function
async function backupData() {
  const response = await fetch('/api/welfare-events?format=raw');
  const data = await response.json();
  
  // Send to backup service (email, cloud storage, etc.)
  console.log('BACKUP:', JSON.stringify(data));
}
```

## Storage Upgrade Path

To upgrade to a proper database:

1. Install database dependencies:
   ```bash
   npm install firebase-admin  # For Firestore
   # OR
   npm install @supabase/supabase-js  # For PostgreSQL
   ```

2. Update `src/lib/storage.ts` to implement the database adapter

3. Set `STORAGE_TYPE=firestore` or create a new storage type

## Testing Production Build

Test the production build locally:

```bash
# Build the application
npm run build

# Set production environment
export NODE_ENV=production
export STORAGE_TYPE=memory
export WELFARE_EVENTS_DATA='[your data]'

# Start production server
npm start
```

## Monitoring

Monitor your application for:
- Memory usage (data is stored in RAM)
- Application restarts (data loss events)
- API response times
- Error logs

## Support

If you encounter issues:
1. Check application logs for error messages
2. Verify environment variables are set correctly
3. Test with a minimal dataset first
4. Consider upgrading to a persistent database solution
