-- Simplified Welfare Tracker Database Schema
-- Employee-based welfare tracking with 14-day cycles

-- Drop existing tables if they exist
DROP TABLE IF EXISTS welfare_activities CASCADE;
DROP TABLE IF EXISTS welfare_schedules CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Employees table - simplified with just name
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Welfare schedules - tracks the ongoing 14-day welfare cycle for each employee
CREATE TABLE welfare_schedules (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    current_cycle_start DATE NOT NULL,
    next_welfare_due DATE NOT NULL,
    total_cycles_completed INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id) -- One active schedule per employee
);

-- Welfare activities - complete history of all welfare activities
CREATE TABLE welfare_activities (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    welfare_type VARCHAR(50) NOT NULL DEFAULT 'Welfare Call',
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    notes TEXT,
    cycle_number INTEGER NOT NULL DEFAULT 1,
    days_since_last INTEGER,
    conducted_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT welfare_type_check CHECK (welfare_type IN ('Welfare Call', 'Welfare Visit', 'Dog Handler Welfare', 'Mental Health Check', 'General Welfare'))
);

-- Indexes for performance
CREATE INDEX idx_employees_name ON employees(name);
CREATE INDEX idx_employees_active ON employees(active);
CREATE INDEX idx_welfare_schedules_employee ON welfare_schedules(employee_id);
CREATE INDEX idx_welfare_schedules_next_due ON welfare_schedules(next_welfare_due);
CREATE INDEX idx_welfare_activities_employee ON welfare_activities(employee_id);
CREATE INDEX idx_welfare_activities_date ON welfare_activities(activity_date);
CREATE INDEX idx_welfare_activities_status ON welfare_activities(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_welfare_schedules_updated_at BEFORE UPDATE ON welfare_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_welfare_activities_updated_at BEFORE UPDATE ON welfare_activities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create welfare schedule when employee is added
CREATE OR REPLACE FUNCTION create_welfare_schedule_for_employee()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO welfare_schedules (employee_id, current_cycle_start, next_welfare_due)
    VALUES (NEW.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_welfare_schedule_trigger
    AFTER INSERT ON employees
    FOR EACH ROW EXECUTE FUNCTION create_welfare_schedule_for_employee();

-- Function to update welfare schedule when activity is completed
CREATE OR REPLACE FUNCTION update_welfare_schedule_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE welfare_schedules 
        SET 
            current_cycle_start = NEW.activity_date,
            next_welfare_due = NEW.activity_date + INTERVAL '14 days',
            total_cycles_completed = total_cycles_completed + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_welfare_schedule_trigger
    AFTER INSERT ON welfare_activities
    FOR EACH ROW EXECUTE FUNCTION update_welfare_schedule_on_activity();

-- Insert sample employees
INSERT INTO employees (name) VALUES 
    ('John Smith'),
    ('Sarah Johnson'),
    ('Mike Brown'),
    ('Emma Wilson'),
    ('David Taylor');

-- Insert some sample welfare activities to show history
INSERT INTO welfare_activities (employee_id, welfare_type, activity_date, notes, cycle_number) VALUES
    (1, 'Welfare Call', CURRENT_DATE - INTERVAL '28 days', 'Initial welfare call - all good', 1),
    (1, 'Welfare Call', CURRENT_DATE - INTERVAL '14 days', 'Follow-up call - doing well', 2),
    (1, 'Welfare Visit', CURRENT_DATE, 'In-person visit - excellent morale', 3),
    (2, 'Welfare Call', CURRENT_DATE - INTERVAL '21 days', 'First contact - settling in well', 1),
    (2, 'Dog Handler Welfare', CURRENT_DATE - INTERVAL '7 days', 'Dog handler specific check', 2),
    (3, 'Mental Health Check', CURRENT_DATE - INTERVAL '10 days', 'Mental health focused session', 1);
