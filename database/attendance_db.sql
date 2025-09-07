-- Employee Attendance Management System Database Schema
-- Database: attendance_db
-- For XAMPP phpMyAdmin

-- Create database
CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

-- Admins table - stores admin accounts
CREATE TABLE admins (
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
);

-- Employees table - stores employee records
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    name VARCHAR(80) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20),
    qr_code VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE
);

-- Attendance table - stores attendance logs
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Present', 'Late', 'Absent') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Face training table for face recognition
CREATE TABLE face_training (
    training_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    face_descriptor LONGTEXT,
    face_image LONGTEXT,
    face_data LONGTEXT,
    quality_score DECIMAL(3,2) DEFAULT 0.80,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_employees_admin ON employees(admin_id);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(timestamp);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_face_training_employee ON face_training(employee_id);

-- Insert sample admin account (password: admin123)
INSERT INTO admins (name, email, phone, organization, username, password, security_question, security_answer) VALUES
('Admin User', 'admin@company.com', '+1234567890', 'Company Inc', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'What is your password?', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert sample employees
INSERT INTO employees (admin_id, name, email, phone, qr_code) VALUES
(1, 'Alice Johnson', 'alice@company.com', '+1234567891', '{"employee_id": 1, "name": "Alice Johnson"}'),
(1, 'Bob Smith', 'bob@company.com', '+1234567892', '{"employee_id": 2, "name": "Bob Smith"}'),
(1, 'Carol Davis', 'carol@company.com', '+1234567893', '{"employee_id": 3, "name": "Carol Davis"}');

-- Insert sample attendance records (for today)
INSERT INTO attendance (employee_id, status, timestamp) VALUES
(1, 'Present', CONCAT(CURDATE(), ' 08:30:00')),
(2, 'Late', CONCAT(CURDATE(), ' 09:15:00'));

-- Create view for attendance summary
CREATE VIEW attendance_summary AS
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
ORDER BY e.name;

-- Create view for daily statistics
CREATE VIEW daily_stats AS
SELECT 
    COUNT(*) as total_employees,
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late_count,
    COUNT(CASE WHEN a.status = 'Absent' OR a.status IS NULL THEN 1 END) as absent_count
FROM employees e
LEFT JOIN attendance a ON e.employee_id = a.employee_id 
    AND DATE(a.timestamp) = CURDATE();

-- Show tables
SHOW TABLES;

-- Show sample data
SELECT 'Admins:' as table_name;
SELECT admin_id, name, email, username FROM admins;

SELECT 'Employees:' as table_name;
SELECT employee_id, name, email, admin_id FROM employees;

SELECT 'Today\'s Attendance:' as table_name;
SELECT e.name, a.status, a.timestamp 
FROM employees e 
LEFT JOIN attendance a ON e.employee_id = a.employee_id 
    AND DATE(a.timestamp) = CURDATE()
ORDER BY e.name;
