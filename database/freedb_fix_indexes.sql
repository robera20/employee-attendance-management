-- Fix indexes for FreeDB.tech (MySQL version compatibility)
USE freedb_employee_attendance;

-- Drop indexes if they exist, then recreate them
DROP INDEX IF EXISTS idx_employees_admin ON employees;
DROP INDEX IF EXISTS idx_attendance_employee ON attendance;
DROP INDEX IF EXISTS idx_attendance_date ON attendance;
DROP INDEX IF EXISTS idx_attendance_status ON attendance;
DROP INDEX IF EXISTS idx_face_training_employee ON face_training;

-- Create indexes
CREATE INDEX idx_employees_admin ON employees(admin_id);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(timestamp);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_face_training_employee ON face_training(employee_id);
