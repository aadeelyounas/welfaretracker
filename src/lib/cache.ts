/**
 * Application-level caching strategy for welfare tracker
 * Reduces database load for frequently accessed data
 */

// Cache keys for different data types
export const CacheKeys = {
  employees: (includeWelfare: boolean) => `employees:${includeWelfare}`,
  dashboardStats: () => 'dashboard:stats',
  activities: (page: number, limit: number) => `activities:${page}:${limit}`,
  employeeHistory: (employeeId: string) => `employee:${employeeId}:history`
} as const;

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class AppCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly defaultTtl = 5 * 60 * 1000; // 5 minutes
  private hits = 0;
  private misses = 0;

  set<T>(key: string, data: T, ttl: number = this.defaultTtl): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return item.data;
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  // Performance monitoring methods
  size(): number {
    return this.cache.size;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate()
    };
  }


}

export const appCache = new AppCache();

// Cache configuration for different data types
export const cacheConfig = {
  employees: 10 * 60 * 1000,      // 10 minutes (changes infrequently)
  dashboardStats: 5 * 60 * 1000,  // 5 minutes (updates with new activities)
  activities: 15 * 60 * 1000,     // 15 minutes (historical data)
  employeeHistory: 30 * 60 * 1000  // 30 minutes (rarely changes)
} as const;
