/**
 * React Query hooks for optimized data fetching
 * Implements intelligent caching and background updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeeWithWelfare } from '@/lib/employee-welfare-types';

// Query keys for consistent cache management
export const queryKeys = {
  employees: (includeWelfare: boolean = false) => ['employees', { includeWelfare }],
  dashboardStats: () => ['dashboard', 'stats'],
  activities: (page: number = 1, limit: number = 10) => ['activities', { page, limit }],
  analytics: (type: string, days?: number) => ['analytics', { type, days }],
} as const;

// Custom hooks for data fetching

/**
 * Hook for fetching employees with optimized caching
 */
export function useEmployees(includeWelfare: boolean = false) {
  return useQuery({
    queryKey: queryKeys.employees(includeWelfare),
    queryFn: async (): Promise<EmployeeWithWelfare[]> => {
      const endpoint = includeWelfare ? '/api/employees-optimized?includeWelfare=true' : '/api/employees-optimized';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}

/**
 * Hook for dashboard statistics with frequent updates
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,  // Refresh every 2 minutes for up-to-date stats
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for analytics data with longer caching
 */
export function useAnalytics(type: string, days?: number) {
  return useQuery({
    queryKey: queryKeys.analytics(type, days),
    queryFn: async () => {
      const params = new URLSearchParams({ type });
      if (days) params.append('days', days.toString());
      
      const response = await fetch(`/api/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    staleTime: 15 * 60 * 1000, // Analytics data is fresh for 15 minutes
    gcTime: 60 * 60 * 1000,    // Keep for 1 hour
    refetchOnWindowFocus: false,
    enabled: !!type, // Only fetch when type is provided
  });
}

/**
 * Optimistic mutations for better UX
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: { name: string; phoneNumber?: string }) => {
      const response = await fetch('/api/employees-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee),
      });
      if (!response.ok) throw new Error('Failed to create employee');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error('Error creating employee:', error);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; phoneNumber?: string; active?: boolean }) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update employee');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateWelfareActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (activity: {
      employeeId: string;
      welfareType: string;
      activityDate: string;
      notes?: string;
      conductedBy?: string;
    }) => {
      const response = await fetch('/api/welfare-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });
      if (!response.ok) throw new Error('Failed to create welfare activity');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate multiple related queries
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Background sync for offline capabilities
 */
export function useBackgroundSync() {
  const queryClient = useQueryClient();
  
  return {
    syncAll: () => {
      queryClient.refetchQueries({ queryKey: ['employees'] });
      queryClient.refetchQueries({ queryKey: ['dashboard'] });
      queryClient.refetchQueries({ queryKey: ['activities'] });
    },
    
    prefetchAnalytics: () => {
      // Prefetch common analytics queries
      queryClient.prefetchQuery({
        queryKey: queryKeys.analytics('summary'),
        queryFn: async () => {
          const response = await fetch('/api/analytics?type=summary');
          return response.json();
        },
        staleTime: 15 * 60 * 1000,
      });
    }
  };
}
