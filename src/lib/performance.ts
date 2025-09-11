/**
 * Performance monitoring and optimization utilities
 */

export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();
  
  /**
   * Track API response times
   */
  static trackResponseTime(endpoint: string, startTime: number) {
    const duration = Date.now() - startTime;
    
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    
    const times = this.metrics.get(endpoint)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
    
    // Log slow queries (>1 second)
    if (duration > 1000) {
      console.warn(`⚠️ Slow query detected: ${endpoint} took ${duration}ms`);
    }
    
    return duration;
  }
  
  /**
   * Get performance statistics
   */
  static getStats(endpoint?: string) {
    if (endpoint) {
      const times = this.metrics.get(endpoint) || [];
      return this.calculateStats(times, endpoint);
    }
    
    const allStats: Record<string, any> = {};
    for (const [ep, times] of this.metrics.entries()) {
      allStats[ep] = this.calculateStats(times, ep);
    }
    return allStats;
  }
  
  private static calculateStats(times: number[], endpoint: string) {
    if (times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b) / times.length;
    
    return {
      endpoint,
      count: times.length,
      avg: Math.round(avg),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  /**
   * Memory usage monitoring
   */
  static getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      };
    }
    return null;
  }
}

/**
 * Database query optimization hints
 */
export const QueryOptimizations = {
  
  /**
   * Add EXPLAIN ANALYZE to queries for optimization
   */
  async analyzeQuery(query: string, params?: any[]) {
    // This would be used in development to analyze slow queries
    console.log('🔍 Query Analysis for:', query.substring(0, 100) + '...');
    // In production, you might send this to a monitoring service
  },
  
  /**
   * Suggestions for query optimization
   */
  suggestions: {
    largeDataset: [
      'Use LIMIT and OFFSET for pagination',
      'Add indexes on frequently queried columns',
      'Use materialized views for complex aggregations',
      'Consider read replicas for analytics queries'
    ],
    
    aggregations: [
      'Pre-calculate statistics in scheduled jobs',
      'Use window functions for complex calculations', 
      'Cache frequently requested aggregations',
      'Consider time-based partitioning for large tables'
    ],
    
    joins: [
      'Ensure foreign key indexes exist',
      'Use LATERAL joins for correlated subqueries',
      'Consider denormalization for read-heavy operations',
      'Use CTEs for better query readability'
    ]
  }
};

/**
 * Frontend performance utilities
 */
export const FrontendOptimizations = {
  
  /**
   * Debounce search inputs to reduce API calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },
  
  /**
   * Throttle scroll events for performance
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
  
  /**
   * Virtual scrolling for large lists
   */
  calculateVisibleItems(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan: number = 5
  ) {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex, visibleCount: endIndex - startIndex + 1 };
  }
};
