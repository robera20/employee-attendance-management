document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    
    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.auth-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element with inline styles so it's always visible
        const notification = document.createElement('div');
        notification.className = `auth-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 0.875rem 1rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-circle' : 
                    'fas fa-info-circle';
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button class="close" style="background:none;border:none;color:white;margin-left:8px;cursor:pointer" onclick="this.parentElement.remove()">
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
    
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        let submitBtn;
        let originalText = '';
        
        // Get form data
        const formData = new FormData(signupForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            organization: formData.get('organization'),
            username: formData.get('username'),
            password: formData.get('password'),
            security_question: formData.get('security_question'),
            security_answer: formData.get('security_answer')
        };
        
        try {
            // Form validation
            if (!data.name || !data.name.trim()) {
                throw new Error('Name is required');
            }
            if (!data.email || !data.email.trim()) {
                throw new Error('Email is required');
            }
            if (!data.username || !data.username.trim()) {
                throw new Error('Username is required');
            }
            if (!data.password || data.password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            if (!data.security_question || !data.security_question.trim()) {
                throw new Error('Security question is required');
            }
            if (!data.security_answer || !data.security_answer.trim()) {
                throw new Error('Security answer is required');
            }
            
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                throw new Error('Please enter a valid email address');
            }
            
            // Show loading state
            submitBtn = signupForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                originalText = submitBtn.textContent || '';
                submitBtn.textContent = 'Creating Account...';
                submitBtn.disabled = true;
            }
            
            // Timeout + credentials
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            
            // Send signup request
            const response = await fetch('/auth/signup', {
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
                // Success - show message and redirect
                showNotification('Account created successfully! Please sign in.', 'success');
                setTimeout(() => {
                    window.location.href = 'signin.html';
                }, 2000);
            } else {
                // Error from server
                throw new Error(result.error || 'Signup failed');
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            
            // Handle different types of errors
            if (error.name === 'AbortError') {
                showNotification('Error: Request timed out. Please try again.', 'error');
            } else if (error.message === 'Failed to fetch') {
                showNotification('Error: Cannot connect to server. Please check if the server is running.', 'error');
            } else if (error.message.includes('Unexpected end of JSON input')) {
                showNotification('Error: Server returned invalid response. Please check server console for errors.', 'error');
            } else {
                showNotification('Error: ' + error.message, 'error');
            }
        } finally {
            // Reset button state
            const btn = submitBtn || signupForm.querySelector('button[type="submit"]');
            if (btn) {
                btn.textContent = originalText || 'Create Account';
                btn.disabled = false;
            }
        }
    });
    
    // TODO: Add real-time validation
    // Example: Check if username is available
    // document.getElementById('username').addEventListener('blur', async function() {
    //     const username = this.value;
    //     if (username.length > 2) {
    //         // Check username availability
    //     }
    // });
});
