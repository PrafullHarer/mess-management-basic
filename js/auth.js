// js/auth.js
/*
  Client-Side Authentication
  Loads credentials and branding from credentials.js
*/

const AUTH_KEY = 'mess_manager_auth_token';

function getExpectedHash() {
    const creds = window.APP_CREDENTIALS || {};
    const u = (creds.adminUser || 'admin').trim();
    const p = (creds.adminPass || 'admin123').trim();
    return btoa(u + ':' + p);
}

function updateAppBranding() {
    const creds = window.APP_CREDENTIALS || {};
    const name = creds.messName || 'Mess Manager';

    const authTitle = document.getElementById('authScreenTitle');
    if (authTitle) authTitle.textContent = name;

    const headerTitle = document.getElementById('headerAppName');
    if (headerTitle) headerTitle.textContent = name;

    document.title = name;
}

function checkAuth() {
    updateAppBranding();
    const token = localStorage.getItem(AUTH_KEY);
    const authScreen = document.getElementById('authScreen');
    const validToken = 'valid_' + getExpectedHash();

    if (token === validToken || token === 'valid_session') {
        if (authScreen) authScreen.style.display = 'none';
    } else {
        if (authScreen) authScreen.style.display = 'flex';
    }
}

function submitAuth() {
    const u = document.getElementById('authUser').value.trim();
    const p = document.getElementById('authPass').value.trim();
    const hash = btoa(u + ':' + p);
    const expectedHash = getExpectedHash();

    if (hash === expectedHash) {
        localStorage.setItem(AUTH_KEY, 'valid_' + expectedHash);
        const authScreen = document.getElementById('authScreen');
        if (authScreen) authScreen.style.display = 'none';
        showToast('Login successful', 'success');
        window.location.reload();
    } else {
        showToast('Invalid Username or Password', 'error');
    }
}

function handleAuthKeypress(e) {
    if (e.key === 'Enter') {
        submitAuth();
    }
}

function logout() {
    const doLogout = () => {
        localStorage.removeItem(AUTH_KEY);
        window.location.reload();
    };

    if (typeof openConfirmModal === 'function') {
        openConfirmModal('Are you sure you want to log out?', doLogout);
    } else if (window.confirm('Are you sure you want to log out?')) {
        doLogout();
    }
}

// Ensure branding is updated once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAppBranding);
} else {
    updateAppBranding();
}

// Run immediately on script load to prevent flashing
checkAuth();
