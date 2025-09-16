/**
 * Simplified Analytics Data Layer
 * Basic analytics without complex PostgreSQL functions
 */

import { appCache, cacheConfig, CacheKeys } from './cache';
import { query } from './employee-welfare-db';

// Analytics Types
export interface WelfareTrend {
  month: Date;
  totalActivities: number;
  completedActivities: number;
  overdueActivities: number;
  activeEmployees: number;
  averageIntervalDays: number;
  completionRate: number;
  completionGrowth: number;
  activityGrowth: number;
}

export interface EmployeeRiskScore {
  employeeId: string;
  employeeName: string;
  nextDue: Date;
  totalActivities: number;
  lastActivityDate: Date | null;
  overdueCount: number;
  completedCount: number;
  averageIntervalDays: number;
  riskScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  recommendation: string;
  daysSinceLastActivity: number | null;
}

export interface PerformanceMetrics {
  summary: {
    totalActivities: number;
    completedActivities: number;
    overdueActivities: number;
    employeesWithActivity: number;
    averageCompletionDays: number;
    overallCompletionRate: number;
  };
  patterns: {
    weekdayActivities: number;
    weekendActivities: number;
    weekdayPercentage: number;
  };
  insights: string[];
}

export interface ExecutiveSummary {
  overallHealth: {
    totalEmployees: number;
    highRiskEmployees: number;
    completionRate: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  keyMetrics: {
    activitiesThisMonth: number;
    overdueActivities: number;
    averageResponseTime: number;
    employeeEngagement: number;
  };
  alerts: Array<{
    type: 'critical' | 'warning' | 'info';
    message: string;
    action?: string;
    employeeId?: string;
  }>;
  recommendations: string[];
}

/**
 * Simplified Analytics Engine with optimized caching
 */
export class WelfareAnalytics {
  
  /**
   * Invalidate all analytics caches for immediate data refresh
   */
  static invalidateAllCaches(): void {
    appCache.invalidate('analytics:.*');
    console.log('🔄 Analytics caches invalidated for real-time refresh');
  }
  
  /**
   * Invalidate specific analytics cache
   */
  static invalidateCache(type: 'trends' | 'risk-scores' | 'performance' | 'executive-summary'): void {
    switch (type) {
      case 'trends':
        appCache.invalidate('analytics:trends:.*');
        break;
      case 'risk-scores':
        appCache.invalidate('analytics:risk-scores');
        break;
      case 'performance':
        appCache.invalidate('analytics:performance:.*');
        break;
      case 'executive-summary':
        appCache.invalidate('analytics:executive-summary');
        break;
    }
    console.log(`🔄 Analytics cache '${type}' invalidated`);
  }
  /**
   * Get basic welfare activity trends
   */
  static async getWelfareTrends(months: number = 6): Promise<WelfareTrend[]> {
    const cacheKey = `analytics:trends:${months}months`;
    const cached = appCache.get<WelfareTrend[]>(cacheKey);
    
    if (cached) {
      console.log(`📦 Cache hit: welfare trends (${months} months)`);
      return cached;
    }

    console.log(`📈 Calculating welfare trends for ${months} months...`);
    
    try {
      const result = await query(`
        SELECT 
          date_trunc('month', activity_date) as month,
          COUNT(*) as total_activities,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_activities,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_activities,
          COUNT(DISTINCT employee_id) as active_employees
        FROM welfare_activities
        WHERE activity_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY date_trunc('month', activity_date)
        ORDER BY month DESC
      `);

      const trends = result.rows.map((row: any) => ({
        month: new Date(row.month),
        totalActivities: parseInt(row.total_activities) || 0,
        completedActivities: parseInt(row.completed_activities) || 0,
        overdueActivities: parseInt(row.overdue_activities) || 0,
        activeEmployees: parseInt(row.active_employees) || 0,
        averageIntervalDays: 14,
        completionRate: row.total_activities > 0 
          ? Math.round((row.completed_activities / row.total_activities) * 100) 
          : 0,
        completionGrowth: 0,
        activityGrowth: 0
      }));

      appCache.set(cacheKey, trends, analyticsCacheConfig.trends);
      return trends;
    } catch (error) {
      console.error('Error calculating welfare trends:', error);
      return [];
    }
  }

