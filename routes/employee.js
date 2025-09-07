const express = require('express');
const QRCode = require('qrcode');
const db = require('../db');

const router = express.Router();

// Middleware to check if admin is logged in
const requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Add new employee
router.post('/add', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, position, department } = req.body;
    const adminId = req.session.adminId;
    
    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }
    
    // Check if email already exists
    const existingEmails = await db.query('SELECT email FROM employees WHERE email = ?', [email]);
    if (existingEmails.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Generate QR code for employee - simplified format
    const qrData = JSON.stringify({
      id: Date.now(), // Temporary ID until we get the real one
      name: name
    });
    
    // Generate QR code image with higher error correction
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H', // Highest error correction
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Insert employee into database (persist optional position/department if columns exist)
    let result;
    try {
      // Try inserting with position and department if columns exist
      result = await db.execute(
        'INSERT INTO employees (admin_id, name, email, phone, position, department, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminId, name, email, phone, position || null, department || null, qrData]
      );
    } catch (err) {
      // Fallback for older schema without position/department
      result = await db.execute(
      'INSERT INTO employees (admin_id, name, email, phone, qr_code) VALUES (?, ?, ?, ?, ?)',
      [adminId, name, email, phone, qrData]
    );
    }
    
    // Update QR code with actual employee ID
    const finalQrData = JSON.stringify({
      id: result.insertId,
      name: name
    });
    
    // Generate final QR code with correct ID
    const finalQrCodeImage = await QRCode.toDataURL(finalQrData, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Update the QR code in database with correct ID
    await db.execute(
      'UPDATE employees SET qr_code = ? WHERE employee_id = ?',
      [finalQrData, result.insertId]
    );
    
    res.status(201).json({ 
      message: 'Employee added successfully',
      qr_code: finalQrCodeImage,
      employee_id: result.insertId
    });
  } catch (error) {
    console.error('Add employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get list of employees for logged-in admin
router.get('/list', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    console.log('📋 Employee list request for admin ID:', adminId);
    
    // Fetch employees from database
    const employees = await db.query(
      'SELECT * FROM employees WHERE admin_id = ? ORDER BY name',
      [adminId]
    );
    
    console.log(`✅ Found ${employees.length} employees for admin ${adminId}:`, employees.map(e => ({ id: e.employee_id, name: e.name })));
    
    res.json({ employees });
    
  } catch (error) {
    console.error('❌ Employee list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test route to check employee list without authentication
router.get('/test-list', async (req, res) => {
  try {
    console.log('🧪 Test employee list request (no auth)');
    
    // Fetch all employees for testing
    const employees = await db.query('SELECT * FROM employees ORDER BY name');
    
    console.log(`✅ Test found ${employees.length} total employees:`, employees.map(e => ({ id: e.employee_id, name: e.name })));
    
    res.json({ 
      message: 'Test successful',
      total_employees: employees.length,
      employees: employees 
    });
    
  } catch (error) {
    console.error('❌ Test employee list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Smart search for employees (by name, email, or partial match)
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const adminId = req.session.adminId;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search term must be at least 2 characters' });
    }
    
    const searchTerm = `%${q.trim()}%`;
    
    // Search by name, email, or employee ID
    const employees = await db.query(
      `SELECT employee_id, name, email, phone 
       FROM employees 
       WHERE admin_id = ? 
         AND (name LIKE ? OR email LIKE ? OR employee_id LIKE ? OR phone LIKE ?)
       ORDER BY 
         CASE 
           WHEN name LIKE ? THEN 1
           WHEN email LIKE ? THEN 2
           WHEN employee_id LIKE ? THEN 3
           ELSE 4
         END,
         name
       LIMIT 10`,
      [adminId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );
    
    res.json({ 
      employees,
      searchTerm: q.trim(),
      totalFound: employees.length
    });
    
  } catch (error) {
    console.error('Employee search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get employee details for view
router.get('/get/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.adminId;
    
    // Fetch employee from database
    const employees = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ?',
      [id, adminId]
    );
    
    if (employees.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    res.json({ success: true, employee: employees[0] });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Generate QR code for existing employee
router.post('/generate-qr/:id', requireAuth, async (req, res) => {
  try {
    console.log('Generate QR request received for ID:', req.params.id);
    console.log('Admin ID from session:', req.session.adminId);
    
    const { id } = req.params;
    const adminId = req.session.adminId;
    
    if (!adminId) {
      console.error('No admin ID in session');
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // Fetch employee from database
    const employees = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ?',
      [id, adminId]
    );
    
    console.log('Database query result:', employees);
    
    if (employees.length === 0) {
      console.error('Employee not found or admin mismatch');
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    const employee = employees[0];
    console.log('Employee found:', employee);
    
    // Generate new QR code data - simplified format for better scanning
    const qrData = JSON.stringify({
      id: employee.employee_id,
      name: employee.name
    });
    
    console.log('QR data to encode:', qrData);
    
    // Generate QR code image with higher error correction
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H', // Highest error correction
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log('QR code generated successfully, length:', qrCodeImage.length);
    
    // Update employee's QR code in database
    await db.execute(
      'UPDATE employees SET qr_code = ? WHERE employee_id = ?',
      [qrData, id]
    );
    
    console.log('Database updated successfully');
    
    res.json({ 
      success: true,
      qr_code: qrCodeImage,
      employee_name: employee.name
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});

// Regenerate all QR codes with new simplified format
router.post('/regenerate-all-qr', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    // Get all employees for this admin
    const employees = await db.query(
      'SELECT * FROM employees WHERE admin_id = ?',
      [adminId]
    );
    
    if (employees.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No employees found to regenerate QR codes',
        updated: 0 
      });
    }
    
    let updatedCount = 0;
    
    // Regenerate QR codes for each employee
    for (const employee of employees) {
      try {
        // Generate new simplified QR data
        const qrData = JSON.stringify({
          id: employee.employee_id,
          name: employee.name
        });
        
        // Update employee's QR code in database
        await db.execute(
          'UPDATE employees SET qr_code = ? WHERE employee_id = ?',
          [qrData, employee.employee_id]
        );
        
        updatedCount++;
      } catch (error) {
        console.error(`Error updating QR for employee ${employee.employee_id}:`, error);
      }
    }
    
    res.json({ 
      success: true,
      message: `Successfully regenerated ${updatedCount} QR codes with new format`,
      updated: updatedCount,
      total: employees.length
    });
    
  } catch (error) {
    console.error('Regenerate QR codes error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Train face recognition for an employee
router.post('/train-face', requireAuth, async (req, res) => {
  try {
    const { employee_id, face_data } = req.body;
    const adminId = req.session.adminId;
    
    if (!employee_id || !face_data || !Array.isArray(face_data)) {
      return res.status(400).json({ error: 'Employee ID and face data are required' });
    }
    
    // Verify employee exists and belongs to admin
    const employees = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ?',
      [employee_id, adminId]
    );
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employee = employees[0];
    
    // Store face data in database
    for (const faceItem of face_data) {
      const { descriptor, image } = faceItem;
      
      // Insert face training data
      await db.execute(
        'INSERT INTO face_training (employee_id, face_descriptor, face_image, created_at) VALUES (?, ?, ?, NOW())',
        [employee_id, JSON.stringify(descriptor), image]
      );
    }
    
    console.log(`Face training completed for employee ${employee.name} (ID: ${employee_id})`);
    
    res.json({ 
      message: 'Face training completed successfully',
      employee: employee,
      faces_trained: face_data.length
    });
    
  } catch (error) {
    console.error('Face training error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get face database for recognition
router.get('/face-database', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    // Get all employees with face training data
    const faceData = await db.query(`
      SELECT 
        ft.employee_id,
        ft.face_descriptor,
        ft.face_image,
        e.name,
        e.email
      FROM face_training ft
      JOIN employees e ON ft.employee_id = e.employee_id
      WHERE e.admin_id = ?
      ORDER BY ft.created_at DESC
    `, [adminId]);
    
    // Parse face descriptors
    const parsedData = faceData.map(item => ({
      employee_id: item.employee_id,
      descriptor: JSON.parse(item.face_descriptor),
      image: item.face_image,
      name: item.name,
      email: item.email
    }));
    
    res.json(parsedData);
    
  } catch (error) {
    console.error('Face database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get face training status for an employee
router.get('/face-status/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const adminId = req.session.adminId;
    
    // Verify employee belongs to admin
    const employees = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ?',
      [employeeId, adminId]
    );
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Get face training count
    const faceCount = await db.query(
      'SELECT COUNT(*) as count FROM face_training WHERE employee_id = ?',
      [employeeId]
    );
    
    res.json({ 
      employee_id: employeeId,
      faces_trained: faceCount[0].count,
      has_face_data: faceCount[0].count > 0
    });
    
  } catch (error) {
    console.error('Face status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete face training data for an employee
router.delete('/face-data/:employeeId', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const adminId = req.session.adminId;
    
    // Verify employee belongs to admin
    const employees = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ?',
      [employeeId, adminId]
    );
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Delete face training data
    await db.execute(
      'DELETE FROM face_training WHERE employee_id = ?',
      [employeeId]
    );
    
    console.log(`Face data deleted for employee ID: ${employeeId}`);
    
    res.json({ 
      message: 'Face training data deleted successfully',
      employee_id: employeeId
    });
    
  } catch (error) {
    console.error('Delete face data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete employee (and related data)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.adminId;

    // Verify employee belongs to admin
    const found = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ? LIMIT 1',
      [id, adminId]
    );
    if (found.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Remove face training data (no FK constraints guaranteed)
    try {
      await db.execute('DELETE FROM face_training WHERE employee_id = ?', [id]);
    } catch (_) {}

    // Remove attendance (also covered by FK ON DELETE CASCADE if present)
    try {
      await db.execute('DELETE FROM attendance WHERE employee_id = ?', [id]);
    } catch (_) {}

    // Delete employee
    await db.execute('DELETE FROM employees WHERE employee_id = ? AND admin_id = ?', [id, adminId]);

    res.json({ success: true, message: 'Employee deleted successfully', employee_id: Number(id) });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get employee by ID (generic route - must come last)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.adminId;
    
    // Fetch employee from database
    const employees = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ?',
      [id, adminId]
    );
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(employees[0]);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get face descriptors for advanced face recognition
router.get('/face-descriptors', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    // Get employees with face training data
    const faceData = await db.query(`
      SELECT 
        e.employee_id,
        e.name,
        ft.face_data,
        ft.quality_score
      FROM employees e
      LEFT JOIN face_training ft ON e.employee_id = ft.employee_id
      WHERE e.admin_id = ? AND ft.face_data IS NOT NULL
      ORDER BY e.name
    `, [adminId]);
    
    // Process face data to extract descriptors
    const descriptors = faceData.map(item => {
      try {
        const faceData = JSON.parse(item.face_data);
        return {
          employee_id: item.employee_id,
          name: item.name,
          descriptor: faceData.descriptor || [],
          quality: item.quality_score || 0.8
        };
      } catch (error) {
        console.error('Error parsing face data for employee:', item.employee_id);
        return null;
      }
    }).filter(item => item !== null);
    
    res.json(descriptors);
    
  } catch (error) {
    console.error('Face descriptors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Train face for employee (enhanced version)
router.post('/train-face', requireAuth, async (req, res) => {
  try {
    const { employee_id, face_data } = req.body;
    const adminId = req.session.adminId;
    
    if (!employee_id || !face_data) {
      return res.status(400).json({ error: 'Employee ID and face data are required' });
    }
    
    // Verify employee belongs to admin
    const employee = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ?',
      [employee_id, adminId]
    );
    
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Process face data to extract descriptor
    const processedFaceData = {
      descriptor: face_data.descriptor || [],
      images: face_data.images || [],
      timestamp: new Date().toISOString(),
      quality_score: calculateFaceQuality(face_data.images || [])
    };
    
    // Save or update face training data
    const existingTraining = await db.query(
      'SELECT * FROM face_training WHERE employee_id = ?',
      [employee_id]
    );
    
    if (existingTraining.length > 0) {
      // Update existing training
      await db.execute(
        'UPDATE face_training SET face_data = ?, quality_score = ?, updated_at = NOW() WHERE employee_id = ?',
        [JSON.stringify(processedFaceData), processedFaceData.quality_score, employee_id]
      );
    } else {
      // Insert new training
      await db.execute(
        'INSERT INTO face_training (employee_id, face_data, quality_score, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [employee_id, JSON.stringify(processedFaceData), processedFaceData.quality_score]
      );
    }
    
    res.json({ 
      message: 'Face training data saved successfully',
      quality_score: processedFaceData.quality_score
    });
    
  } catch (error) {
    console.error('Face training error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Face Training Routes
router.post('/train-face', requireAuth, async (req, res) => {
  try {
    const { employee_id, face_images, timestamp } = req.body;
    
    if (!employee_id || !face_images || !Array.isArray(face_images)) {
      return res.status(400).json({ error: 'Invalid training data' });
    }
    
    // Check if employee exists and belongs to admin
    const adminId = req.session.adminId;
    const employee = await db.query(
      'SELECT * FROM employees WHERE employee_id = ? AND admin_id = ?',
      [employee_id, adminId]
    );
    
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Store face training data
    for (let i = 0; i < face_images.length; i++) {
      await db.execute(
        'INSERT INTO face_training (employee_id, face_data, quality_score, created_at) VALUES (?, ?, ?, ?)',
        [employee_id, face_images[i], 0.8, timestamp]
      );
    }
    
    res.status(200).json({ 
      message: 'Face training data saved successfully',
      images_saved: face_images.length
    });
    
  } catch (error) {
    console.error('Face training error:', error);
    res.status(500).json({ error: 'Failed to save face training data' });
  }
});

router.get('/face-descriptors', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    // Get face training data for admin's employees
    const faceData = await db.query(`
      SELECT ft.employee_id, ft.face_data, ft.quality_score, e.name
      FROM face_training ft
      JOIN employees e ON ft.employee_id = e.employee_id
      WHERE e.admin_id = ?
      ORDER BY ft.created_at DESC
    `, [adminId]);
    
    res.status(200).json(faceData);
    
  } catch (error) {
    console.error('Face descriptors error:', error);
    res.status(500).json({ error: 'Failed to fetch face descriptors' });
  }
});

// Helper function to calculate face quality
function calculateFaceQuality(images) {
  if (!images || images.length === 0) return 0.5;
  
  // Calculate quality based on number of images and their properties
  let totalQuality = 0;
  
  images.forEach(image => {
    // Basic quality calculation based on image size and format
    if (image.includes('data:image/jpeg')) {
      totalQuality += 0.8; // JPEG images are good quality
    } else if (image.includes('data:image/png')) {
      totalQuality += 0.9; // PNG images are high quality
    } else {
      totalQuality += 0.6; // Other formats
    }
  });
  
  // Average quality with bonus for multiple images
  const avgQuality = totalQuality / images.length;
  const multiImageBonus = Math.min(0.2, images.length * 0.05);
  
  return Math.min(1.0, avgQuality + multiImageBonus);
}

module.exports = router;
