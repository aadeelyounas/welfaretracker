/**
 * Phase 2: Advanced Database Connection Management
 * Optimized connection pooling for 1000+ employees and concurrent users
 */

import { Pool, PoolConfig } from 'pg';

// Production-optimized connection pool configuration
const poolConfig: PoolConfig = {
  // Connection limits optimized for enterprise load
  min: 5,                    // Always keep 5 connections warm
  max: 25,                   // Maximum 25 concurrent connections
  
  // Connection lifecycle management
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if can't get connection in 5s
  
  // Health check and retry configuration
  statement_timeout: 30000,   // 30s query timeout
  query_timeout: 25000,      // 25s individual query timeout
  
  // Connection validation
  allowExitOnIdle: false,    // Don't exit process on pool idle
  
  // Performance optimization
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Enhanced pool with monitoring and health checks
class OptimizedDBPool {
  private static pool: Pool;
  private static connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    waitingClients: 0,
    totalQueries: 0,
    totalQueryTime: 0,
    errors: 0
  };

  static getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ...poolConfig
      });

      // Connection event monitoring
      this.pool.on('connect', (client) => {
        this.connectionStats.totalConnections++;
        console.log('📊 Database connection established. Total:', this.connectionStats.totalConnections);
      });

      this.pool.on('acquire', (client) => {
        this.connectionStats.activeConnections++;
        console.log('🔗 Client acquired from pool. Active:', this.connectionStats.activeConnections);
      });

      this.pool.on('release', (client) => {
        this.connectionStats.activeConnections--;
        console.log('🔄 Client released to pool. Active:', this.connectionStats.activeConnections);
      });

      this.pool.on('error', (err, client) => {
        this.connectionStats.errors++;
        console.error('💥 Database pool error:', err);
      });

      // Health check setup
      this.setupHealthCheck();
    }
    
    return this.pool;
  }

  /**
   * Execute query with performance monitoring
   */
  static async query(text: string, params?: any[]) {
    const startTime = Date.now();
    const pool = this.getPool();
    
    try {
      this.connectionStats.totalQueries++;
      const result = await pool.query(text, params);
      
      const queryTime = Date.now() - startTime;
      this.connectionStats.totalQueryTime += queryTime;
      
      if (queryTime > 1000) {
        console.warn(`⚠️ Slow query detected: ${queryTime}ms - ${text.slice(0, 100)}...`);
      }
      
      return result;
    } catch (error) {
      this.connectionStats.errors++;
      console.error('🚨 Query error:', error);
      throw error;
    }
  }

  /**
   * Get connection pool statistics
   */
  static getStats() {
    const pool = this.getPool();
    return {
      ...this.connectionStats,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      },
      averageQueryTime: this.connectionStats.totalQueries > 0 
        ? this.connectionStats.totalQueryTime / this.connectionStats.totalQueries 
        : 0
    };
  }

  /**
   * Health check for connection pool
   */
  private static setupHealthCheck() {
    setInterval(async () => {
      try {
        const pool = this.getPool();
        await pool.query('SELECT 1');
        console.log('💚 Database health check: OK');
      } catch (error) {
        console.error('💥 Database health check failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Graceful shutdown
   */
  static async shutdown() {
    if (this.pool) {
      console.log('🔄 Closing database connection pool...');
      await this.pool.end();
      console.log('✅ Database pool closed successfully');
    }
  }
}

export default OptimizedDBPool;
