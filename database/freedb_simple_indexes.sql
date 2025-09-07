-- Simple indexes for FreeDB.tech (compatible with older MySQL versions)
USE freedb_employee_attendance;

-- Create indexes (will show error if they already exist, but that's okay)
CREATE INDEX idx_employees_admin ON employees(admin_id);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(timestamp);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_face_training_employee ON face_training(employee_id);
