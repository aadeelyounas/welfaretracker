-- Database schema for Ashridge Welfare Tracker

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

-- Welfare events table
CREATE TABLE IF NOT EXISTS welfare_events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('Welfare Call', 'Welfare Visit', 'Dog Handler Welfare')),
    welfare_date DATE NOT NULL,
    follow_up_completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event participants table (keeping for future expansion)
CREATE TABLE IF NOT EXISTS event_participants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES welfare_events(id) ON DELETE CASCADE,
    participant_name VARCHAR(255) NOT NULL,
    participant_email VARCHAR(255),
    participant_phone VARCHAR(50),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attendance_status VARCHAR(50) DEFAULT 'registered',
    UNIQUE(event_id, participant_email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_welfare_events_date ON welfare_events(welfare_date);
CREATE INDEX IF NOT EXISTS idx_welfare_events_event_type ON welfare_events(event_type);
CREATE INDEX IF NOT EXISTS idx_welfare_events_follow_up ON welfare_events(follow_up_completed);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert default admin user (password: Ashridge@!2025)
INSERT INTO users (username, password, role, name, active) 
VALUES ('ashridge', 'Ashridge@!2025', 'admin', 'Ashridge Admin', true)
ON CONFLICT (username) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_welfare_events_updated_at ON welfare_events;
CREATE TRIGGER update_welfare_events_updated_at 
    BEFORE UPDATE ON welfare_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
