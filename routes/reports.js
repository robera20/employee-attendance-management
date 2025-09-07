const express = require('express');
const db = require('../db');

const router = express.Router();

// Middleware to check if admin is logged in
const requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Generate comprehensive attendance report
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { type, period, startDate, endDate } = req.body;
    const adminId = req.session.adminId;

    // Validate required fields
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get all employees for this admin
    const employees = await db.query(
      'SELECT employee_id, name, email FROM employees WHERE admin_id = ?',
      [adminId]
    );

    if (employees.length === 0) {
      return res.json({
        totalEmployees: 0,
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0,
        startDate,
        endDate,
        type,
        attendanceDetails: []
      });
    }

    const employeeIds = employees.map(emp => emp.employee_id);
    const placeholders = employeeIds.map(() => '?').join(',');

    // Get attendance data for the date range
    const attendanceQuery = `
      SELECT 
        employee_id,
        status,
        COUNT(*) as count
      FROM attendance 
      WHERE employee_id IN (${placeholders}) 
        AND DATE(timestamp) BETWEEN ? AND ?
      GROUP BY employee_id, status
    `;

    const attendanceParams = [...employeeIds, startDate, endDate];
    const attendanceResults = await db.query(attendanceQuery, attendanceParams);

    // Process attendance data
    const attendanceMap = {};
    employees.forEach(emp => {
      attendanceMap[emp.employee_id] = {
        employee_id: emp.employee_id,
        name: emp.name,
        email: emp.email,
        present: 0,
        late: 0,
        absent: 0
      };
    });

    // Count attendance by status
    attendanceResults.forEach(record => {
      if (attendanceMap[record.employee_id]) {
        attendanceMap[record.employee_id][record.status.toLowerCase()] = record.count;
      }
    });

    // Calculate totals
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;

    Object.values(attendanceMap).forEach(emp => {
      totalPresent += emp.present;
      totalLate += emp.late;
      totalAbsent += emp.absent;
    });

    // Convert to array and sort by name
    const attendanceDetails = Object.values(attendanceMap).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      totalEmployees: employees.length,
      totalPresent,
      totalLate,
      totalAbsent,
      startDate,
      endDate,
      type,
      attendanceDetails
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get quick summary for dashboard
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const today = new Date().toISOString().split('T')[0];

    // Get total employees
    const employeesResult = await db.query(
      'SELECT COUNT(*) as count FROM employees WHERE admin_id = ?',
      [adminId]
    );
    const totalEmployees = employeesResult[0].count;

    if (totalEmployees === 0) {
      return res.json({
        totalEmployees: 0,
        todayPresent: 0,
        todayLate: 0,
        todayAbsent: 0
      });
    }

    // Get today's attendance
    const todayAttendance = await db.query(
      'SELECT status, COUNT(*) as count FROM attendance a JOIN employees e ON a.employee_id = e.employee_id WHERE e.admin_id = ? AND DATE(a.timestamp) = ? GROUP BY status',
      [adminId, today]
    );

    let todayPresent = 0;
    let todayLate = 0;
    let todayAbsent = 0;

    todayAttendance.forEach(record => {
      if (record.status === 'Present') todayPresent = record.count;
      else if (record.status === 'Late') todayLate = record.count;
      else if (record.status === 'Absent') todayAbsent = record.count;
    });

    // Calculate absent (employees not marked present or late today)
    todayAbsent = totalEmployees - todayPresent - todayLate;

    res.json({
      totalEmployees,
      todayPresent,
      todayLate,
      todayAbsent
    });

  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
