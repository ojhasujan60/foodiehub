import { setToken, setUser, showNotification, isAuthenticated } from './global.js';

// Redirect if already logged in
if (isAuthenticated()) {
  window.location.href = '/customer/index.html';
}

// DOM Elements
const loginCard = document.getElementById('login-card');
const registerCard = document.getElementById('register-card');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotModal = document.getElementById('forgot-modal');
const closeForgotModal = document.querySelector('.modal-close-forgot');
const forgotForm = document.getElementById('forgot-form');

// Login Type Toggle
const loginTypeBtns = document.querySelectorAll('.login-type-btn');
const loginIdentifier = document.getElementById('login-identifier');
const loginLabel = document.getElementById('login-label');
let currentLoginType = 'email';

// Toggle between login types
loginTypeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    loginTypeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLoginType = btn.dataset.type;
    
    if (currentLoginType === 'email') {
      loginLabel.innerHTML = '<i class="fas fa-envelope"></i> Email Address';
      loginIdentifier.placeholder = 'Enter your email';
      loginIdentifier.type = 'email';
    } else {
      loginLabel.innerHTML = '<i class="fas fa-phone"></i> Phone Number';
      loginIdentifier.placeholder = 'Enter your phone number';
      loginIdentifier.type = 'tel';
    }
  });
});

// Password fields
const regPassword = document.getElementById('reg-password');
const regConfirm = document.getElementById('reg-confirm');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');
const registerBtn = document.getElementById('register-btn');
const confirmMatchSpan = document.getElementById('confirm-match');

// Password requirements elements
const reqLength = document.getElementById('req-length');
const reqUpper = document.getElementById('req-upper');
const reqLower = document.getElementById('req-lower');
const reqNumber = document.getElementById('req-number');
const reqSpecial = document.getElementById('req-special');

// Toggle between login and register
if (showRegisterLink) {
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginCard.style.display = 'none';
    registerCard.style.display = 'block';
  });
}

if (showLoginLink) {
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerCard.style.display = 'none';
    loginCard.style.display = 'block';
  });
}

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    const icon = btn.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});

// Password strength checker
function checkPasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  return strength;
}

function updateStrengthMeter(password) {
  const strength = checkPasswordStrength(password);
  const strengthMap = {
    0: { text: 'Very Weak', color: '#f44336', width: '20%' },
    1: { text: 'Weak', color: '#ff9800', width: '40%' },
    2: { text: 'Fair', color: '#ffeb3b', width: '60%' },
    3: { text: 'Good', color: '#4caf50', width: '80%' },
    4: { text: 'Strong', color: '#4caf50', width: '100%' },
    5: { text: 'Very Strong', color: '#2e7d32', width: '100%' }
  };
  
  const level = strengthMap[strength] || strengthMap[0];
  strengthBar.style.width = level.width;
  strengthBar.style.background = level.color;
  strengthText.textContent = level.text;
  strengthText.style.color = level.color;
}

function updateRequirements(password) {
  // Length check
  if (password.length >= 8) {
    reqLength.classList.add('valid');
    reqLength.querySelector('i').className = 'fas fa-check-circle';
  } else {
    reqLength.classList.remove('valid');
    reqLength.querySelector('i').className = 'fas fa-circle';
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    reqUpper.classList.add('valid');
    reqUpper.querySelector('i').className = 'fas fa-check-circle';
  } else {
    reqUpper.classList.remove('valid');
    reqUpper.querySelector('i').className = 'fas fa-circle';
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    reqLower.classList.add('valid');
    reqLower.querySelector('i').className = 'fas fa-check-circle';
  } else {
    reqLower.classList.remove('valid');
    reqLower.querySelector('i').className = 'fas fa-circle';
  }
  
  // Number check
  if (/[0-9]/.test(password)) {
    reqNumber.classList.add('valid');
    reqNumber.querySelector('i').className = 'fas fa-check-circle';
  } else {
    reqNumber.classList.remove('valid');
    reqNumber.querySelector('i').className = 'fas fa-circle';
  }
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    reqSpecial.classList.add('valid');
    reqSpecial.querySelector('i').className = 'fas fa-check-circle';
  } else {
    reqSpecial.classList.remove('valid');
    reqSpecial.querySelector('i').className = 'fas fa-circle';
  }
}

function isPasswordValid(password) {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

function updateRegisterButton() {
  const password = regPassword.value;
  const confirm = regConfirm.value;
  const termsChecked = document.getElementById('terms-checkbox')?.checked;
  
  const passwordValid = isPasswordValid(password);
  const passwordsMatch = password === confirm && password !== '';
  
  if (passwordValid && passwordsMatch && termsChecked) {
    registerBtn.disabled = false;
  } else {
    registerBtn.disabled = true;
  }
}

// Password input event
if (regPassword) {
  regPassword.addEventListener('input', () => {
    const password = regPassword.value;
    updateStrengthMeter(password);
    updateRequirements(password);
    updateRegisterButton();
  });
}

// Confirm password input event
if (regConfirm) {
  regConfirm.addEventListener('input', () => {
    const password = regPassword.value;
    const confirm = regConfirm.value;
    
    if (confirm === '') {
      confirmMatchSpan.textContent = '';
      confirmMatchSpan.className = 'confirm-status';
    } else if (password === confirm) {
      confirmMatchSpan.textContent = '✓ Passwords match';
      confirmMatchSpan.className = 'confirm-status success';
    } else {
      confirmMatchSpan.textContent = '✗ Passwords do not match';
      confirmMatchSpan.className = 'confirm-status error';
    }
    updateRegisterButton();
  });
}

// Terms checkbox event
const termsCheckbox = document.getElementById('terms-checkbox');
if (termsCheckbox) {
  termsCheckbox.addEventListener('change', updateRegisterButton);
}

// Login form submission - auto-detects email or phone
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identifier = loginIdentifier.value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me')?.checked;
    
    if (!identifier) {
      showNotification('Please enter email or phone number', 'error');
      return;
    }
    
    // Auto-detect if input is email or phone
    const isEmail = identifier.includes('@') && identifier.includes('.');
    const loginData = isEmail ? { email: identifier } : { phone: identifier };
    loginData.password = password;
    
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      
      setToken(data.token);
      setUser(data);
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      showNotification('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/customer/index.html';
      }, 1000);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
}

// Register form submission
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = regPassword.value;
    const confirm = regConfirm.value;
    
    if (!isPasswordValid(password)) {
      showNotification('Please meet all password requirements', 'error');
      return;
    }
    
    if (password !== confirm) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');
      
      setToken(data.token);
      setUser(data);
      
      showNotification('Registration successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/customer/index.html';
      }, 1000);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
}

// Forgot Password Modal
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotModal.classList.add('active');
  });
}

if (closeForgotModal) {
  closeForgotModal.addEventListener('click', () => {
    forgotModal.classList.remove('active');
  });
}

window.addEventListener('click', (e) => {
  if (e.target === forgotModal) {
    forgotModal.classList.remove('active');
  }
});

if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('forgot-identifier').value;
    
    if (!identifier) {
      showNotification('Please enter your email or phone number', 'error');
      return;
    }
    
    // Determine if input is email or phone
    const isEmail = identifier.includes('@') && identifier.includes('.');
    const requestData = isEmail ? { email: identifier } : { phone: identifier };
    
    try {
      const response = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Request failed');
      
      showNotification('Password reset link sent to your ' + (isEmail ? 'email' : 'phone') + '!', 'success');
      forgotModal.classList.remove('active');
      forgotForm.reset();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
}