-- Phase 2: Strategic Database Indexes for Welfare Tracker
-- Optimized for 1000+ employees with complex welfare queries

-- 1. COMPOSITE INDEX: Employee-Welfare Join Optimization
-- This is the most critical index for our main getEmployeesWithWelfare query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_active_created_composite 
ON employees (active DESC, created_at ASC) 
WHERE active = true;

-- 2. WELFARE ACTIVITIES: Employee-Date Composite Index  
-- Optimizes the LATERAL join for activity statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_welfare_activities_employee_date_composite
ON welfare_activities (employee_id, activity_date DESC)
INCLUDE (status);

-- 3. WELFARE SCHEDULES: Next Due Date Optimization
-- For overdue calculations and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_welfare_schedules_employee_next_due
ON welfare_schedules (employee_id, next_welfare_due ASC)
WHERE next_welfare_due IS NOT NULL;

-- 4. PARTIAL INDEX: Active Employees Only
-- Most queries filter by active employees
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_active_only_optimized
ON employees (id, name, phone_number, created_at)  
WHERE active = true;

-- 5. COVERING INDEX: Welfare Activities Count Queries
-- For dashboard statistics and activity counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_welfare_activities_stats_covering
ON welfare_activities (employee_id, status)
INCLUDE (activity_date, activity_type);

-- 6. PHONE NUMBER SEARCH: For UK phone validation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_phone_search
ON employees USING gin (phone_number gin_trgm_ops)
WHERE phone_number IS NOT NULL;

-- Note: Using CONCURRENTLY to avoid locking during index creation
-- These indexes are designed for the specific query patterns in OptimizedWelfareDB
