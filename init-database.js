const mysql = require('mysql2');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
};

async function initializeDatabase() {
  console.log('🚀 Initializing Employee Attendance System Database...\n');
  
  try {
    // Step 1: Test basic connection
    console.log('📡 Step 1: Testing XAMPP MySQL connection...');
    const connection = mysql.createConnection(dbConfig);
    await connection.promise().connect();
    console.log('✅ XAMPP MySQL connection successful\n');
    
    // Step 2: Create database
    console.log('🗄️ Step 2: Creating database...');
    await connection.promise().query('CREATE DATABASE IF NOT EXISTS attendance_db');
    console.log('✅ Database attendance_db created/verified\n');
    
    // Step 3: Use database
    await connection.promise().query('USE attendance_db');
    console.log('✅ Database attendance_db selected\n');
    
    // Step 4: Create tables
    console.log('📋 Step 3: Creating tables...');
    
    // Create admins table
    await connection.promise().query(`
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
      )
    `);
    
    // Create employees table
    await connection.promise().query(`
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
      )
    `);
    
    // Create attendance table
    await connection.promise().query(`
      CREATE TABLE IF NOT EXISTS attendance (
        attendance_id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('Present', 'Late', 'Absent') NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
      )
    `);
    
    // Create face_training table for face recognition
    await connection.promise().query(`
      CREATE TABLE IF NOT EXISTS face_training (
        training_id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        face_descriptor LONGTEXT,
        face_image LONGTEXT,
        face_data LONGTEXT,
        quality_score DECIMAL(3,2) DEFAULT 0.80,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Tables created successfully\n');
    
    // Step 5: Create indexes
    console.log('🔍 Step 4: Creating indexes...');
    
    // Create indexes with error handling (IF NOT EXISTS not supported in older MySQL)
    try {
      await connection.promise().query('CREATE INDEX idx_employees_admin ON employees(admin_id)');
    } catch (e) {
      // Index might already exist
    }
    
    try {
      await connection.promise().query('CREATE INDEX idx_attendance_employee ON attendance(employee_id)');
    } catch (e) {
      // Index might already exist
    }
    
    try {
      await connection.promise().query('CREATE INDEX idx_attendance_date ON attendance(timestamp)');
    } catch (e) {
      // Index might already exist
    }
    
    try {
      await connection.promise().query('CREATE INDEX idx_attendance_status ON attendance(status)');
    } catch (e) {
      // Index might already exist
    }

    // Create indexes for better performance
    try {
      await connection.promise().query('CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, timestamp)');
    } catch (e) {
      // Index might already exist
    }
    
    try {
      await connection.promise().query('CREATE INDEX idx_attendance_date_status ON attendance(timestamp, status)');
    } catch (e) {
      // Index might already exist
    }
    
    try {
      await connection.promise().query('CREATE INDEX idx_face_training_employee ON face_training(employee_id)');
    } catch (e) {
      // Index might already exist
    }
    
    console.log('✅ Indexes created successfully\n');
    
    // Step 6: Insert sample data
    console.log('📝 Step 5: Inserting sample data...');
    
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
      console.log('⚠️  IMPORTANT: Change these credentials after first login!');
    } else {
      console.log('✅ Admin account already exists');
    }
    
    // Step 7: Create views
    console.log('👁️ Step 6: Creating views...');
    
    // Create attendance_summary view
    await connection.promise().query(`
      CREATE OR REPLACE VIEW attendance_summary AS
      SELECT 
        e.employee_id,
        e.name,
        e.email,
        e.admin_id,
        COALESCE(a.status, 'Absent') as today_status,
        a.timestamp as last_scan,
        a.attendance_id
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND DATE(a.timestamp) = CURDATE()
      ORDER BY e.name
    `);
    
    // Create daily_stats view
    await connection.promise().query(`
      CREATE OR REPLACE VIEW daily_stats AS
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'Absent' OR a.status IS NULL THEN 1 END) as absent_count
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND DATE(a.timestamp) = CURDATE()
    `);
    
    console.log('✅ Views created successfully\n');
    
    // Step 8: Test the setup
    console.log('🧪 Step 7: Testing setup...');
    const [testResult] = await connection.promise().query('SELECT COUNT(*) as admin_count FROM admins');
    console.log(`✅ Admin accounts: ${testResult[0].admin_count}`);
    
    const [employeeCount] = await connection.promise().query('SELECT COUNT(*) as count FROM employees');
    console.log(`✅ Employee table ready: ${employeeCount[0].count} employees`);
    
    const [attendanceCount] = await connection.promise().query('SELECT COUNT(*) as count FROM attendance');
    console.log(`✅ Attendance table ready: ${attendanceCount[0].count} records`);
    
    await connection.promise().end();
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm start');
    console.log('2. Open: http://localhost:5000');
    console.log('3. Login with: admin / admin123');
    console.log('\n💡 Database is now bulletproof and ready!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure XAMPP MySQL is running');
    console.log('2. Check if port 3306 is free');
    console.log('3. Restart XAMPP if needed');
    console.log('4. Check MySQL error logs in XAMPP');
    process.exit(1);
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
