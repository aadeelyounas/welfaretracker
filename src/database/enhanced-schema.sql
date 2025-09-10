-- Enhanced Database schema for Ashridge Welfare Tracker
-- Handles continuous welfare tracking with 14-day intervals and complete follow-up history

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employees table - Master list of all employees requiring welfare tracking
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) UNIQUE NOT NULL, -- Company employee ID
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    line_manager VARCHAR(255),
    avatar_url VARCHAR(500),
    welfare_frequency_days INTEGER DEFAULT 14, -- How often welfare checks are needed
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Welfare events table - Individual welfare activities
CREATE TABLE IF NOT EXISTS welfare_events (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('Welfare Call', 'Welfare Visit', 'Dog Handler Welfare')),
    welfare_date DATE NOT NULL,
    due_date DATE NOT NULL, -- When this welfare check was due
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    notes TEXT,
    outcome VARCHAR(100), -- 'positive', 'concerns_raised', 'follow_up_required', 'escalated'
    next_due_date DATE, -- When the next welfare check is due
    conducted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Follow-up actions table - Track all follow-up activities
CREATE TABLE IF NOT EXISTS follow_up_actions (
    id SERIAL PRIMARY KEY,
    welfare_event_id INTEGER REFERENCES welfare_events(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- 'scheduled_call', 'manager_meeting', 'hr_referral', 'external_support', etc.
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to INTEGER REFERENCES users(id),
    completed_date DATE,
    completion_notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Welfare schedule table - Automated scheduling for welfare checks
CREATE TABLE IF NOT EXISTS welfare_schedule (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'rescheduled', 'cancelled')),
    welfare_event_id INTEGER REFERENCES welfare_events(id), -- Links to actual event when completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, scheduled_date)
);

-- Welfare history view - Complete welfare tracking history
CREATE OR REPLACE VIEW welfare_history AS
SELECT 
    e.id as employee_id,
    e.employee_id,
    e.name as employee_name,
    e.department,
    e.position,
    we.id as event_id,
    we.event_type,
    we.welfare_date,
    we.due_date,
    we.status,
    we.outcome,
    we.next_due_date,
    we.notes,
    u.name as conducted_by,
    we.created_at,
    -- Calculate if overdue
    CASE 
        WHEN we.status = 'pending' AND we.due_date < CURRENT_DATE THEN true
        ELSE false
    END as is_overdue,
    -- Days since last welfare check
    CURRENT_DATE - we.welfare_date as days_since_check,
    -- Count of follow-up actions
    (SELECT COUNT(*) FROM follow_up_actions fa WHERE fa.welfare_event_id = we.id) as follow_up_count,
    -- Pending follow-up actions
    (SELECT COUNT(*) FROM follow_up_actions fa WHERE fa.welfare_event_id = we.id AND fa.status = 'pending') as pending_follow_ups
FROM employees e
LEFT JOIN welfare_events we ON e.id = we.employee_id
LEFT JOIN users u ON we.conducted_by = u.id
WHERE e.active = true
ORDER BY e.name, we.welfare_date DESC;

-- Employee welfare summary view - Current status for each employee
CREATE OR REPLACE VIEW employee_welfare_summary AS
WITH latest_welfare AS (
    SELECT 
        employee_id,
        MAX(welfare_date) as last_welfare_date,
        MAX(next_due_date) as next_due_date
    FROM welfare_events 
    WHERE status = 'completed'
    GROUP BY employee_id
),
pending_welfare AS (
    SELECT 
        employee_id,
        MIN(due_date) as next_pending_date
    FROM welfare_events 
    WHERE status = 'pending'
    GROUP BY employee_id
)
SELECT 
    e.id as employee_id,
    e.employee_id,
    e.name as employee_name,
    e.department,
    e.position,
    e.welfare_frequency_days,
    lw.last_welfare_date,
    COALESCE(pw.next_pending_date, lw.next_due_date) as next_due_date,
    -- Calculate status
    CASE 
        WHEN pw.next_pending_date IS NOT NULL AND pw.next_pending_date < CURRENT_DATE THEN 'overdue'
        WHEN pw.next_pending_date IS NOT NULL AND pw.next_pending_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
        WHEN pw.next_pending_date IS NOT NULL THEN 'scheduled'
        WHEN lw.next_due_date IS NOT NULL AND lw.next_due_date < CURRENT_DATE THEN 'overdue'
        WHEN lw.next_due_date IS NOT NULL AND lw.next_due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
        WHEN lw.last_welfare_date IS NULL THEN 'never_checked'
        ELSE 'up_to_date'
    END as welfare_status,
    -- Days since last check
    CASE 
        WHEN lw.last_welfare_date IS NOT NULL THEN CURRENT_DATE - lw.last_welfare_date
        ELSE NULL
    END as days_since_last_check,
    -- Count of pending follow-ups
    (SELECT COUNT(*) FROM follow_up_actions fa 
     JOIN welfare_events we ON fa.welfare_event_id = we.id 
     WHERE we.employee_id = e.id AND fa.status = 'pending') as pending_follow_ups
