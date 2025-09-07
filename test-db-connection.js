const mysql = require('mysql2');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
};

async function testConnection() {
  console.log('🧪 Testing XAMPP MySQL connection...');
  
  try {
    // Test basic connection
    const connection = mysql.createConnection(dbConfig);
    await connection.promise().connect();
    console.log('✅ Basic connection successful');
    
    // Test database creation
    await connection.promise().query('CREATE DATABASE IF NOT EXISTS attendance_db');
    console.log('✅ Database creation successful');
    
    // Test database selection
    await connection.promise().query('USE attendance_db');
    console.log('✅ Database selection successful');
    
    // Test simple query
    const [result] = await connection.promise().query('SELECT 1 as test');
    console.log('✅ Query execution successful:', result[0].test);
    
    await connection.promise().end();
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure XAMPP MySQL is running');
    console.log('2. Check if username/password are correct');
    console.log('3. Ensure MySQL is accessible on port 3306');
  }
}

testConnection();
