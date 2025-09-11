/**
 * Phase 3: Analytics Dashboard Components
 * Advanced data visualization and interactive widgets
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  BarChart3
} from 'lucide-react';

// Types for analytics data
interface ExecutiveSummary {
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
    action: string;
    employeeId?: string;
  }>;
  recommendations: string[];
  quickActions?: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    url: string;
  }>;
}

interface WelfareTrend {
  month: Date;
  totalActivities: number;
  completedActivities: number;
  overdueActivities: number;
  completionRate: number;
  completionGrowth: number;
}

interface EmployeeRiskScore {
  employeeId: string;
  employeeName: string;
  riskScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  recommendation: string;
  daysSinceLastActivity: number | null;
}

// Executive Summary Card Component
export function ExecutiveSummaryCard() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Add a small delay to ensure any auth context is loaded
    const timer = setTimeout(() => {
      fetchExecutiveSummary();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchExecutiveSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/summary');
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Executive summary API error:', response.status, errorData);
        throw new Error(`Failed to fetch summary: ${response.status}`);
      }
      
      const result = await response.json();
      setSummary(result.data);
    } catch (err) {
      console.error('Error fetching executive summary:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading executive summary...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full border-red-200">
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{summary.overallHealth.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center">
              {getTrendIcon(summary.overallHealth.trend)}
              <span className="ml-1 text-sm text-gray-600 capitalize">
                {summary.overallHealth.trend}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk Employees</p>
                <p className="text-2xl font-bold text-red-600">{summary.overallHealth.highRiskEmployees}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2">
              <Badge variant={summary.overallHealth.highRiskEmployees > 5 ? "destructive" : "secondary"}>
                {summary.overallHealth.highRiskEmployees > 5 ? 'Needs Attention' : 'Under Control'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">{summary.overallHealth.completionRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <Progress value={summary.overallHealth.completionRate} className="w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Activities</p>
                <p className="text-2xl font-bold text-orange-600">{summary.keyMetrics.overdueActivities}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2">
              <Badge variant={summary.keyMetrics.overdueActivities > 10 ? "destructive" : "outline"}>
                {summary.keyMetrics.overdueActivities > 10 ? 'Action Required' : 'Manageable'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {summary.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Priority Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.alerts.slice(0, 5).map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
                >
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm mt-1">{alert.action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {summary.quickActions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summary.quickActions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{action.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    </div>
                    <Badge 
                      variant={
                        action.priority === 'high' ? 'destructive' : 
                        action.priority === 'medium' ? 'default' : 'outline'
                      }
                    >
                      {action.priority}
                    </Badge>
                  </div>
                  <Button size="sm" className="mt-3 w-full">
                    Take Action
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Risk Score Dashboard Component
export function RiskScoreDashboard() {
  const [riskScores, setRiskScores] = useState<EmployeeRiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('');

  useEffect(() => {
    // Add a small delay to ensure any auth context is loaded
    const timer = setTimeout(() => {
      fetchRiskScores();
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedRiskLevel]);

  const fetchRiskScores = async () => {
    try {
      setLoading(true);
      const url = selectedRiskLevel 
        ? `/api/analytics/risk-scores?riskLevel=${selectedRiskLevel}`
        : '/api/analytics/risk-scores';
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Risk scores API error:', response.status, errorData);
        throw new Error(`Failed to fetch risk scores: ${response.status}`);
      }
      
      const result = await response.json();
      setRiskScores(result.data || []);
    } catch (err) {
      console.error('Error fetching risk scores:', err);
      // Set empty array on error to prevent UI issues
      setRiskScores([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Risk Assessment</CardTitle>
        <div className="flex gap-2 flex-wrap">
          {['', 'Critical', 'High', 'Medium', 'Low'].map((level) => (
            <Button
              key={level}
              variant={selectedRiskLevel === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRiskLevel(level)}
            >
              {level || 'All'}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Calculating risk scores...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {riskScores.map((employee) => (
              <div
                key={employee.employeeId}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{employee.employeeName}</h4>
                  <p className="text-sm text-gray-600 mt-1">{employee.recommendation}</p>
                  {employee.daysSinceLastActivity !== null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last activity: {employee.daysSinceLastActivity} days ago
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge className={getRiskColor(employee.riskLevel)}>
                    {employee.riskLevel}
                  </Badge>
                  <p className="text-sm font-mono mt-1">
                    Score: {employee.riskScore.toFixed(1)}/10
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ExecutiveSummaryCard;
