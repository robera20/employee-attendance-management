const mysql = require('mysql2');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
};

async function quickSetup() {
  console.log('🚀 Quick Setup for Employee Attendance System...\n');
  
  try {
    // Step 1: Test basic connection
    console.log('📡 Step 1: Testing XAMPP MySQL connection...');
    const connection = mysql.createConnection({
      ...dbConfig,
      multipleStatements: true
    });
    
    await connection.promise().connect();
    console.log('✅ XAMPP MySQL connection successful\n');
    
    // Step 2: Create database
    console.log('🗄️ Step 2: Creating database...');
    await connection.promise().query('CREATE DATABASE IF NOT EXISTS attendance_db');
    console.log('✅ Database created/verified\n');
    
    // Step 3: Use database
    await connection.promise().query('USE attendance_db');
    
    // Step 4: Create tables
    console.log('📋 Step 3: Creating tables...');
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS admins (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        phone VARCHAR(20),
        organization VARCHAR(80),
        username VARCHAR(32) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        security_question VARCHAR(255),
        security_answer VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS employees (
        employee_id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        phone VARCHAR(20),
        qr_code VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS attendance (
        attendance_id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('Present', 'Late', 'Absent') NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
      );
    `;
    
    await connection.promise().query(createTablesSQL);
    console.log('✅ Tables created successfully\n');
    
    // Step 5: Insert sample data
    console.log('📝 Step 4: Inserting sample data...');
    
    // Check if admin already exists
    const [existingAdmins] = await connection.promise().query('SELECT COUNT(*) as count FROM admins');
    
    if (existingAdmins[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const hashedAnswer = await bcrypt.hash('admin123', 10);
      
      await connection.promise().query(`
        INSERT INTO admins (name, email, phone, organization, username, password, security_question, security_answer) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['Admin User', 'admin@company.com', '+1234567890', 'Company Inc', 'admin', hashedPassword, 'What is your password?', hashedAnswer]);
      
      console.log('✅ Sample admin created (username: admin, password: admin123)');
    } else {
      console.log('✅ Admin account already exists');
    }
    
    // Step 6: Create indexes
    console.log('🔍 Step 5: Creating indexes...');
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_employees_admin ON employees(admin_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(timestamp);
      CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
    `;
    
    await connection.promise().query(createIndexesSQL);
    console.log('✅ Indexes created successfully\n');
    
    // Step 7: Test the setup
    console.log('🧪 Step 6: Testing setup...');
    const [testResult] = await connection.promise().query('SELECT COUNT(*) as admin_count FROM admins');
    console.log(`✅ Admin accounts: ${testResult[0].admin_count}`);
    
    await connection.promise().end();
    
    console.log('\n🎉 Quick setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm start');
    console.log('2. Open: http://localhost:5000');
    console.log('3. Login with: admin / admin123');
    
  } catch (error) {
    console.error('❌ Quick setup failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure XAMPP MySQL is running');
    console.log('2. Check if port 3306 is free');
    console.log('3. Restart XAMPP if needed');
    process.exit(1);
  }
}

if (require.main === module) {
  quickSetup();
}

module.exports = { quickSetup };
