import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// User interface
interface User {
  id: number;
  email: string;
  password: string;
  role: string;
  status?: string;
  isTemporaryPassword?: boolean;
  passwordExpiresAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Job post interface
interface JobPost {
  id: number;
  title: string;
  description: string;
  company: string;
  location: string;
  jobType: string;
  department: string;
  experience: string;
  salary: number;
  deadline: Date;
  isActive: boolean;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Initialize database connection
const createDatabaseConnection = (): Client => {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '12345678',
    database: process.env.DB_DATABASE || 'smart_recruit'
  };

  return new Client(config);
};

async function initializeDatabase(): Promise<void> {
  const client = createDatabaseConnection();
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Create users table
    await client.query(`
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
    `);
    console.log('Users table created or already exists');

    // Add new columns if they don't exist (for existing databases)
    try {
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'Active\'');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isTemporaryPassword" BOOLEAN DEFAULT false');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordExpiresAt" TIMESTAMP');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_email VARCHAR(255)');
      console.log('New columns added to users table');
    } catch (error) {
      console.log('Columns may already exist or error adding them:', (error as Error).message);
    }

    // Create job_posts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        "jobType" VARCHAR(50) NOT NULL,
        department VARCHAR(100) NOT NULL,
        experience VARCHAR(100) NOT NULL,
        salary INTEGER NOT NULL,
        deadline TIMESTAMP NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        requirements TEXT[],
        responsibilities TEXT[],
        skills TEXT[],
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Job posts table created or already exists');

    // Create a default super admin user if it doesn't exist
    const superAdminEmail = 'superadmin@example.com';
    const superAdminPassword = '$2b$10$YourHashedPasswordHere'; // This should be properly hashed

    const checkSuperAdmin = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [superAdminEmail]
    );

    if (checkSuperAdmin.rows.length === 0) {
      await client.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        [superAdminEmail, superAdminPassword, 'super_admin']
      );
      console.log('Default super admin user created');
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Application database initialization completed');
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error('Application database initialization failed:', error);
      process.exit(1);
    });
}

export default initializeDatabase; 