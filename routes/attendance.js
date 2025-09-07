const express = require('express');
const db = require('../db');

const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Mark attendance when QR code is scanned
router.post('/mark', async (req, res) => {
  try {
    const { employee_id } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    // Verify employee exists and get details
    const employees = await db.query(
      'SELECT employee_id, name, email, phone FROM employees WHERE employee_id = ?',
      [employee_id]
    );
    
    if (employees.length === 0) {
      // Try to find similar employees for better error messages
      const similarEmployees = await db.query(
        'SELECT employee_id, name, email FROM employees WHERE employee_id LIKE ? OR name LIKE ? OR email LIKE ? LIMIT 3',
        [`%${employee_id}%`, `%${employee_id}%`, `%${employee_id}%`]
      );
      
      let errorMessage = 'Employee not found';
      if (similarEmployees.length > 0) {
        errorMessage += `. Did you mean: ${similarEmployees.map(emp => `${emp.name} (ID: ${emp.employee_id})`).join(', ')}?`;
      } else {
        errorMessage += '. Please check the employee ID or contact administrator.';
      }
      
      return res.status(404).json({ 
        error: errorMessage,
        suggestions: similarEmployees,
        searchedId: employee_id
      });
    }
    
    const employee = employees[0];
    const now = new Date();
    // Compute Ethiopia local time (EAT, UTC+3) independent of server timezone
    const eatHour = (now.getUTCHours() + 3) % 24;
    const eatMinute = now.getUTCMinutes();
    
    // Determine attendance status based on EAT cutoff at 08:30
    let status = 'Present';
    if (eatHour > 8 || (eatHour === 8 && eatMinute > 30)) {
      status = 'Late'; // After 08:30 EAT is Late
    }
    
    // Check if attendance already marked for today
    const existingAttendance = await db.query(`
      SELECT * FROM attendance 
      WHERE employee_id = ? AND DATE(timestamp) = CURDATE()
    `, [employee_id]);
    
    if (existingAttendance.length > 0) {
      return res.status(400).json({ 
        error: 'Attendance already marked for today',
        status: existingAttendance[0].status,
        timestamp: existingAttendance[0].timestamp,
        employee: employee
      });
    }
    
    // Insert attendance record
    const result = await db.execute(
      'INSERT INTO attendance (employee_id, status, timestamp) VALUES (?, ?, ?)',
      [employee_id, status, now]
    );
    
    // Log successful attendance marking
    console.log(`Attendance marked: Employee ${employee.name} (ID: ${employee_id}) - ${status} at ${now.toLocaleString()}`);
    
    res.json({ 
      message: `Attendance marked successfully for ${employee.name}`,
      status: status,
      timestamp: now,
      employee_id: employee_id,
      employee: employee,
      success: true
    });
    
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update existing attendance record
router.put('/update/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Verify employee exists
    const employees = await db.query(
      'SELECT * FROM employees WHERE employee_id = ?',
      [employeeId]
    );
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employee = employees[0];
    
    // Get today's attendance record
    const existingAttendance = await db.query(`
      SELECT * FROM attendance 
      WHERE employee_id = ? AND DATE(timestamp) = CURDATE()
      ORDER BY timestamp DESC
      LIMIT 1
    `, [employeeId]);
    
    if (existingAttendance.length === 0) {
      return res.status(404).json({ error: 'No attendance record found for today' });
    }
    
    const existing = existingAttendance[0];
    const oldStatus = existing.status;
    
    // Update attendance record
    await db.execute(
      'UPDATE attendance SET status = ?, updated_at = NOW() WHERE attendance_id = ?',
      [status, existing.attendance_id]
    );
    
    console.log(`Attendance updated: Employee ${employee.name} (ID: ${employeeId}) - ${oldStatus} → ${status}`);
    
    res.json({ 
      message: `Attendance updated successfully for ${employee.name}`,
      oldStatus: oldStatus,
      newStatus: status,
      employee: employee,
      success: true
    });
    
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance statistics for an employee
router.get('/stats/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Get attendance statistics
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'Late' THEN 1 END) as late_days,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_days
      FROM attendance 
      WHERE employee_id = ?
    `, [employeeId]);
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
 
// Export attendance CSV for current admin
router.get('/export', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const rows = await db.query(`
      SELECT a.attendance_id, a.employee_id, e.name, e.email, e.phone, e.department, e.position,
             a.status, a.timestamp
      FROM attendance a
      JOIN employees e ON e.employee_id = a.employee_id
      WHERE e.admin_id = ?
      ORDER BY a.timestamp DESC
    `, [adminId]);

    const header = ['attendance_id','employee_id','name','email','phone','department','position','status','timestamp'];
    const csv = [header.join(',')].concat(
      rows.map(r => [
        r.attendance_id,
        r.employee_id,
        (r.name||'').replace(/"/g,'""'),
        (r.email||'').replace(/"/g,'""'),
        (r.phone||'').replace(/"/g,'""'),
        (r.department||'').replace(/"/g,'""'),
        (r.position||'').replace(/"/g,'""'),
        r.status,
        r.timestamp ? new Date(r.timestamp).toISOString() : ''
      ].map(v => '"'+String(v)+'"').join(','))
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ error: 'Failed to export attendance' });
  }
});
