const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
};

async function resetAdminPassword() {
  console.log('🔐 Resetting admin password...\n');
  
  try {
    // Connect to database
    const connection = mysql.createConnection({
      ...dbConfig,
      database: 'attendance_db'
    });
    
    await connection.promise().connect();
    console.log('✅ Connected to database');
    
    // First, let's see the exact content of the admin record
    const [admins] = await connection.promise().query('SELECT admin_id, username, name, email FROM admins WHERE username LIKE "%admin%"');
    console.log('🔍 Found admin accounts:');
    admins.forEach(admin => {
      console.log(`   ID: ${admin.admin_id}, Username: "${admin.username}", Name: ${admin.name}, Email: ${admin.email}`);
    });
    
    if (admins.length === 0) {
      console.log('❌ No admin accounts found');
      return;
    }
    
    // Use the first admin account found
    const adminToUpdate = admins[0];
    console.log(`\n📝 Updating password for admin ID: ${adminToUpdate.admin_id}`);
    
    // Hash new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update admin password by ID
    const result = await connection.promise().execute(
      'UPDATE admins SET password = ? WHERE admin_id = ?',
      [hashedPassword, adminToUpdate.admin_id]
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ Admin password updated successfully');
      console.log('📝 New credentials:');
      console.log(`   Username: ${adminToUpdate.username}`);
      console.log('   Password: admin123');
    } else {
      console.log('❌ Failed to update password');
    }
    
    await connection.promise().end();
    
  } catch (error) {
    console.error('❌ Failed to reset password:', error.message);
  }
}

resetAdminPassword();
