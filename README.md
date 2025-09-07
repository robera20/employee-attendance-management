# 🚀 Employee Attendance Management System

A complete web-based employee attendance system with QR code scanning, built with Node.js, Express, MySQL, and vanilla JavaScript.

## ✨ Features

- **Admin Authentication** - Secure signup/signin with bcrypt hashing
- **Employee Management** - Add, view, and manage employees
- **QR Code Generation** - Unique QR codes for each employee
- **Attendance Tracking** - QR scanning with time-based status (Present/Late/Absent)
- **Dashboard Reports** - Real-time attendance statistics
- **Responsive Design** - Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Authentication:** bcryptjs, express-session
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **QR Code:** qrcode library for generation, html5-qrcode for scanning

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)

### 1. Install Dependencies
```bash
npm install
```

### 2. Quick Setup (Recommended)
```bash
npm run quick-setup
```

### 3. Start the Server
```bash
npm start
```

### 4. Access the System
- Open: http://localhost:5000
- Login: admin / admin123

## 📋 Manual Setup (Alternative)

If quick setup doesn't work:

### 1. Test Database Connection
```bash
npm run test-db
```

### 2. Run Full Setup
```bash
npm run setup
```

### 3. Start Server
```bash
npm start
```

## 🔧 Configuration

### Database Settings
Edit `db.js` with your MySQL credentials:
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  port: 3306
};
```

### Server Settings
Edit `server.js` to change port:
```javascript
const PORT = process.env.PORT || 5000;
```

## 📁 Project Structure

```
attendance-system/
├── server.js              # Main server file
├── db.js                  # Database connection
├── quick-setup.js         # Quick database setup
├── setup.js               # Full database setup
├── test-db.js             # Database connection test
├── package.json           # Dependencies and scripts
├── routes/                # API routes
│   ├── auth.js           # Authentication routes
│   ├── employee.js       # Employee management
│   ├── dashboard.js      # Dashboard data
│   └── attendance.js     # Attendance tracking
├── Frontend/              # Frontend files
│   ├── html/             # HTML pages
│   ├── css/              # Stylesheets
│   └── js/               # JavaScript files
└── database/              # Database schema
    └── attendance_db.sql  # SQL schema file
```

## 🔐 Default Login

- **Username:** admin
- **Password:** admin123

## 🧪 Testing

### Test Database Connection
```bash
npm run test-db
```

### Test API Endpoints
- Database test: http://localhost:5000/test-db
- Health check: http://localhost:5000/

## 🚨 Troubleshooting

### Common Issues

1. **"Cannot connect to MySQL"**
   - Check if MySQL is running
   - Verify credentials in `db.js`
   - Ensure port 3306 is accessible

2. **"Database not found"**
   - Run: `npm run quick-setup`
   - Check MySQL permissions

3. **"Unexpected end of JSON input"**
   - Check server console for errors
   - Verify database connection
   - Run database setup

4. **"Cannot GET /signin.html"**
   - Server routing issue fixed
   - Check if server is running
   - Verify file paths

### Debug Commands

```bash
# Test database connection
npm run test-db

# Quick setup (recommended)
npm run quick-setup

# Full setup
npm run setup

# Start server
npm start

# Development mode
npm run dev
```

## 📱 Usage

### Admin Workflow
1. **Signup/Login** → Create account or login
2. **Dashboard** → View attendance statistics
3. **Add Employees** → Register new employees
4. **Generate QR Codes** → Create unique QR codes
5. **View Reports** → Monitor attendance data

### Employee Workflow
1. **Receive QR Code** → Get unique QR code from admin
2. **Scan QR Code** → Use scanner page to mark attendance
3. **Check Status** → View attendance history

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- Input validation and sanitization
- SQL injection protection
- CORS configuration

## 🚀 Deployment

### Production Considerations
- Change session secret in `server.js`
- Use environment variables for database credentials
- Enable HTTPS
- Set up proper MySQL user permissions
- Configure reverse proxy (nginx)

### Environment Variables
```bash
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=3306
SESSION_SECRET=your_secret_key
PORT=5000
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Run `npm run test-db` to verify database
3. Check server console for error messages
4. Ensure all dependencies are installed

## 📄 License

MIT License - feel free to use and modify as needed.

---

**Made with ❤️ for efficient employee attendance management**
