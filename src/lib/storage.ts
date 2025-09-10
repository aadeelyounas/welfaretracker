import { WelfareEvent } from './types';
import { PostgreSQLStorageAdapter } from './postgres-storage';

// Abstract storage interface
export interface StorageAdapter {
  getEvents(): Promise<WelfareEvent[]>;
  saveEvents(events: WelfareEvent[]): Promise<void>;
  isProduction(): boolean;
}

// Local file storage for development
export class FileStorageAdapter implements StorageAdapter {
  private jsonFilePath: string;

  constructor() {
    const path = require('path');
    this.jsonFilePath = path.join(process.cwd(), 'src', 'data', 'welfare-events.json');
  }

  async getEvents(): Promise<WelfareEvent[]> {
    try {
      const fs = require('fs/promises');
      const data = await fs.readFile(this.jsonFilePath, 'utf-8');
      const events: WelfareEvent[] = JSON.parse(data);
      return events.map(event => ({
        ...event,
        welfareDate: new Date(event.welfareDate),
      }));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      console.error('Error reading welfare events:', error);
      throw new Error('Could not read welfare events data.');
    }
  }

  async saveEvents(events: WelfareEvent[]): Promise<void> {
    try {
      const fs = require('fs/promises');
      const data = JSON.stringify(events, null, 2);
      await fs.writeFile(this.jsonFilePath, data, 'utf-8');
    } catch (error) {
      console.error('Error writing welfare events:', error);
      throw new Error('Could not save welfare events data.');
    }
  }

  isProduction(): boolean {
    return false;
  }
}

// PostgreSQL storage adapter wrapper
export class PostgreSQLStorageAdapterWrapper implements StorageAdapter {
  private pgAdapter: PostgreSQLStorageAdapter;

  constructor() {
    this.pgAdapter = new PostgreSQLStorageAdapter();
  }

  async getEvents(): Promise<WelfareEvent[]> {
    try {
      return await this.pgAdapter.getAllWelfareEvents();
    } catch (error) {
      console.error('PostgreSQL storage error:', error);
      throw new Error('Could not fetch welfare events from database.');
    }
  }

  async saveEvents(events: WelfareEvent[]): Promise<void> {
    try {
      // Note: This method is primarily for backward compatibility
      // Direct PostgreSQL operations should use the PostgreSQLStorageAdapter methods
      console.warn('saveEvents called on PostgreSQL adapter - consider using direct database operations');
      
      // For now, we'll just validate the connection
      const isHealthy = await this.pgAdapter.healthCheck();
      if (!isHealthy) {
        throw new Error('Database connection unhealthy');
      }
    } catch (error) {
      console.error('PostgreSQL storage error:', error);
      throw new Error('Could not save welfare events to database.');
    }
  }

  isProduction(): boolean {
    return true;
  }

  // Expose the PostgreSQL adapter for direct database operations
  getPostgreSQLAdapter(): PostgreSQLStorageAdapter {
    return this.pgAdapter;
  }
}

// Memory storage with localStorage backup for production fallback
export class MemoryStorageAdapter implements StorageAdapter {
  private events: WelfareEvent[] = [];
  private initialized = false;

  private async initializeFromEnvironment(): Promise<void> {
    if (this.initialized) return;

    // Try to load from environment variable (for production)
    const envData = process.env.WELFARE_EVENTS_DATA;
    if (envData) {
      try {
        const events = JSON.parse(envData);
        this.events = events.map((event: any) => ({
          ...event,
          welfareDate: new Date(event.welfareDate),
        }));
      } catch (error) {
        console.error('Error parsing WELFARE_EVENTS_DATA:', error);
      }
    }

    // If no environment data, try to load from fallback JSON
    if (this.events.length === 0) {
      try {
        // Import the JSON data as a module (this works in serverless environments)
        const { default: fallbackData } = await import('../data/welfare-events.json');
        this.events = fallbackData.map((event: any) => ({
          ...event,
          welfareDate: new Date(event.welfareDate),
        }));
      } catch (error) {
        console.warn('Could not load fallback data, starting with empty array');
        this.events = [];
      }
    }

    this.initialized = true;
  }

