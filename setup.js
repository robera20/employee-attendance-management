const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
};

async function setupDatabase() {
  console.log('🚀 Setting up Employee Attendance Management System...\n');
  
  try {
    // Create connection without database
    const connection = mysql.createConnection({
      ...dbConfig,
      multipleStatements: true
    });
    
    console.log('📡 Connecting to MySQL...');
    await connection.promise().connect();
    console.log('✅ Connected to MySQL successfully\n');
    
    // Read and execute the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, 'database', 'attendance_db.sql');
    
    if (!fs.existsSync(sqlFile)) {
      throw new Error('Database SQL file not found. Make sure database/attendance_db.sql exists.');
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('🗄️ Creating database and tables...');
    await connection.promise().query(sqlContent);
    console.log('✅ Database setup completed successfully!\n');
    
    // Test the setup
    console.log('🧪 Testing database setup...');
    
    // Test admin account
    const [admins] = await connection.promise().query('SELECT * FROM attendance_db.admins');
    console.log(`✅ Admin accounts: ${admins.length}`);
    
    // Test employees
    const [employees] = await connection.promise().query('SELECT * FROM attendance_db.employees');
    console.log(`✅ Sample employees: ${employees.length}`);
    
    // Test attendance
    const [attendance] = await connection.promise().query('SELECT * FROM attendance_db.attendance');
    console.log(`✅ Sample attendance records: ${attendance.length}\n`);
    
    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update db.js with your MySQL credentials');
    console.log('2. Run: npm start');
    console.log('3. Open: http://localhost:5000');
    console.log('4. Login with: admin / admin123');
    
    await connection.promise().end();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('- Make sure MySQL is running');
    console.log('- Check your MySQL credentials in setup.js');
    console.log('- Ensure you have permission to create databases');
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
