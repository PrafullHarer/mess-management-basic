// js/auth.js
/*
  Simple Client-Side Authentication
  Provides a basic login screen overlay to restrict access.
  Credentials: sagarmess / sagarmess123
*/

const AUTH_KEY = 'mess_manager_auth_token';
// btoa('sagarmess:sagarmess123')
const VALID_HASH = 'c2FnYXJtZXNzOnNhZ2FybWVzczEyMw=='; 

function checkAuth() {
    const token = localStorage.getItem(AUTH_KEY);
    const authScreen = document.getElementById('authScreen');
    if (token === 'valid_session') {
        if (authScreen) authScreen.style.display = 'none';
    } else {
        if (authScreen) authScreen.style.display = 'flex';
    }
}

function submitAuth() {
    const u = document.getElementById('authUser').value.trim();
    const p = document.getElementById('authPass').value.trim();
    const hash = btoa(u + ':' + p);
    
    if (hash === VALID_HASH) {
        localStorage.setItem(AUTH_KEY, 'valid_session');
        document.getElementById('authScreen').style.display = 'none';
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
    openConfirmModal('Are you sure you want to log out?', () => {
        localStorage.removeItem(AUTH_KEY);
        window.location.reload();
    });
}

// Run immediately on script load to prevent flashing
checkAuth();
