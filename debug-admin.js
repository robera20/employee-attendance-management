const mysql = require('mysql2');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
};

async function debugAdmin() {
  console.log('🔍 Debugging admin table...\n');
  
  try {
    const connection = mysql.createConnection({
      ...dbConfig,
      database: 'attendance_db'
    });
    
    await connection.promise().connect();
    console.log('✅ Connected to database');
    
    // Check all admins
    const [admins] = await connection.promise().query('SELECT * FROM admins');
    console.log(`📋 Found ${admins.length} admin accounts:`);
    
    admins.forEach((admin, index) => {
      console.log(`\n--- Admin ${index + 1} ---`);
      console.log(`ID: ${admin.admin_id}`);
      console.log(`Username: "${admin.username}"`);
      console.log(`Name: ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Password hash: ${admin.password.substring(0, 20)}...`);
      console.log(`Created: ${admin.created_at}`);
    });
    
    await connection.promise().end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAdmin();
