// Advanced Dashboard with Real-time Analytics
class AdvancedDashboard {
    constructor() {
        this.charts = {};
        this.refreshInterval = null;
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        console.log('🚀 Initializing Advanced Dashboard...');
        this.setupEventListeners();
        this.testAPIEndpoints(); // Test API endpoints first
        this.loadDashboardData();
        this.startRealTimeUpdates();
        this.initializeCharts();
    }
    
    // Test API endpoints to identify connection issues
    async testAPIEndpoints() {
        try {
            console.log('🧪 Testing API endpoints...');
            
            // Test summary endpoint
            const summaryResponse = await fetch('/dashboard/summary');
            console.log('📡 Summary endpoint test:', summaryResponse.status);
            
            // Test employee status endpoint
            const statusResponse = await fetch('/dashboard/employee-status');
            console.log('📡 Employee status endpoint test:', statusResponse.status);
            
            console.log('✅ API endpoints test complete');
            
        } catch (error) {
            console.error('❌ API endpoints test failed:', error);
            this.showError('Dashboard API test failed - check server connection');
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up dashboard event listeners...');
        
        // Chart period selector
        const chartPeriod = document.getElementById('chartPeriod');
        if (chartPeriod) {
            chartPeriod.addEventListener('change', (e) => {
                console.log('📊 Chart period changed to:', e.target.value);
                this.updateAttendanceChart(parseInt(e.target.value));
            });
            console.log('✅ Chart period listener added');
        } else {
            console.warn('⚠️ Chart period selector not found');
        }

        // Refresh buttons
        const refreshStatusBtn = document.getElementById('refreshStatus');
        if (refreshStatusBtn) {
            refreshStatusBtn.addEventListener('click', () => {
                console.log('🔄 Refresh status button clicked');
                this.refreshEmployeeStatus();
            });
            console.log('✅ Refresh status listener added');
        } else {
            console.warn('⚠️ Refresh status button not found');
        }
        
        // Add refresh button for all data
        const refreshAllBtn = document.getElementById('refreshAll');
        if (refreshAllBtn) {
            refreshAllBtn.addEventListener('click', () => {
                console.log('🔄 Refresh all button clicked');
                this.refreshAllData();
            });
            console.log('✅ Refresh all listener added');
        } else {
            console.warn('⚠️ Refresh all button not found');
        }

        // Search functionality
        const statusSearch = document.getElementById('statusSearch');
        if (statusSearch) {
            statusSearch.addEventListener('input', (e) => {
                console.log('🔍 Search input:', e.target.value);
                this.filterEmployeeStatus(e.target.value);
            });
            console.log('✅ Search listener added');
        } else {
            console.warn('⚠️ Status search input not found');
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
            console.log('✅ Logout listener added');
        } else {
            console.warn('⚠️ Logout button not found');
        }

        // Settings modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });
        
        // Add keyboard shortcut for refresh (Ctrl+R)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                console.log('⌨️ Ctrl+R pressed, refreshing dashboard...');
                this.refreshAllData();
            }
        });
        
        // Listen for attendance marking events from scanner
        window.addEventListener('attendanceMarked', (e) => {
            console.log('🔄 Attendance marked event received, refreshing dashboard...');
            this.showAutoRefreshNotification();
            this.refreshEmployeeStatus();
        });
        
        // Listen for page visibility changes (when user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔄 Page became visible, refreshing dashboard...');
                this.refreshEmployeeStatus();
            }
        });
        
        console.log('✅ Dashboard event listeners setup complete');
    }

    async loadDashboardData() {
        try {
            // Load summary data
            await this.loadSummaryStats();
            
            // Load employee status
            await this.loadEmployeeStatus();
            
            // Load recent activity
            await this.loadRecentActivity();
            
            // Update charts
            this.updateAttendanceChart(7);
            this.updateDepartmentChart();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async loadSummaryStats() {
        try {
            console.log('🔄 Loading summary stats...');
            const response = await fetch('/dashboard/summary');
            console.log('📡 Summary response:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Summary HTTP error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('📊 Summary data received:', data);
            
            if (!data.totalEmployees) {
                console.error('❌ Invalid summary data format:', data);
                throw new Error('Invalid summary data format');
            }
            
            this.updateStatCard('totalEmployees', data.totalEmployees, data.employeeGrowth);
            this.updateStatCard('presentToday', data.presentToday, data.presentRate);
            this.updateStatCard('lateToday', data.lateToday, data.lateRate);
            this.updateStatCard('absentToday', data.absentToday, data.absentRate);
            console.log('✅ Summary stats loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading summary stats:', error);
            this.showError(`Failed to load summary stats: ${error.message}`);
        }
    }

    async loadEmployeeStatus() {
        try {
            console.log('🔄 Loading employee status...');
            const response = await fetch('/dashboard/employee-status');
            console.log('📡 Employee status response:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Employee status HTTP error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('📊 Employee status data received:', data);
            
            if (!data.employees) {
                console.error('❌ No employees array in response:', data);
                throw new Error('Invalid response format - missing employees array');
            }
            
            this.displayEmployeeStatus(data.employees);
            
            // Update last updated timestamp
            this.updateLastUpdatedTimestamp();
            
            console.log('✅ Employee status loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading employee status:', error);
            this.showError(`Failed to load employee status: ${error.message}`);
        }
    }
    
    // Update the last updated timestamp
    updateLastUpdatedTimestamp() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            lastUpdatedElement.textContent = `Last updated: ${timeString}`;
        }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/dashboard/recent-activity');
            if (!response.ok) throw new Error('Failed to fetch recent activity');
            
            const data = await response.json();
            this.displayRecentActivity(data.activities);
            
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    updateStatCard(elementId, value, trend) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Animate the number change
        const currentValue = parseInt(element.textContent) || 0;
        this.animateNumber(element, currentValue, value);

        // Update trend indicator
        const trendElement = document.getElementById(elementId.replace('Today', 'Rate').replace('Employees', 'Growth'));
        if (trendElement) {
            trendElement.textContent = `${trend}%`;
            
            // Update trend color
            const trendContainer = trendElement.closest('.stat-trend');
            if (trendContainer) {
                trendContainer.className = `stat-trend ${trend >= 0 ? 'positive' : 'negative'}`;
            }
        }
    }

    animateNumber(element, start, end) {
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    displayEmployeeStatus(employees) {
        const container = document.getElementById('statusTable');
        if (!container) return;

        if (!employees || employees.length === 0) {
            container.innerHTML = '<div class="empty-state">No employees found</div>';
            return;
        }

        const html = `
            <table class="status-table-content">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => `
                        <tr class="status-row ${emp.status.toLowerCase()}">
                            <td>
                                <div class="employee-info">
                                    <div class="employee-avatar">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div class="employee-details">
                                        <strong>${emp.name}</strong>
                                        <small>${emp.email}</small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${emp.status.toLowerCase()}">
                                    <i class="fas fa-${this.getStatusIcon(emp.status)}"></i>
                                    ${emp.status}
                                </span>
                            </td>
                            <td>
                                ${emp.timestamp ? new Date(emp.timestamp).toLocaleTimeString() : 'Not marked'}
                            </td>
                            <td>
                                <button class="btn btn-small" onclick="viewEmployee(${emp.employee_id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-small btn-secondary" onclick="generateQR(${emp.employee_id})">
                                    <i class="fas fa-qrcode"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    displayRecentActivity(activities) {
        const container = document.getElementById('activityList');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }

        const html = activities.map(activity => `
            <div class="activity-item ${activity.type}">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${this.formatTimeAgo(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    getStatusIcon(status) {
        const icons = {
            'Present': 'check-circle',
            'Late': 'clock',
            'Absent': 'times-circle'
        };
        return icons[status] || 'question-circle';
    }

    getActivityIcon(type) {
        const icons = {
            'attendance': 'qrcode',
            'employee': 'user-plus',
            'system': 'cog',
            'report': 'chart-bar'
        };
        return icons[type] || 'info-circle';
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    filterEmployeeStatus(searchTerm) {
        const rows = document.querySelectorAll('.status-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const name = row.querySelector('.employee-details strong').textContent.toLowerCase();
            const email = row.querySelector('.employee-details small').textContent.toLowerCase();
            
            if (name.includes(term) || email.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    initializeCharts() {
        // Attendance Chart
        const attendanceCtx = document.getElementById('attendanceChart');
        if (attendanceCtx) {
            this.charts.attendance = new Chart(attendanceCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Present',
                        data: [],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Late',
                        data: [],
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Absent',
                        data: [],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Department Chart
        const departmentCtx = document.getElementById('departmentChart');
        if (departmentCtx) {
            this.charts.department = new Chart(departmentCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Present', 'Late', 'Absent'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    }
                }
            });
        }
    }

    async updateAttendanceChart(days) {
        try {
            const response = await fetch(`/dashboard/attendance-trend?days=${days}`);
            if (!response.ok) throw new Error('Failed to fetch attendance trend');
            
            const data = await response.json();
            
            if (this.charts.attendance) {
                this.charts.attendance.data.labels = data.labels;
                this.charts.attendance.data.datasets[0].data = data.present;
                this.charts.attendance.data.datasets[1].data = data.late;
                this.charts.attendance.data.datasets[2].data = data.absent;
                this.charts.attendance.update();
            }
            
        } catch (error) {
            console.error('Error updating attendance chart:', error);
        }
    }

    async updateDepartmentChart() {
        try {
            const response = await fetch('/dashboard/department-performance');
            if (!response.ok) throw new Error('Failed to fetch department performance');
            
            const data = await response.json();
            
            if (this.charts.department) {
                this.charts.department.data.datasets[0].data = [data.present, data.late, data.absent];
                this.charts.department.update();
            }
            
        } catch (error) {
            console.error('Error updating department chart:', error);
        }
    }

    startRealTimeUpdates() {
        // Update every 10 seconds for more responsive updates
        this.refreshInterval = setInterval(() => {
            this.loadSummaryStats();
            this.loadEmployeeStatus();
            this.loadRecentActivity();
        }, 10000); // Changed from 30000 to 10000 (10 seconds)
        
        console.log('🔄 Real-time updates started (every 10 seconds)');
    }
    
    // Function to immediately refresh employee status
    async refreshEmployeeStatus() {
        try {
            console.log('🔄 Manually refreshing employee status...');
            
            // Show loading state
            const refreshBtn = document.getElementById('refreshStatus');
            if (refreshBtn) {
                const originalText = refreshBtn.innerHTML;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                refreshBtn.disabled = true;
                console.log('✅ Refresh button loading state set');
            } else {
                console.warn('⚠️ Refresh status button not found');
            }
            
            console.log('📊 Loading employee status...');
            await this.loadEmployeeStatus();
            
            console.log('📊 Loading summary stats...');
            await this.loadSummaryStats();
            
            this.showSuccess('Employee status refreshed');
            console.log('✅ Employee status refresh completed successfully');
            
            // Restore button state
            if (refreshBtn) {
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
                console.log('✅ Refresh button restored');
            }
            
        } catch (error) {
            console.error('❌ Error refreshing employee status:', error);
            this.showError('Failed to refresh employee status');
            
            // Restore button state on error
            const refreshBtn = document.getElementById('refreshStatus');
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshBtn.disabled = false;
                console.log('✅ Refresh button restored after error');
            }
        }
    }
    
    // Function to refresh all dashboard data
    async refreshAllData() {
        try {
            console.log('🔄 Refreshing all dashboard data...');
            
            // Show loading state
            const refreshAllBtn = document.getElementById('refreshAll');
            if (refreshAllBtn) {
                const originalText = refreshAllBtn.innerHTML;
                refreshAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                refreshAllBtn.disabled = true;
                console.log('✅ Refresh all button loading state set');
            } else {
                console.warn('⚠️ Refresh all button not found');
            }
            
            console.log('📊 Loading dashboard data...');
            await this.loadDashboardData();
            
            this.showSuccess('Dashboard refreshed');
            console.log('✅ Dashboard refresh completed successfully');
            
            // Restore button state
            if (refreshAllBtn) {
                refreshAllBtn.innerHTML = originalText;
                refreshAllBtn.disabled = false;
                console.log('✅ Refresh all button restored');
            }
            
        } catch (error) {
            console.error('❌ Error refreshing dashboard:', error);
            this.showError('Failed to refresh dashboard');
            
            // Restore button state on error
            const refreshAllBtn = document.getElementById('refreshAll');
            if (refreshAllBtn) {
                refreshAllBtn.innerHTML = originalText;
                refreshAllBtn.disabled = false;
                console.log('✅ Refresh all button restored after error');
            }
        }
    }

    stopRealTimeUpdates() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    loadSettings() {
        const defaultSettings = {
            lateThreshold: 15,
            absentThreshold: 2,
            emailAlerts: true,
            realtimeUpdates: true
        };

        try {
            const saved = localStorage.getItem('dashboardSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            const settings = {
                lateThreshold: parseInt(document.getElementById('lateThreshold').value),
                absentThreshold: parseInt(document.getElementById('absentThreshold').value),
                emailAlerts: document.getElementById('emailAlerts').checked,
                realtimeUpdates: document.getElementById('realtimeUpdates').checked
            };

            localStorage.setItem('dashboardSettings', JSON.stringify(settings));
            this.settings = settings;
            
            // Apply settings
            if (settings.realtimeUpdates) {
                this.startRealTimeUpdates();
            } else {
                this.stopRealTimeUpdates();
            }

            this.showSuccess('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Load current settings into form
            document.getElementById('lateThreshold').value = this.settings.lateThreshold;
            document.getElementById('absentThreshold').value = this.settings.absentThreshold;
            document.getElementById('emailAlerts').checked = this.settings.emailAlerts;
            document.getElementById('realtimeUpdates').checked = this.settings.realtimeUpdates;
            
            modal.style.display = 'block';
        }
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showSuccess(message) {
        console.log('✅ Success notification:', message);
        this.showNotification(message, 'success');
    }

    showError(message) {
        console.error('❌ Error notification:', message);
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        console.log(`📢 Showing ${type} notification:`, message);
        
        try {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            `;

            document.body.appendChild(notification);
            console.log('✅ Notification added to DOM');

            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                    console.log('✅ Notification removed');
                }
            }, 3000);
        } catch (error) {
            console.error('❌ Error showing notification:', error);
            // Fallback to alert
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    async handleLogout() {
        try {
            const response = await fetch('/auth/logout', { method: 'POST' });
            if (response.ok) {
                this.stopRealTimeUpdates();
                window.location.href = '/signin.html';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('Logout failed');
        }
    }

    destroy() {
        this.stopRealTimeUpdates();
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
    }

    // Show notification for auto-refresh
    showAutoRefreshNotification() {
        const notification = document.createElement('div');
        notification.className = 'notification info auto-refresh';
        notification.innerHTML = `
            <i class="fas fa-sync-alt"></i>
            <span>Dashboard auto-refreshing...</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Global functions for employee actions
function viewEmployee(id) {
    window.location.href = `employees.html?view=${id}`;
}

function generateQR(id) {
    window.location.href = `employees.html?qr=${id}`;
}

function regenerateAllQRCodes() {
    if (confirm('This will regenerate all QR codes with the new improved format. Continue?')) {
        window.location.href = 'employees.html?regenerate=all';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing dashboard...');
    window.dashboard = new AdvancedDashboard();
    
    // Test refresh functionality after a delay
    setTimeout(() => {
        console.log('🧪 Testing refresh functionality...');
        if (window.dashboard) {
            console.log('✅ Dashboard instance found, testing refresh...');
            // Test if refresh buttons exist
            const refreshAllBtn = document.getElementById('refreshAll');
            const refreshStatusBtn = document.getElementById('refreshStatus');
            
            if (refreshAllBtn) {
                console.log('✅ Refresh All button found:', refreshAllBtn);
            } else {
                console.warn('⚠️ Refresh All button not found');
            }
            
            if (refreshStatusBtn) {
                console.log('✅ Refresh Status button found:', refreshStatusBtn);
            } else {
                console.warn('⚠️ Refresh Status button not found');
            }
        } else {
            console.error('❌ Dashboard instance not found');
        }
    }, 3000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});
