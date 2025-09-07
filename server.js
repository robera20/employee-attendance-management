const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

// Import database connection
const db = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const dashboardRoutes = require('./routes/dashboard');
const attendanceRoutes = require('./routes/attendance');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
// Body parsing middleware with increased limits for face training
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static('Frontend'));
// Serve project images directory at /images
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    }
}));

// Ensure employees table has required columns on startup
(async () => {
  try {
    if (typeof db.ensureEmployeeColumns === 'function') {
      const ok = await db.ensureEmployeeColumns();
      if (!ok) {
        console.warn('⚠️ Could not verify employee columns');
      }
    }
  } catch (e) {
    console.warn('⚠️ Employee columns check failed:', e.message);
  }
})();

// Error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress
  };
  
  console.error('🚨 Server error:', errorInfo);
  
  // Don't expose internal errors to client in production
  const clientError = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(500).json({
    error: clientError,
    timestamp,
    requestId: Math.random().toString(36).substring(2, 11)
  });
});

// Remove duplicate middleware - already handled above

// Routes with specific body size limits for face training
app.use('/auth', authRoutes);
app.use('/employee', employeeRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/reports', reportsRoutes);

// Serve local face-api models if available
app.use('/face-models', express.static(path.join(__dirname, 'Frontend', 'face-models')));

// Proxy face-api model weights to avoid CDN/CORS issues
app.get('/face-models/*', async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const sources = [
      `https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/${filePath}`,
      `https://unpkg.com/face-api.js@0.22.2/weights/${filePath}`
    ];

    for (const url of sources) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType) res.set('Content-Type', contentType);
          res.set('Cache-Control', 'public, max-age=86400');
          res.set('Access-Control-Allow-Origin', '*');
          const buffer = Buffer.from(await response.arrayBuffer());
          return res.status(200).send(buffer);
        }
      } catch (err) {
        // Try next source
        continue;
      }
    }

    res.status(502).send('Failed to fetch model file from all sources');
  } catch (error) {
    console.error('Model proxy error:', error);
    res.status(500).send('Internal server error');
  }
});

// Face training middleware is handled by the main middleware above with 100mb limit

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'signup.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'signup.html'));
});

app.get('/signin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'signin.html'));
});

// Middleware to check authentication for protected pages
const requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect('/signin.html');
  }
  next();
};

app.get('/dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'dashboard.html'));
});

app.get('/employees.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'employees.html'));
});

app.get('/employee-add.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'employee-add.html'));
});

app.get('/employees-new.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'employees-new.html'));
});

app.get('/scanner.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'scanner.html'));
});

app.get('/reports.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'reports.html'));
});

app.get('/profile.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'html', 'profile.html'));
});

// Test database connection route
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 as test');
    res.json({ 
      status: 'success', 
      message: 'Database connection working',
      test: result[0].test 
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📁 Frontend files served from /Frontend folder');
  console.log('🔐 API routes available at /auth, /employee, /dashboard, /attendance');
      console.log(`🧪 Test database: http://localhost:${PORT}/test-db`);
});

module.exports = app;
