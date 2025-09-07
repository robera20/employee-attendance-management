

// Verify functions are loaded in global scope
window.viewEmployee = viewEmployee;
// QR features removed from personal view

console.log('Employee functions loaded:', {
    viewEmployee: typeof viewEmployee,
    generateQR: typeof generateQR,
    generateQRImage: typeof generateQRImage,
    downloadQR: typeof downloadQR
});

// Global functions for employee actions
function viewEmployee(id) {
    // Try local demo data first (used by employees.html mock data)
    try {
        const local = Array.isArray(window.employeesDemoData)
            ? window.employeesDemoData.find(e => String(e.id) === String(id) || String(e.employee_id) === String(id))
            : null;
        if (local) {
            showEmployeeDetails(local);
            return;
        }
    } catch (e) {
        console.warn('Local employees demo data check failed:', e);
    }

    // Fallback to API (authenticated)
    fetch(`/employee/get/${id}`, { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            // Handle both { success, employee } and direct object payloads
            const employee = data && data.success ? data.employee : (data && data.employee_id ? data : null);
            if (employee) {
                showEmployeeDetails(employee);
            } else {
                const message = (data && data.error) ? data.error : 'Error loading employee details';
                alert(message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading employee details');
        });
}

function showEmployeeDetails(employee) {
    ensureEmployeeDetailStyles();

    const employeeId = employee.employee_id || employee.id || '—';
    const name = employee.name || '—';
    const email = employee.email || '—';
    const phone = employee.phone || '—';
    const department = employee.department || '—';
    const position = employee.position || '—';
    const status = (employee.status || 'active').toString();
    const addedAt = employee.created_at || employee.joinDate || new Date().toISOString();
    const initials = String(name).trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('') || 'EMP';
    const hasNumericId = /^(\d+)$/.test(String(employeeId));

    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.innerHTML = `
        <div class="qr-modal-content employee-details-card">
            <button class="modal-close" onclick="this.closest('.qr-modal').remove()">×</button>
            <div class="employee-modal-header">
                <div class="employee-avatar">${initials}</div>
                <div class="employee-title">
                    <h3>${name}</h3>
                    <div class="employee-subtitle">
                        <span><i class="fas fa-id-badge"></i> ID: ${employeeId}</span>
                        <span class="status-badge status-${status}"><i class="fas fa-circle"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </div>
                </div>
            </div>

            <div class="employee-info-grid">
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-briefcase"></i> Position</div>
                    <div class="info-value">${position}</div>
                </div>
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-sitemap"></i> Department</div>
                    <div class="info-value">${department}</div>
                </div>
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-calendar-alt"></i> Joined</div>
                    <div class="info-value">${new Date(addedAt).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-at"></i> Email</div>
                    <div class="info-value"><a href="mailto:${email}">${email}</a></div>
                </div>
                <div class="info-item">
                    <div class="info-label"><i class="fas fa-phone"></i> Phone</div>
                    <div class="info-value"><a href="tel:${phone}">${phone}</a></div>
                </div>
            </div>

            <div class="employee-modal-actions">
                ${hasNumericId ? `
                <button class="action" onclick="window.trainFaceRecognition ? trainFaceRecognition(${employeeId}, '${String(name).replace(/'/g, "&#39;")}') : alert('Face training function not available')">
                    <i class="fas fa-user-check"></i>
                    Train Face
                </button>
                <button class="action" onclick="window.editEmployee ? editEmployee(${employeeId}) : alert('Edit function not available on this page')">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                ` : ''}
                <button class="action outline" onclick="this.closest('.qr-modal').remove()">
                    <i class="fas fa-arrow-left"></i>
                    Back to List
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function ensureEmployeeDetailStyles() {
    if (document.getElementById('employee-details-styles')) return;
    const style = document.createElement('style');
    style.id = 'employee-details-styles';
    style.textContent = `
    .employee-details-card {
        position: relative;
        padding: 0;
        border-radius: 16px;
        overflow: hidden;
    }
    .employee-modal-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px;
        background: linear-gradient(135deg, var(--primary-600, #4f46e5), var(--primary-800, #3730a3));
        color: #fff;
    }
    .employee-avatar {
        width: 64px; height: 64px;
        border-radius: 50%;
        background: rgba(255,255,255,0.15);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 22px;
        border: 2px solid rgba(255,255,255,0.35);
    }
    .employee-title h3 { margin: 0 0 6px 0; font-size: 22px; }
    .employee-subtitle { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; opacity: 0.95; }
    .employee-subtitle i { margin-right: 6px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.15); }
    .status-badge i { font-size: 8px; }

    .employee-info-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px; padding: 20px 24px; background: var(--surface-100, #fff);
    }
    .info-item { background: var(--surface-50, #fafafa); border: 1px solid var(--surface-200, #eee); border-radius: 12px; padding: 12px 14px; }
    .info-label { font-size: 12px; color: var(--text-muted, #6b7280); display: flex; align-items: center; gap: 8px; }
    .info-value { margin-top: 6px; font-weight: 600; }
    .info-value a { color: inherit; text-decoration: none; }

    .employee-modal-actions { display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 24px 24px; }
    .employee-modal-actions .action {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 14px; border-radius: 10px;
        background: var(--primary-600, #4f46e5); color: #fff; border: none; cursor: pointer;
        transition: transform .05s ease, opacity .2s ease;
    }
    .employee-modal-actions .action:hover { transform: translateY(-1px); opacity: .95; }
    .employee-modal-actions .action.outline { background: transparent; color: var(--primary-700, #4338ca); border: 1px solid var(--primary-200, #c7d2fe); }
    `;
    document.head.appendChild(style);
}

function generateQR(id) {
    console.log('Generating QR for employee ID:', id);
    
    // First, try to get the existing QR code from the database
    fetch(`/employee/get/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.employee.qr_code) {
                console.log('Found existing QR code data:', data.employee.qr_code);
                
                try {
                    // Try to parse the existing QR code data
                    const qrData = JSON.parse(data.employee.qr_code);
                    console.log('Parsed QR data:', qrData);
                    
                    // If it's just JSON data, we need to generate the actual QR image
                    if (qrData.id && qrData.name) {
                        console.log('Generating QR image from existing data...');
                        generateQRImage(id);
                    } else {
                        throw new Error('Invalid QR data format');
                    }
                } catch (parseError) {
                    console.log('Existing QR data is not JSON, generating new QR...');
                    generateQRImage(id);
                }
            } else {
                console.log('No existing QR code found, generating new one...');
                generateQRImage(id);
            }
        })
        .catch(error => {
            console.error('Error checking existing QR:', error);
            // Fallback to generating new QR
            generateQRImage(id);
        });
}

// Separate function to generate QR image
function generateQRImage(id) {
    console.log('Generating QR image for employee ID:', id);
    
    fetch(`/employee/generate-qr/${id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            if (data.success) {
                showQRCode(data.qr_code, data.employee_name, id);
            } else {
                const errorMsg = data.error || 'Unknown error';
                console.error('QR generation failed:', errorMsg);
                alert('Error generating QR code: ' + errorMsg);
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            alert('Error generating QR code: ' + error.message);
        });
}

function downloadQR(qrCodeData, employeeName) {
    try {
        console.log('Downloading QR for:', employeeName);
        console.log('QR data type:', typeof qrCodeData);
        
        // Method 1: Try direct download first (works better for data URLs)
        if (qrCodeData.startsWith('data:image/')) {
            const link = document.createElement('a');
            link.href = qrCodeData;
            link.download = `${employeeName}_QR.png`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('Direct download attempted');
            return;
        }
        
        // Method 2: Canvas method for other formats
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${employeeName}_QR.png`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('Canvas download completed');
            }, 'image/png');
        };
        
        img.onerror = function() {
            console.error('Image failed to load');
            alert('Failed to load QR code image. Please try again.');
        };
        
        img.src = qrCodeData;
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading QR code. Please try right-clicking and "Save image as..."');
    }
}



// Train face recognition for an employee
async function trainFaceRecognition(employeeId, employeeName) {
    try {
        // Open the face training modal from scanner page
        if (window.scanner) {
            // If scanner is available, open training modal
            window.scanner.showFaceTrainingModal();
            // Pre-select the employee
            setTimeout(() => {
                const select = document.getElementById('trainingEmployeeSelect');
                if (select) {
                    select.value = employeeId;
                    select.dispatchEvent(new Event('change'));
                }
            }, 100);
        } else {
            // Fallback: redirect to scanner page with training mode
            window.location.href = `/scanner.html?mode=face&train=${employeeId}`;
        }
    } catch (error) {
        console.error('Error opening face training:', error);
        alert('Error opening face training. Please go to the Scanner page and use the Train Face button.');
    }
}

// Make functions globally accessible
window.trainFaceRecognition = trainFaceRecognition;

// Add missing functions that are referenced in the HTML
function showBulkImportModal() {
    document.getElementById('bulkImportModal').style.display = 'block';
}

function closeBulkImport() {
    document.getElementById('bulkImportModal').style.display = 'none';
}

function exportEmployees() {
    // Simple export functionality
    const employees = Array.from(document.querySelectorAll('#employeeList tr')).slice(1); // Skip header
    if (employees.length === 0) {
        alert('No employees to export');
        return;
    }
    
    let csv = 'Name,Email,Phone,Department\n';
    employees.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            const name = cells[1].textContent;
            const email = cells[2].textContent;
            const phone = cells[3].textContent;
            const department = cells[4] ? cells[4].textContent : '';
            csv += `"${name}","${email}","${phone}","${department}"\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function showBulkActions() {
    document.getElementById('bulkActionsModal').style.display = 'block';
}

function closeBulkActions() {
    document.getElementById('bulkActionsModal').style.display = 'none';
}

function bulkExportData() {
    // Export selected employees (placeholder)
    alert('Bulk export functionality will be implemented here');
    closeBulkActions();
}

function bulkDeleteEmployees() {
    // Bulk delete functionality (placeholder)
    if (confirm('Are you sure you want to delete selected employees? This action cannot be undone.')) {
        alert('Bulk delete functionality will be implemented here');
    }
    closeBulkActions();
}

function toggleAdvancedSearch() {
    const panel = document.getElementById('advancedSearchPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function applyFilters() {
    // Apply search filters (placeholder)
    alert('Filter functionality will be implemented here');
}

function clearFilters() {
    // Clear all filters
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterDate').value = '';
    document.getElementById('searchEmployee').value = '';
}

function processBulkImport() {
    // Process bulk import (placeholder)
    const csvFile = document.getElementById('csvFile').files[0];
    const manualInput = document.getElementById('manualImport').value;
    
    if (!csvFile && !manualInput.trim()) {
        alert('Please provide either a CSV file or manual input');
        return;
    }
    
    alert('Bulk import functionality will be implemented here');
    closeBulkImport();
}

// Make all functions globally accessible
window.showBulkImportModal = showBulkImportModal;
window.closeBulkImport = closeBulkImport;
window.exportEmployees = exportEmployees;
window.showBulkActions = showBulkActions;
window.closeBulkActions = closeBulkActions;
window.bulkExportData = bulkExportData;
window.bulkDeleteEmployees = bulkDeleteEmployees;
window.toggleAdvancedSearch = toggleAdvancedSearch;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.processBulkImport = processBulkImport;

document.addEventListener('DOMContentLoaded', function() {
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    const searchInput = document.getElementById('searchEmployee');
    const refreshBtn = document.getElementById('refreshEmployees');
    const logoutBtn = document.getElementById('logoutBtn');

    // Load employees only if UI exists for rendering
    const hasLegacyList = !!document.getElementById('employeeList');
    const hasNewCards = !!document.getElementById('employeesCardsView');
    const hasNewTable = !!document.getElementById('employeesTableBody');
    const hasRenderHelpers = typeof window.renderEmployeeCards === 'function' || typeof window.renderEmployeeTable === 'function';
    if (hasLegacyList || hasNewCards || hasNewTable || hasRenderHelpers) {
        loadEmployees();
    } else {
        console.warn('Employees UI not found on this page. Skipping loadEmployees().');
    }

    // Event listeners (guarded)
    if (addEmployeeForm) addEmployeeForm.addEventListener('submit', handleAddEmployee);
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (refreshBtn) refreshBtn.addEventListener('click', loadEmployees);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Camera functionality
    const startCameraBtn = document.getElementById('startCamera');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const retakePhotoBtn = document.getElementById('retakePhoto');
    const camera = document.getElementById('camera');
    const photoCanvas = document.getElementById('photoCanvas');
    const photoPreview = document.getElementById('photoPreview');
    const capturedPhoto = document.getElementById('capturedPhoto');

    let stream = null;
    let capturedImageData = null;

    if (startCameraBtn) startCameraBtn.addEventListener('click', startCamera);
    if (capturePhotoBtn) capturePhotoBtn.addEventListener('click', capturePhoto);
    if (retakePhotoBtn) retakePhotoBtn.addEventListener('click', retakePhoto);

    // Handle adding new employee
    async function handleAddEmployee(e) {
        e.preventDefault();
        
        const formData = new FormData(addEmployeeForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            photo: capturedImageData || null
        };
        
        try {
            // Form validation
            if (!data.name || !data.name.trim()) {
                throw new Error('Employee name is required');
            }
            if (!data.email || !data.email.trim()) {
                throw new Error('Email is required');
            }
            if (!data.phone || !data.phone.trim()) {
                throw new Error('Phone number is required');
            }
            
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                throw new Error('Please enter a valid email address');
            }
            
            // Phone format validation (basic)
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(data.phone)) {
                throw new Error('Please enter a valid phone number');
            }
            
            // Show loading state
            const submitBtn = addEmployeeForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Adding...';
            submitBtn.disabled = true;
            
            // Send request to add employee
            const response = await fetch('/employee/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success
                alert('Employee added successfully!');
                addEmployeeForm.reset();
                
                // Reload employee list
                loadEmployees();
                
                // Show QR code if returned
                if (result.qr_code) {
                    showQRCode(result.qr_code, data.name, result.employee_id);
                }
                
            } else {
                throw new Error(result.error || 'Failed to add employee');
            }
            
        } catch (error) {
            console.error('Add employee error:', error);
            alert('Error: ' + error.message);
        } finally {
            // Reset button state
            const submitBtn = addEmployeeForm.querySelector('button[type="submit"]');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
    
    // Load employees from server
    async function loadEmployees() {
        try {
            const response = await fetch('/employee/list', { credentials: 'include' });
            
            if (response.ok) {
                const data = await response.json();
                displayEmployees(data.employees || []);
            } else if (response.status === 401) {
                // Not authenticated - redirect to login (normalize origin)
                const base = (window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'http://localhost:5000';
                window.location.href = base + '/signin.html';
                return;
            } else {
                throw new Error('Failed to load employees');
            }
            
        } catch (error) {
            console.error('Load employees error:', error);
            alert('Error loading employees: ' + error.message);
        }
    }
    
    // Display employees using whichever UI is available
    function displayEmployees(employees) {
        // Prefer the new employees.html helpers if present
        if (typeof window.renderEmployeeCards === 'function' || typeof window.renderEmployeeTable === 'function') {
            try { if (typeof window.renderEmployeeCards === 'function') window.renderEmployeeCards(employees); } catch (e) { console.error('renderEmployeeCards error:', e); }
            try { if (typeof window.renderEmployeeTable === 'function') window.renderEmployeeTable(employees); } catch (e) { console.error('renderEmployeeTable error:', e); }
            return;
        }

        // Legacy fallback: single container list
        const container = document.getElementById('employeeList');
        if (!container) {
            console.warn('No compatible employees container found. Skipping render.');
            return;
        }

        if (!employees || employees.length === 0) {
            container.innerHTML = '<p class="empty-state">No employees found</p>';
            return;
        }

        const html = `
            <table class="employee-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(employee => `
                        <tr>
                            <td>${employee.employee_id}</td>
                            <td>${employee.name}</td>
                            <td>${employee.email}</td>
                            <td>${employee.phone}</td>
                            <td>
                                <button class="btn btn-small" onclick="viewEmployee(${employee.employee_id})">View</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }
    
    // Handle search functionality
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        // TODO: Implement search filtering
        // This could filter the displayed employees or make a new API call
        console.log('Searching for:', searchTerm);
    }
    
    // Handle logout
    async function handleLogout() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                alert('Logged out successfully');
                const base = (window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'http://localhost:5000';
                window.location.href = base + '/signin.html';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error during logout: ' + error.message);
        }
    }
    
    // Show QR code modal
    function showQRCode(qrCodeData, employeeName, employeeId) {
        console.log('showQRCode called with:', {
            qrCodeData: qrCodeData ? qrCodeData.substring(0, 100) + '...' : 'null',
            employeeName,
            employeeId
        });
        
        if (!qrCodeData) {
            alert('Error: No QR code data received');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'qr-modal';
        modal.innerHTML = `
            <div class="qr-modal-content">
                <div class="modal-header">
                    <h3>📱 QR Code for ${employeeName}</h3>
                    <button class="modal-close" onclick="this.closest('.qr-modal').remove()">×</button>
                </div>
                <div class="qr-code-container">
                    <img src="${qrCodeData}" alt="QR Code" style="max-width: 300px;" onerror="console.error('Failed to load QR image')" onload="console.log('QR image loaded successfully')">
                </div>
                <p><strong>Employee ID:</strong> ${employeeId}</p>
                <p><strong>Name:</strong> ${employeeName}</p>
                <p><strong>QR Data Length:</strong> ${qrCodeData.length} characters</p>
                <div class="modal-buttons">
                    <button class="btn btn-primary" onclick="downloadQR('${qrCodeData}', '${employeeName}')">Download QR</button>
                    <button class="btn btn-outline" onclick="this.closest('.qr-modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        console.log('QR modal created and displayed');
    }
    
    // Camera functions
    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            camera.srcObject = stream;
            startCameraBtn.style.display = 'none';
            capturePhotoBtn.style.display = 'inline-block';
            photoPreview.style.display = 'none';
        } catch (error) {
            console.error('Camera error:', error);
            alert('Error accessing camera: ' + error.message);
        }
    }
    
    function capturePhoto() {
        if (!stream) return;
        
        const context = photoCanvas.getContext('2d');
        photoCanvas.width = camera.videoWidth;
        photoCanvas.height = camera.videoHeight;
        context.drawImage(camera, 0, 0);
        
        capturedImageData = photoCanvas.toDataURL('image/jpeg', 0.8);
        capturedPhoto.src = capturedImageData;
        
        photoPreview.style.display = 'block';
        capturePhotoBtn.style.display = 'none';
        retakePhotoBtn.style.display = 'inline-block';
        
        // Stop camera stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        camera.style.display = 'none';
    }
    
    function retakePhoto() {
        capturedImageData = null;
        photoPreview.style.display = 'none';
        retakePhotoBtn.style.display = 'none';
        startCameraBtn.style.display = 'inline-block';
        camera.style.display = 'block';
        startCamera();
    }
    
    // TODO: Add employee editing functionality
    // TODO: Add employee deletion (with confirmation)
    // TODO: Add bulk operations (import/export)
});
