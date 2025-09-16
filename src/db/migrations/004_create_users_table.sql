-- Create users table for authentication
-- This replaces the hardcoded authentication with database-based user management

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the main admin user (username: ashridge, password: Ashridge@2025!)
INSERT INTO users (username, password, name, role, active) 
VALUES (
    'ashridge',
    '$2b$10$ZQqurkl7MmUTalowTZP2gudKLQl6TQvGNNiQh/mWMgvYxV3ShoGX6',
    'Ashridge Administrator',
    'admin',
    true
) ON CONFLICT (username) DO NOTHING;

-- Keep the fallback admin user for compatibility (password: 'password')
INSERT INTO users (username, password, name, role, active) 
VALUES (
    'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'System Administrator',
    'admin',
    true
) ON CONFLICT (username) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- Add trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();