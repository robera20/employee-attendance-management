const mysql = require('mysql2');

// Database configuration for FreeDB.tech (production) or XAMPP (local)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'attendance_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Remove database from initial config to avoid connection issues
};

// Debug logging for environment variables
console.log('🔍 Database Configuration Debug:');
console.log('All environment variables:', Object.keys(process.env).filter(key => key.startsWith('DB_')));
console.log('DB_HOST:', process.env.DB_HOST || 'localhost (default)');
console.log('DB_USER:', process.env.DB_USER || 'root (default)');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || '3306 (default)');
console.log('DB_NAME:', process.env.DB_NAME || 'attendance_db (default)');
console.log('DB_SSL:', process.env.DB_SSL || 'false (default)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development (default)');

// Create connection pool without database initially
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'attendance_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('🔍 Pool Configuration:', {
  host: poolConfig.host,
  user: poolConfig.user,
  port: poolConfig.port,
  database: poolConfig.database,
  ssl: poolConfig.ssl
});

const pool = mysql.createPool(poolConfig);

// Function to ensure database exists and is selected
async function ensureDatabase() {
  try {
    // Create connection without database
    const connection = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    await connection.promise().connect();
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'attendance_db';
    await connection.promise().query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database ${dbName} verified/created`);
    
    // Use the database
    await connection.promise().query(`USE ${dbName}`);
    console.log(`✅ Database ${dbName} selected`);
    
    await connection.promise().end();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

// Initialize database on startup
let dbInitialized = false;
ensureDatabase().then(success => {
  dbInitialized = success;
  if (success) {
    console.log('✅ Database system ready');
  } else {
    console.log('❌ Database system failed to initialize');
  }
});

// Enhanced query function with database selection
async function executeQuery(sql, params = []) {
  try {
    if (!dbInitialized) {
      await ensureDatabase();
      dbInitialized = true;
    }
    
    // Always ensure we're using the right database
    const connection = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'attendance_db',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    await connection.promise().connect();
    await connection.promise().query(`USE ${process.env.DB_NAME || 'attendance_db'}`);
    
    const [results] = await connection.promise().execute(sql, params);
    await connection.promise().end();
    
    return results;
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
}

// Enhanced query function for SELECT statements
async function executeSelect(sql, params = []) {
  try {
    if (!dbInitialized) {
      await ensureDatabase();
      dbInitialized = true;
    }
    
    // Always ensure we're using the right database
    const connection = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'attendance_db',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    await connection.promise().connect();
    await connection.promise().query(`USE ${process.env.DB_NAME || 'attendance_db'}`);
    
    const [results] = await connection.promise().query(sql, params);
    await connection.promise().end();
    
    return results;
  } catch (error) {
    console.error('Select query error:', error);
    throw error;
  }
}

// Test database connection with direct connection first
const testConnection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

console.log('🔍 Testing direct connection to:', process.env.DB_HOST || 'localhost');

testConnection.connect((err) => {
  if (err) {
    console.error('❌ Direct connection failed:', err.message);
    console.log('🔍 Error details:', err);
    return;
  }
  
  console.log('✅ Direct connection successful!');
  testConnection.end();
});

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Pool connection failed:', err.message);
    console.log('💡 Make sure database is running and accessible');
    console.log('🔍 Attempting connection to:', process.env.DB_HOST || 'localhost');
    return;
  }
  
  console.log('✅ Pool connection successful');
  console.log('🔍 Connected to host:', process.env.DB_HOST || 'localhost');
  connection.release();
});

// Export enhanced functions
module.exports = {
  execute: executeQuery,
  query: executeSelect,
  pool: pool.promise(),
  ensureDatabase,
  ensureEmployeeColumns: async function ensureEmployeeColumns() {
    try {
      if (!dbInitialized) {
        await ensureDatabase();
        dbInitialized = true;
      }

      const connection = mysql.createConnection({
        ...dbConfig,
        database: 'attendance_db'
      });

      await connection.promise().connect();
      await connection.promise().query(`USE ${process.env.DB_NAME || 'attendance_db'}`);

      const [posCol] = await connection.promise().query('SHOW COLUMNS FROM employees LIKE ?', ['position']);
      if (posCol.length === 0) {
        await connection.promise().query('ALTER TABLE employees ADD COLUMN position VARCHAR(100) NULL AFTER phone');
        console.log('✅ Added missing column: employees.position');
      }

      const [deptCol] = await connection.promise().query('SHOW COLUMNS FROM employees LIKE ?', ['department']);
      if (deptCol.length === 0) {
        await connection.promise().query('ALTER TABLE employees ADD COLUMN department VARCHAR(80) NULL AFTER position');
        console.log('✅ Added missing column: employees.department');
      }

      await connection.promise().end();
      return true;
    } catch (error) {
      console.error('ensureEmployeeColumns error:', error);
      return false;
    }
  },
  isInitialized: () => dbInitialized
};
