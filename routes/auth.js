const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// Admin Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, organization, username, password, security_question, security_answer } = req.body;
    
    // Validate required fields
    if (!name || !email || !username || !password || !security_question || !security_answer) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if username already exists
    const existingUsers = await db.query('SELECT username FROM admins WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmails = await db.query('SELECT email FROM admins WHERE email = ?', [email]);
    if (existingEmails.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Hash security answer
    const hashedSecurityAnswer = await bcrypt.hash(security_answer, 10);
    
    // Insert admin into database
    const result = await db.execute(
      'INSERT INTO admins (name, email, phone, organization, username, password, security_question, security_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, organization, username, hashedPassword, security_question, hashedSecurityAnswer]
    );
    
    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Check if it's a database connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(500).json({ error: 'Database connection failed. Please check if MySQL is running.' });
    }
    
    // Check if it's a database not found error
    if (error.code === 'ER_BAD_DB_ERROR') {
      return res.status(500).json({ error: 'Database "attendance_db" not found. Please run: npm run quick-setup' });
    }
    
    // Check if it's a table not found error
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Database tables not found. Please run: npm run quick-setup' });
    }
    
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Admin Signin
router.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find admin by username
    const admins = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    
    // Check if admin exists and verify password
    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = admins[0];
    const isValidPassword = await bcrypt.compare(password, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.adminId = admin.admin_id;
    
    res.json({ message: 'Signin successful' });
  } catch (error) {
    console.error('Signin error:', error);
    
    // Check if it's a database connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(500).json({ error: 'Database connection failed. Please check if MySQL is running.' });
    }
    
    // Check if it's a database not found error
    if (error.code === 'ER_BAD_DB_ERROR') {
      return res.status(500).json({ error: 'Database "attendance_db" not found. Please run: npm run quick-setup' });
    }
    
    // Check if it's a table not found error
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Database tables not found. Please run: npm run quick-setup' });
    }
    
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Check if user is authenticated
router.get('/check', (req, res) => {
  if (req.session.adminId) {
    res.json({ authenticated: true, adminId: req.session.adminId });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current admin profile
router.get('/profile', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const admins = await db.query(
      'SELECT admin_id, name, email, phone, organization, username, created_at, updated_at FROM admins WHERE admin_id = ?',
      [req.session.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ success: true, admin: admins[0] });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Update current admin profile
router.put('/profile', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, email, phone, organization, username } = req.body;

    if (!name || !email || !username) {
      return res.status(400).json({ error: 'Name, email and username are required' });
    }

    // Ensure email is unique among other admins
    const emailExists = await db.query(
      'SELECT admin_id FROM admins WHERE email = ? AND admin_id != ?',
      [email, req.session.adminId]
    );
    if (emailExists.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Ensure username is unique among other admins
    const usernameExists = await db.query(
      'SELECT admin_id FROM admins WHERE username = ? AND admin_id != ?',
      [username, req.session.adminId]
    );
    if (usernameExists.length > 0) {
      return res.status(400).json({ error: 'Username already in use' });
    }

    // Update admin
    await db.execute(
      'UPDATE admins SET name = ?, email = ?, phone = ?, organization = ?, username = ? WHERE admin_id = ?',
      [name, email, phone || null, organization || null, username, req.session.adminId]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    // Handle specific DB errors
    if (error.code === 'ER_BAD_DB_ERROR') {
      return res.status(500).json({ error: 'Database not found' });
    }
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Change password for current admin
router.put('/password', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const admins = await db.query('SELECT password FROM admins WHERE admin_id = ?', [req.session.adminId]);
    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const valid = await bcrypt.compare(current_password, admins[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await db.execute('UPDATE admins SET password = ? WHERE admin_id = ?', [hashed, req.session.adminId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

module.exports = router;