FROM employees e
LEFT JOIN latest_welfare lw ON e.id = lw.employee_id
LEFT JOIN pending_welfare pw ON e.id = pw.employee_id
WHERE e.active = true
ORDER BY 
    CASE 
        WHEN COALESCE(pw.next_pending_date, lw.next_due_date) < CURRENT_DATE THEN 1
        WHEN COALESCE(pw.next_pending_date, lw.next_due_date) <= CURRENT_DATE + INTERVAL '3 days' THEN 2
        ELSE 3
    END,
    COALESCE(pw.next_pending_date, lw.next_due_date) ASC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_welfare_events_employee_id ON welfare_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_welfare_events_date ON welfare_events(welfare_date);
CREATE INDEX IF NOT EXISTS idx_welfare_events_due_date ON welfare_events(due_date);
CREATE INDEX IF NOT EXISTS idx_welfare_events_status ON welfare_events(status);
CREATE INDEX IF NOT EXISTS idx_welfare_events_next_due_date ON welfare_events(next_due_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_actions_welfare_event_id ON follow_up_actions(welfare_event_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_actions_employee_id ON follow_up_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_actions_due_date ON follow_up_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_actions_status ON follow_up_actions(status);
CREATE INDEX IF NOT EXISTS idx_welfare_schedule_employee_id ON welfare_schedule(employee_id);
CREATE INDEX IF NOT EXISTS idx_welfare_schedule_scheduled_date ON welfare_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Function to automatically schedule next welfare check
CREATE OR REPLACE FUNCTION schedule_next_welfare_check()
RETURNS TRIGGER AS $$
BEGIN
    -- When a welfare event is marked as completed, schedule the next one
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Calculate next due date
        NEW.next_due_date = NEW.welfare_date + INTERVAL '1 day' * (
            SELECT welfare_frequency_days FROM employees WHERE id = NEW.employee_id
        );
        
        -- Insert into welfare schedule
        INSERT INTO welfare_schedule (employee_id, scheduled_date, event_type)
        VALUES (NEW.employee_id, NEW.next_due_date, NEW.event_type)
        ON CONFLICT (employee_id, scheduled_date) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic scheduling
DROP TRIGGER IF EXISTS trigger_schedule_next_welfare ON welfare_events;
CREATE TRIGGER trigger_schedule_next_welfare
    BEFORE UPDATE ON welfare_events
    FOR EACH ROW
    EXECUTE FUNCTION schedule_next_welfare_check();

-- Function to create welfare events from schedule
CREATE OR REPLACE FUNCTION create_scheduled_welfare_events()
RETURNS INTEGER AS $$
DECLARE
    scheduled_record RECORD;
    new_event_id INTEGER;
    events_created INTEGER := 0;
BEGIN
    -- Create welfare events for scheduled dates that are due (today or overdue)
    FOR scheduled_record IN 
        SELECT ws.*, e.name as employee_name
        FROM welfare_schedule ws
        JOIN employees e ON ws.employee_id = e.id
        WHERE ws.status = 'scheduled' 
        AND ws.scheduled_date <= CURRENT_DATE
        AND e.active = true
    LOOP
        -- Create the welfare event
        INSERT INTO welfare_events (
            employee_id, 
            event_type, 
            welfare_date, 
            due_date, 
            status
        ) VALUES (
            scheduled_record.employee_id,
            scheduled_record.event_type,
            CURRENT_DATE,
            scheduled_record.scheduled_date,
            'pending'
        ) RETURNING id INTO new_event_id;
        
        -- Update the schedule record
        UPDATE welfare_schedule 
        SET status = 'completed', welfare_event_id = new_event_id
        WHERE id = scheduled_record.id;
        
        events_created := events_created + 1;
    END LOOP;
    
    RETURN events_created;
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user (password will be hashed by application)
INSERT INTO users (username, password, role, name, active) 
VALUES ('ashridge', '$2a$10$placeholder', 'admin', 'Ashridge Admin', true)
ON CONFLICT (username) DO NOTHING;

-- Insert sample employees
INSERT INTO employees (employee_id, name, email, department, position, welfare_frequency_days) VALUES
('EMP001', 'John Smith', 'john.smith@ashridge.com', 'Security', 'Security Officer', 14),
('EMP002', 'Sarah Johnson', 'sarah.johnson@ashridge.com', 'Administration', 'Admin Assistant', 14),
('EMP003', 'Mike Wilson', 'mike.wilson@ashridge.com', 'Operations', 'Operations Manager', 14),
('EMP004', 'Emma Brown', 'emma.brown@ashridge.com', 'K9 Unit', 'Dog Handler', 7), -- More frequent for dog handlers
('EMP005', 'David Lee', 'david.lee@ashridge.com', 'Security', 'Senior Security Officer', 14)
ON CONFLICT (employee_id) DO NOTHING;
