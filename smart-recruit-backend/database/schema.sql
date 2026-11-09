-- Create enum for candidate status
CREATE TYPE candidate_status AS ENUM (
  'Under Review',
  'Received',
  'Accepted',
  'Rejected',
  'Interview',
  'Call for exam'
);

-- Create users table with email change tracking
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  previous_email VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  status VARCHAR(20) DEFAULT 'Active',
  "isTemporaryPassword" BOOLEAN DEFAULT false,
  "passwordExpiresAt" TIMESTAMP,
  "resetPasswordToken" VARCHAR(255),
  "resetPasswordExpires" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create candidates table
CREATE TABLE candidates (
  id SERIAL PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20),
  job_title VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  gpa DECIMAL(3,2),
  experience TEXT,
  skills TEXT[],
  coverletter TEXT,
  resume_path VARCHAR(255),
  external_link VARCHAR(255),
  status candidate_status DEFAULT 'Under Review',
  applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_notifications table
CREATE TABLE email_notifications (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(id),
  status candidate_status NOT NULL,
  scheduled_datetime TIMESTAMP,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updating users timestamp
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_department ON candidates(department);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_email_notifications_candidate_id ON email_notifications(candidate_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Create view for candidate status history
CREATE VIEW candidate_status_history AS
SELECT 
    c.id,
    c.fullname,
    c.email,
    en.status,
    en.scheduled_datetime,
    en.email_sent,
    en.email_sent_at,
    en.created_at as status_changed_at
FROM candidates c
JOIN email_notifications en ON c.id = en.candidate_id
ORDER BY c.id, en.created_at DESC; 