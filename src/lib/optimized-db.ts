/**
 * Enhanced database functions with caching and optimization
 * for 1000+ employee scale
 */

import { appCache, cacheConfig, CacheKeys } from './cache';
import { query } from './employee-welfare-db';
import { EmployeeWithWelfare } from './employee-welfare-types';

export class OptimizedWelfareDB {
  
  /**
   * Get employees with welfare data - cached version
   */
  static async getEmployeesWithWelfare(): Promise<EmployeeWithWelfare[]> {
    const cacheKey = CacheKeys.employees(true);
    const cached = appCache.get<EmployeeWithWelfare[]>(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit: employees with welfare');
      return cached;
    }

    console.log('🔍 Cache miss: fetching employees with welfare from DB');
    
    // Optimized query for 1000+ employees
    const result = await query(`
      SELECT 
        e.id::text,
        e.name,
        e.phone_number as "phoneNumber",
        e.active,
        e.created_at as "createdAt",
        e.updated_at as "updatedAt",
        COALESCE(ws.next_welfare_due, e.created_at + INTERVAL '14 days') as "nextWelfareDue",
        COALESCE(stats.total_activities, 0) as "totalActivities",
        stats.last_activity_date as "lastActivityDate",
        stats.days_since_last_welfare as "daysSinceLastWelfare",
        CASE 
          WHEN e.active = true AND (
            -- No welfare activities and created more than 30 days ago
            (stats.last_activity_date IS NULL AND e.created_at < CURRENT_DATE - INTERVAL '30 days') OR
            -- Last welfare check was more than 30 days ago  
            (stats.last_activity_date IS NOT NULL AND stats.last_activity_date < CURRENT_DATE - INTERVAL '30 days')
          )
          THEN true 
          ELSE false 
        END as "isOverdue"
      FROM employees e
      LEFT JOIN welfare_schedules ws ON e.id = ws.employee_id
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*) as total_activities,
          MAX(activity_date) as last_activity_date,
          CURRENT_DATE - MAX(activity_date) as days_since_last_welfare
        FROM welfare_activities 
        WHERE employee_id = e.id
      ) stats ON true
      ORDER BY e.active DESC, COALESCE(ws.next_welfare_due, e.created_at + INTERVAL '14 days') ASC
    `);

    const employees = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      phoneNumber: row.phoneNumber,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      nextDue: new Date(row.nextWelfareDue),
      totalActivities: parseInt(row.totalActivities) || 0,
      lastActivityDate: row.lastActivityDate ? new Date(row.lastActivityDate) : undefined,
      isOverdue: row.isOverdue || false,
      daysSinceLastWelfare: row.daysSinceLastWelfare || undefined,
      recentActivities: [] // Load on-demand
    }));

    // Cache the result
    appCache.set(cacheKey, employees, cacheConfig.employees);
    
    return employees;
  }

  /**
   * Get dashboard statistics - cached and optimized
   */
  static async getDashboardStats() {
    const cacheKey = CacheKeys.dashboardStats();
    const cached = appCache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit: dashboard stats');
      return cached;
    }

    console.log('🔍 Cache miss: calculating dashboard stats');

    // Single query for all dashboard stats
    const result = await query(`
      WITH employee_stats AS (
        SELECT 
          COUNT(*) as total_employees,
          COUNT(*) FILTER (WHERE active = true) as active_employees,
          COUNT(*) FILTER (
            WHERE active = true 
            AND COALESCE(
              (SELECT next_welfare_due FROM welfare_schedules WHERE employee_id = employees.id),
              created_at + INTERVAL '14 days'
            ) < CURRENT_DATE
          ) as overdue_count,
          COUNT(*) FILTER (
            WHERE active = true 
            AND DATE(COALESCE(
              (SELECT next_welfare_due FROM welfare_schedules WHERE employee_id = employees.id),
              created_at + INTERVAL '14 days'
            )) = CURRENT_DATE
          ) as due_today_count
        FROM employees
      ),
      activity_stats AS (
        SELECT 
          COUNT(*) FILTER (
            WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days'
            AND status = 'completed'
          ) as completed_this_week
        FROM welfare_activities
      )
      SELECT * FROM employee_stats, activity_stats
    `);

    const stats = result.rows[0];
    
    const dashboardStats = {
      totalEmployees: parseInt(stats.total_employees) || 0,
      activeEmployees: parseInt(stats.active_employees) || 0,
      overdueCount: parseInt(stats.overdue_count) || 0,
      dueTodayCount: parseInt(stats.due_today_count) || 0,
      completedThisWeek: parseInt(stats.completed_this_week) || 0
    };

    // Cache for 5 minutes
    appCache.set(cacheKey, dashboardStats, cacheConfig.dashboardStats);
    
    return dashboardStats;
  }

  /**
   * Invalidate relevant caches when data changes
   * Now includes analytics cache invalidation for real-time updates
   */
  static invalidateCaches(type: 'employee' | 'activity' | 'analytics' | 'all') {
    switch (type) {
      case 'employee':
        appCache.invalidate('employees:.*');
        appCache.invalidate('dashboard:.*');
        // Employee changes affect risk scores and executive summary
        appCache.invalidate('analytics:risk-scores');
        appCache.invalidate('analytics:executive-summary');
        break;
      case 'activity':
        appCache.invalidate('activities:.*');
        appCache.invalidate('dashboard:.*');
        appCache.invalidate('employee:.*:history');
        // Activity changes affect all analytics
        appCache.invalidate('analytics:.*');
        break;
      case 'analytics':
        // Force refresh all analytics data
        appCache.invalidate('analytics:.*');
        break;
      case 'all':
        appCache.clear();
        break;
    }
  }
}

