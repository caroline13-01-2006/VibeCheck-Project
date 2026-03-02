// ═══════════════════════════════════════════════
//   VibeSocial — Auth JS
// ═══════════════════════════════════════════════

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.form-wrapper').forEach(f => f.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
        showError(errorEl, 'Please fill in all fields');
        return;
    }

    const btn = document.querySelector('#login-form .btn-primary');
    btn.innerHTML = '<span>Signing in...</span>';
    btn.disabled = true;

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            btn.innerHTML = '<span>✓ Success!</span>';
            setTimeout(() => window.location.href = data.redirect, 400);
        } else {
            showError(errorEl, data.message);
            btn.innerHTML = '<span>Sign In</span><span class="btn-icon">→</span>';
            btn.disabled = false;
        }
    } catch (e) {
        showError(errorEl, 'Connection error. Please try again.');
        btn.innerHTML = '<span>Sign In</span><span class="btn-icon">→</span>';
        btn.disabled = false;
    }
}

async function handleRegister() {
    const display_name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('register-error');

    if (!username || !email || !password) {
        showError(errorEl, 'Please fill in all required fields');
        return;
    }
    if (password.length < 6) {
        showError(errorEl, 'Password must be at least 6 characters');
        return;
    }

    const btn = document.querySelector('#register-form .btn-primary');
    btn.innerHTML = '<span>Creating account...</span>';
    btn.disabled = true;

    try {
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name, username, email, password })
        });
        const data = await res.json();
        if (data.success) {
            btn.innerHTML = '<span>✓ Welcome!</span>';
            setTimeout(() => window.location.href = data.redirect, 400);
        } else {
            showError(errorEl, data.message);
            btn.innerHTML = '<span>Create Account</span><span class="btn-icon">✦</span>';
            btn.disabled = false;
        }
    } catch (e) {
        showError(errorEl, 'Connection error. Please try again.');
        btn.innerHTML = '<span>Create Account</span><span class="btn-icon">✦</span>';
        btn.disabled = false;
    }
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4000);
}

// Enter key support
document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
});
document.getElementById('reg-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
});
