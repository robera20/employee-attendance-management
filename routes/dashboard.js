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

// Enhanced dashboard summary with growth rates
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    // Get current stats
    const currentStats = await db.query(`
      SELECT 
        COUNT(*) as totalEmployees,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as newToday
      FROM employees 
      WHERE admin_id = ?
    `, [adminId]);
    
    // Get today's attendance
    const todayAttendance = await db.query(`
      SELECT 
        COUNT(DISTINCT e.employee_id) as totalEmployees,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as presentToday,
        SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as lateToday,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absentToday
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id AND DATE(a.timestamp) = CURDATE()
      WHERE e.admin_id = ?
    `, [adminId]);
    
    // Get yesterday's attendance for comparison
    const yesterdayAttendance = await db.query(`
      SELECT 
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as presentYesterday,
        SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as lateYesterday,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absentYesterday
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id AND DATE(a.timestamp) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      WHERE e.admin_id = ?
    `, [adminId]);
    
    // Calculate growth rates
    const totalEmployees = currentStats[0]?.totalEmployees || 0;
    const newToday = currentStats[0]?.newToday || 0;
    const employeeGrowth = totalEmployees > 0 ? Math.round((newToday / totalEmployees) * 100) : 0;
    
    const presentToday = todayAttendance[0]?.presentToday || 0;
    const lateToday = todayAttendance[0]?.lateToday || 0;
    const absentToday = todayAttendance[0]?.absentToday || 0;
    
    const presentYesterday = yesterdayAttendance[0]?.presentYesterday || 0;
    const lateYesterday = yesterdayAttendance[0]?.lateYesterday || 0;
    const absentYesterday = yesterdayAttendance[0]?.absentYesterday || 0;
    
    const presentRate = presentYesterday > 0 ? Math.round(((presentToday - presentYesterday) / presentYesterday) * 100) : 0;
    const lateRate = lateYesterday > 0 ? Math.round(((lateToday - lateYesterday) / lateYesterday) * 100) : 0;
    const absentRate = absentYesterday > 0 ? Math.round(((absentToday - absentYesterday) / absentYesterday) * 100) : 0;
    
    res.json({
      totalEmployees,
      employeeGrowth,
      presentToday,
      presentRate,
      lateToday,
      lateRate,
      absentToday,
      absentRate,
      newToday
    });
    
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Employee status for today
router.get('/employee-status', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    const employees = await db.query(`
      SELECT 
        e.employee_id,
        e.name,
        e.email,
        e.phone,
        COALESCE(a.status, 'Present') as status,
        a.timestamp,
        a.attendance_id
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id AND DATE(a.timestamp) = CURDATE()
      WHERE e.admin_id = ?
      ORDER BY e.name
    `, [adminId]);
    
    res.json({ employees });
    
  } catch (error) {
    console.error('Employee status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent activity feed
router.get('/recent-activity', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    // Get recent attendance records
    const attendanceActivity = await db.query(`
      SELECT 
        'attendance' as type,
        CONCAT(e.name, ' marked as ', a.status) as description,
        a.timestamp,
        e.employee_id
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE e.admin_id = ? AND a.timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY a.timestamp DESC
      LIMIT 10
    `, [adminId]);
    
    // Get recent employee additions
    const employeeActivity = await db.query(`
      SELECT 
        'employee' as type,
        CONCAT('New employee added: ', name) as description,
        created_at as timestamp,
        employee_id
      FROM employees
      WHERE admin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
      LIMIT 5
    `, [adminId]);
    
    // Combine and sort activities
    const activities = [...attendanceActivity, ...employeeActivity]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 15);
    
    res.json({ activities });
    
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Attendance trend chart data
router.get('/attendance-trend', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const days = parseInt(req.query.days) || 7;
    
    const trendData = await db.query(`
      SELECT 
        DATE(a.timestamp) as date,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE e.admin_id = ? AND a.timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(a.timestamp)
      ORDER BY date
    `, [adminId, days]);
    
    // Generate labels for the last N days
    const labels = [];
    const present = [];
    const late = [];
    const absent = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      const dayData = trendData.find(d => d.date.toISOString().split('T')[0] === dateStr);
      present.push(dayData ? dayData.present : 0);
      late.push(dayData ? dayData.late : 0);
      absent.push(dayData ? dayData.absent : 0);
    }
    
    res.json({ labels, present, late, absent });
    
  } catch (error) {
    console.error('Attendance trend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Department performance chart (simulated for now)
router.get('/department-performance', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    // Get today's attendance summary
    const todayStats = await db.query(`
      SELECT 
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE e.admin_id = ? AND DATE(a.timestamp) = CURDATE()
    `, [adminId]);
    
    const present = todayStats[0]?.present || 0;
    const late = todayStats[0]?.late || 0;
    const absent = todayStats[0]?.absent || 0;
    
    res.json({ present, late, absent });
    
  } catch (error) {
    console.error('Department performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quick employee search for dashboard
router.get('/search-employees', requireAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ employees: [] });
    }
    
    const searchTerm = `%${q.trim()}%`;
    
    const employees = await db.query(`
      SELECT employee_id, name, email, phone
      FROM employees 
      WHERE admin_id = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
      ORDER BY name
      LIMIT 10
    `, [adminId, searchTerm, searchTerm, searchTerm]);
    
    res.json({ employees });
    
  } catch (error) {
    console.error('Employee search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
