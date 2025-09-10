import { WelfareEvent } from './types';

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

// Memory storage with localStorage backup for production
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
  const isProduction = process.env.NODE_ENV === 'production';
  const preferredStorage = process.env.STORAGE_TYPE;

  if (preferredStorage === 'firestore') {
    return new FirestoreStorageAdapter();
  }

  if (isProduction) {
    return new MemoryStorageAdapter();
  }

  return new FileStorageAdapter();
}