/**
 * Analytics-focused queries for future reporting features
 */
export class AnalyticsDB {
  
  /**
   * Get welfare completion trends over time
   */
  static async getCompletionTrends(days: number = 30) {
    return await query(`
      SELECT 
        DATE(activity_date) as date,
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(DISTINCT employee_id) as unique_employees,
        AVG(EXTRACT(DAY FROM activity_date - LAG(activity_date) OVER (
          PARTITION BY employee_id ORDER BY activity_date
        ))) as avg_cycle_days
      FROM welfare_activities 
      WHERE activity_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(activity_date)
      ORDER BY date DESC
    `);
  }

  /**
   * Get employee welfare performance metrics
   */
  static async getEmployeeMetrics() {
    return await query(`
      SELECT 
        e.id::text,
        e.name,
        COUNT(wa.id) as total_checks,
        COUNT(wa.id) FILTER (WHERE wa.status = 'completed') as completed_checks,
        AVG(EXTRACT(DAY FROM wa.activity_date - LAG(wa.activity_date) OVER (
          PARTITION BY e.id ORDER BY wa.activity_date
        ))) as avg_cycle_days,
        MAX(wa.activity_date) as last_check_date,
        CURRENT_DATE - MAX(wa.activity_date) as days_since_last_check
      FROM employees e
      LEFT JOIN welfare_activities wa ON e.id = wa.employee_id
      WHERE e.active = true
      GROUP BY e.id, e.name
      ORDER BY days_since_last_check DESC NULLS LAST
    `);
  }

  /**
   * Get overdue patterns for predictive analytics
   */
  static async getOverduePatterns() {
    return await query(`
      SELECT 
        EXTRACT(DOW FROM ws.next_welfare_due) as day_of_week,
        EXTRACT(HOUR FROM ws.next_welfare_due) as hour_of_day,
        COUNT(*) as overdue_count,
        AVG(CURRENT_DATE - ws.next_welfare_due) as avg_overdue_days
      FROM welfare_schedules ws
      JOIN employees e ON ws.employee_id = e.id
      WHERE e.active = true 
        AND ws.next_welfare_due < CURRENT_DATE
      GROUP BY EXTRACT(DOW FROM ws.next_welfare_due), EXTRACT(HOUR FROM ws.next_welfare_due)
      ORDER BY overdue_count DESC
    `);
  }
}