  async getEvents(): Promise<WelfareEvent[]> {
    await this.initializeFromEnvironment();
    return [...this.events]; // Return a copy to prevent mutations
  }

  async saveEvents(events: WelfareEvent[]): Promise<void> {
    await this.initializeFromEnvironment();
    this.events = [...events]; // Store a copy
    
    // In production, log the data for manual backup/migration
    if (this.isProduction()) {
      console.log('WELFARE_EVENTS_BACKUP:', JSON.stringify(events, null, 2));
    }
  }

  isProduction(): boolean {
    return true;
  }
}

// Firebase Firestore storage (most robust production solution)
export class FirestoreStorageAdapter implements StorageAdapter {
  private collectionName = 'welfare-events';

  async getEvents(): Promise<WelfareEvent[]> {
    try {
      // This would require Firebase setup
      // For now, fallback to memory storage
      const memoryAdapter = new MemoryStorageAdapter();
      return await memoryAdapter.getEvents();
    } catch (error) {
      console.error('Firestore error, falling back to memory storage:', error);
      const memoryAdapter = new MemoryStorageAdapter();
      return await memoryAdapter.getEvents();
    }
  }

  async saveEvents(events: WelfareEvent[]): Promise<void> {
    try {
      // This would require Firebase setup
      // For now, fallback to memory storage
      const memoryAdapter = new MemoryStorageAdapter();
      return await memoryAdapter.saveEvents(events);
    } catch (error) {
      console.error('Firestore error, falling back to memory storage:', error);
      const memoryAdapter = new MemoryStorageAdapter();
      return await memoryAdapter.saveEvents(events);
    }
  }

  isProduction(): boolean {
    return true;
  }
}

// Storage factory
export function createStorageAdapter(): StorageAdapter {
  const preferredStorage = process.env.STORAGE_TYPE;
  const isProduction = process.env.NODE_ENV === 'production';
  const isBuildTime = !process.env.DATABASE_URL || process.env.NEXT_PHASE === 'phase-production-build';

  console.log(`🔧 Creating storage adapter: ${preferredStorage || 'auto'}`);

  // During build time, use memory storage to avoid database connections
  if (isBuildTime) {
    console.log('📦 Using Memory storage adapter (build time)');
    return new MemoryStorageAdapter();
  }

  if (preferredStorage === 'postgres' || preferredStorage === 'postgresql') {
    console.log('📊 Using PostgreSQL storage adapter');
    return new PostgreSQLStorageAdapterWrapper();
  }

  if (preferredStorage === 'firestore') {
    console.log('🔥 Using Firestore storage adapter');
    return new FirestoreStorageAdapter();
  }

  if (preferredStorage === 'file') {
    console.log('📁 Using File storage adapter');
    return new FileStorageAdapter();
  }

  if (isProduction) {
    console.log('💾 Using Memory storage adapter (production)');
    return new MemoryStorageAdapter();
  }

  console.log('📁 Using File storage adapter (development)');
  return new FileStorageAdapter();
}

// Helper function to get PostgreSQL adapter directly
export function getPostgreSQLAdapter(): PostgreSQLStorageAdapter {
  // During build time, return a mock adapter
  if (!process.env.DATABASE_URL || process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('⚠️ PostgreSQL adapter requested during build time - returning mock');
    // Return a mock adapter that throws errors for actual database operations
    return {
      getAllWelfareEvents: async () => { throw new Error('Database not available during build'); },
      getWelfareEventById: async () => { throw new Error('Database not available during build'); },
      createWelfareEvent: async () => { throw new Error('Database not available during build'); },
      updateWelfareEvent: async () => { throw new Error('Database not available during build'); },
      deleteWelfareEvent: async () => { throw new Error('Database not available during build'); },
      getUserByUsername: async () => { throw new Error('Database not available during build'); },
      getAllUsers: async () => { throw new Error('Database not available during build'); },
      healthCheck: async () => false,
    } as PostgreSQLStorageAdapter;
  }
  
  return new PostgreSQLStorageAdapter();
}