  /**
   * Get basic employee risk scores
   */
  static async getEmployeeRiskScores(): Promise<EmployeeRiskScore[]> {
    const cacheKey = 'analytics:risk-scores';
    const cached = appCache.get<EmployeeRiskScore[]>(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit: employee risk scores');
      return cached;
    }

    console.log('🎯 Calculating employee risk scores...');

    try {
      const result = await query(`
        SELECT 
          e.id,
          e.name,
          e.created_at,
          COUNT(wa.id) as total_activities,
          MAX(wa.activity_date) as last_activity_date,
          COUNT(CASE WHEN wa.status = 'overdue' THEN 1 END) as overdue_count,
          COUNT(CASE WHEN wa.status = 'completed' THEN 1 END) as completed_count
        FROM employees e
        LEFT JOIN welfare_activities wa ON e.id = wa.employee_id
        WHERE e.active = true
        GROUP BY e.id, e.name, e.created_at
        ORDER BY e.name
      `);

      const riskScores = result.rows.map((row: any) => {
        const daysSinceLastActivity = row.last_activity_date 
          ? Math.floor((Date.now() - new Date(row.last_activity_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        // Simple risk calculation
        let riskScore = 2.0; // Default low risk
        if (!row.last_activity_date) riskScore = 8.0;
        else if (daysSinceLastActivity && daysSinceLastActivity > 21) riskScore = 9.0;
        else if (daysSinceLastActivity && daysSinceLastActivity > 14) riskScore = 7.0;
        else if (row.overdue_count > 3) riskScore = 6.0;
        else if (row.total_activities > 0 && (row.completed_count / row.total_activities) < 0.8) riskScore = 5.0;

        const riskLevel = riskScore >= 8 ? 'Critical' : 
                         riskScore >= 6 ? 'High' : 
                         riskScore >= 4 ? 'Medium' : 'Low';

        return {
          employeeId: row.id,
          employeeName: row.name,
          nextDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          totalActivities: parseInt(row.total_activities) || 0,
          lastActivityDate: row.last_activity_date ? new Date(row.last_activity_date) : null,
          overdueCount: parseInt(row.overdue_count) || 0,
          completedCount: parseInt(row.completed_count) || 0,
          averageIntervalDays: 14,
          riskScore,
          riskLevel,
          recommendation: riskLevel === 'Critical' ? 'Immediate welfare check required' :
                         riskLevel === 'High' ? 'Schedule welfare check within 48 hours' :
                         riskLevel === 'Medium' ? 'Monitor closely, check due date' :
                         'Continue regular schedule',
          daysSinceLastActivity
        };
      });

      appCache.set(cacheKey, riskScores, analyticsCacheConfig.riskScores);
      return riskScores;
    } catch (error) {
      console.error('Error calculating employee risk scores:', error);
      return [];
    }
  }

  /**
   * Get basic performance metrics
   */
  static async getPerformanceMetrics(dateRange?: { start: Date; end: Date }): Promise<PerformanceMetrics> {
    const cacheKey = 'analytics:performance';
    const cached = appCache.get<PerformanceMetrics>(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit: performance metrics');
      return cached;
    }

    console.log('📊 Calculating performance metrics...');

    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_activities,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_activities,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_activities,
          COUNT(DISTINCT employee_id) as employees_with_activity,
          AVG(CASE WHEN status = 'completed' THEN 
            EXTRACT(DAY FROM activity_date - created_at) 
          END) as avg_completion_days
        FROM welfare_activities
        WHERE activity_date >= CURRENT_DATE - INTERVAL '30 days'
      `);

      const row = result.rows[0];
      const performanceData: PerformanceMetrics = {
        summary: {
          totalActivities: parseInt(row.total_activities) || 0,
          completedActivities: parseInt(row.completed_activities) || 0,
          overdueActivities: parseInt(row.overdue_activities) || 0,
          employeesWithActivity: parseInt(row.employees_with_activity) || 0,
          averageCompletionDays: parseFloat(row.avg_completion_days) || 0,
          overallCompletionRate: row.total_activities > 0 
            ? Math.round((row.completed_activities / row.total_activities) * 100) 
            : 0
        },
        patterns: {
          weekdayActivities: parseInt(row.total_activities) || 0,
          weekendActivities: 0,
          weekdayPercentage: 100
        },
        insights: [
          'Performance data calculated from last 30 days',
          `${row.completed_activities || 0} activities completed successfully`,
          `Average completion time: ${Math.round(row.avg_completion_days || 0)} days`
        ]
      };

      appCache.set(cacheKey, performanceData, analyticsCacheConfig.performance);
      return performanceData;
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      return {
        summary: {
          totalActivities: 0,
          completedActivities: 0,
          overdueActivities: 0,
          employeesWithActivity: 0,
          averageCompletionDays: 0,
          overallCompletionRate: 0
        },
        patterns: {
          weekdayActivities: 0,
          weekendActivities: 0,
          weekdayPercentage: 0
        },
        insights: ['No data available']
      };
    }
  }

  /**
   * Generate executive summary
   */
  static async getExecutiveSummary(): Promise<ExecutiveSummary> {
    const cacheKey = 'analytics:executive-summary';
    const cached = appCache.get<ExecutiveSummary>(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit: executive summary');
      return cached;
    }

    console.log('🎖️ Generating executive summary...');

    try {
      const [riskScores, performance] = await Promise.all([
        this.getEmployeeRiskScores(),
        this.getPerformanceMetrics()
      ]);

      const summary: ExecutiveSummary = {
        overallHealth: {
          totalEmployees: riskScores.length,
          highRiskEmployees: riskScores.filter(emp => 
            emp.riskLevel === 'Critical' || emp.riskLevel === 'High'
          ).length,
          completionRate: performance.summary.overallCompletionRate,
          trend: 'stable'
        },
        keyMetrics: {
          activitiesThisMonth: performance.summary.totalActivities,
          overdueActivities: performance.summary.overdueActivities,
          averageResponseTime: Math.round(performance.summary.averageCompletionDays),
          employeeEngagement: riskScores.length > 0 
            ? Math.round((performance.summary.employeesWithActivity / riskScores.length) * 100)
            : 0
        },
        alerts: [
          ...riskScores
            .filter(emp => emp.riskLevel === 'Critical')
            .slice(0, 3)
            .map(emp => ({
              type: 'critical' as const,
              message: `${emp.employeeName} requires immediate welfare attention`,
              employeeId: emp.employeeId,
              action: 'Schedule welfare check'
            })),
          ...(performance.summary.overdueActivities > 5 ? [{
            type: 'warning' as const,
            message: `${performance.summary.overdueActivities} overdue welfare activities require attention`,
            action: 'Review overdue list'
          }] : [])
        ],
        recommendations: [
          riskScores.filter(emp => emp.riskLevel === 'High').length > 0 
            ? `Focus on ${riskScores.filter(emp => emp.riskLevel === 'High').length} high-risk employees`
            : 'Maintain current welfare schedule',
          'Continue monitoring employee welfare patterns',
          'Review completion rates regularly'
        ].filter(Boolean)
      };

      appCache.set(cacheKey, summary, analyticsCacheConfig.executiveSummary);
      return summary;
    } catch (error) {
      console.error('Error generating executive summary:', error);
      return {
        overallHealth: {
          totalEmployees: 0,
          highRiskEmployees: 0,
          completionRate: 0,
          trend: 'stable'
        },
        keyMetrics: {
          activitiesThisMonth: 0,
          overdueActivities: 0,
          averageResponseTime: 0,
          employeeEngagement: 0
        },
        alerts: [],
        recommendations: ['System temporarily unavailable']
      };
    }
  }
}

// Enhanced cache keys for analytics with shorter TTL for real-time responsiveness
export const AnalyticsCacheKeys = {
  trends: (months: number) => `analytics:trends:${months}months`,
  riskScores: () => 'analytics:risk-scores',
  performance: (start?: Date, end?: Date) => `analytics:performance:${start?.toISOString() || 'default'}:${end?.toISOString() || 'default'}`,
  executiveSummary: () => 'analytics:executive-summary'
} as const;

// Optimized cache TTL for analytics - shorter times for real-time feel
export const analyticsCacheConfig = {
  trends: 5 * 60 * 1000,         // 5 minutes (was 1 hour)
  riskScores: 3 * 60 * 1000,     // 3 minutes (was 30 minutes)  
  performance: 10 * 60 * 1000,   // 10 minutes (was 4 hours)
  executiveSummary: 2 * 60 * 1000 // 2 minutes (was 1 hour)
} as const;
