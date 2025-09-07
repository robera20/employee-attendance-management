const mysql = require('mysql2');

// Database configuration for XAMPP
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306,
  // Remove database from initial config to avoid connection issues
};

// Create connection pool without database initially
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to ensure database exists and is selected
async function ensureDatabase() {
  try {
    // Create connection without database
    const connection = mysql.createConnection(dbConfig);
    await connection.promise().connect();
    
    // Create database if it doesn't exist
    await connection.promise().query('CREATE DATABASE IF NOT EXISTS attendance_db');
    console.log('✅ Database attendance_db verified/created');
    
    // Use the database
    await connection.promise().query('USE attendance_db');
    console.log('✅ Database attendance_db selected');
    
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
      ...dbConfig,
      database: 'attendance_db'
    });
    
    await connection.promise().connect();
    await connection.promise().query('USE attendance_db');
    
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
      ...dbConfig,
      database: 'attendance_db'
    });
    
    await connection.promise().connect();
    await connection.promise().query('USE attendance_db');
    
    const [results] = await connection.promise().query(sql, params);
    await connection.promise().end();
    
    return results;
  } catch (error) {
    console.error('Select query error:', error);
    throw error;
  }
}

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('💡 Make sure XAMPP MySQL is running');
    return;
  }
  
  console.log('✅ Connected to XAMPP MySQL successfully');
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
      await connection.promise().query('USE attendance_db');

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
