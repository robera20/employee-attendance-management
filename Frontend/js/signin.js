document.addEventListener('DOMContentLoaded', function() {
    const signinForm = document.getElementById('signinForm');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    
    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.auth-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `auth-notification ${type}`;
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-circle' : 
                    'fas fa-info-circle';
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button class="close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    signinForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Prepare button state variables in outer scope so we can safely restore them in finally
        let submitBtn;
        let originalText = '';
        
        // Get form data
        const formData = new FormData(signinForm);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        try {
            // Form validation
            if (!data.username || !data.username.trim()) {
                throw new Error('Username is required');
            }
            if (!data.password || !data.password.trim()) {
                throw new Error('Password is required');
            }
            
            // Show loading state
            submitBtn = signinForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                originalText = submitBtn.textContent || '';
                submitBtn.textContent = 'Signing In...';
                submitBtn.disabled = true;
            }
            
            // Timeout + credentials
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            // Send signin request
            const response = await fetch('/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                signal: controller.signal,
                body: JSON.stringify(data)
            });
            clearTimeout(timeoutId);
            
            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Server returned invalid response. Check server console.');
            }
            
            if (response.ok) {
                // Success - redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // Error from server
                throw new Error(result.error || 'Sign in failed');
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                showNotification('Error: Request timed out. Please try again.', 'error');
            } else if (error.message === 'Failed to fetch') {
                showNotification('Error: Cannot reach server. Is it running?', 'error');
            } else {
                console.error('Signin error:', error);
                showNotification('Error: ' + error.message, 'error');
            }
        } finally {
            // Reset button state
            const btn = submitBtn || signinForm.querySelector('button[type="submit"]');
            if (btn) {
                btn.textContent = originalText || 'Sign In Securely';
                btn.disabled = false;
            }
        }
    });
    
    // Handle forgot password
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        showNotification('Forgot password functionality will be implemented. Please contact your administrator.', 'info');
    });
    
    // Check if user is already logged in
    async function checkAuthStatus() {
        try {
            const response = await fetch('/auth/check');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    window.location.href = 'dashboard.html';
                }
            }
        } catch (error) {
            console.log('Not authenticated');
        }
    }
    checkAuthStatus();
});
