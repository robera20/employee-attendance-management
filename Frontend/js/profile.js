document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const logoutBtn = document.getElementById('logoutBtn');

    function notify(message, type = 'info') {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }

    async function fetchProfile() {
        try {
            const res = await fetch('/auth/profile', { credentials: 'same-origin' });
            if (!res.ok) {
                if (res.status === 401) {
                    window.location.href = 'signin.html';
                    return;
                }
                throw new Error('Failed to load profile');
            }
            const data = await res.json();
            const a = data.admin;
            document.getElementById('name').value = a.name || '';
            document.getElementById('email').value = a.email || '';
            document.getElementById('phone').value = a.phone || '';
            document.getElementById('organization').value = a.organization || '';
            document.getElementById('username').value = a.username || '';
        } catch (e) {
            notify(e.message, 'error');
        }
    }

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(profileForm);
        const payload = {
            name: form.get('name'),
            email: form.get('email'),
            phone: form.get('phone'),
            organization: form.get('organization'),
            username: form.get('username')
        };
        try {
            const controller = new AbortController();
            const t = setTimeout(()=>controller.abort(), 12000);
            const res = await fetch('/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                signal: controller.signal,
                body: JSON.stringify(payload)
            });
            clearTimeout(t);
            const data = await res.json().catch(()=>({}));
            if (!res.ok) throw new Error(data.error || 'Update failed');
            notify('Profile updated', 'success');
        } catch (e) {
            if (e.name === 'AbortError') return notify('Request timed out', 'error');
            notify(e.message, 'error');
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(passwordForm);
        const payload = {
            current_password: form.get('current_password'),
            new_password: form.get('new_password')
        };
        try {
            if (!payload.current_password || !payload.new_password) throw new Error('Fill both password fields');
            const controller = new AbortController();
            const t = setTimeout(()=>controller.abort(), 12000);
            const res = await fetch('/auth/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                signal: controller.signal,
                body: JSON.stringify(payload)
            });
            clearTimeout(t);
            const data = await res.json().catch(()=>({}));
            if (!res.ok) throw new Error(data.error || 'Password update failed');
            passwordForm.reset();
            notify('Password updated', 'success');
        } catch (e) {
            if (e.name === 'AbortError') return notify('Request timed out', 'error');
            notify(e.message, 'error');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
            if (res.ok) window.location.href = 'signin.html';
        } catch {}
    });

    fetchProfile();
});


