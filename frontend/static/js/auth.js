// Authentication System for OpenChat 2.0
// Combined auth logic from auth.js and auth-ui.js

// Account Manager Class - handles persistent storage
class AccountManager {
    constructor() {
        this.accountsDir = null;
        this.currentUser = null;
        this.isLoggedIn = false;
    }

    async initialize() {
        // Try to restore login state
        const savedState = localStorage.getItem('openchat_login_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.isLoggedIn = state.isLoggedIn;
            this.currentUser = state.currentUser;
            
            // Try to restore directory handle
            const savedDirHandle = localStorage.getItem('openchat_accounts_dir');
            if (savedDirHandle) {
                try {
                    this.accountsDir = await window.showDirectoryPicker();
                } catch (error) {
                    console.log('Could not restore directory handle');
                }
            }
        }
        return this.isLoggedIn;
    }

    async selectAccountsDirectory() {
        try {
            this.accountsDir = await window.showDirectoryPicker();
            localStorage.setItem('openchat_accounts_dir', 'selected');
            return true;
        } catch (error) {
            console.error('Directory selection failed:', error);
            return false;
        }
    }

    async createAccount(userData) {
        if (!this.accountsDir) {
            const selected = await this.selectAccountsDirectory();
            if (!selected) {
                return { success: false, message: 'Please select a directory to store accounts' };
            }
        }

        try {
            // Create account folder
            const folderName = this.sanitizeEmail(userData.email);
            const accountDir = await this.accountsDir.getDirectoryHandle(folderName, { create: true });

            // Hash password
            const hashedPassword = await this.hashPassword(userData.password);

            // Prepare account data
            const accountData = {
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                avatar: userData.avatar,
                plan: userData.plan,
                createdAt: userData.createdAt
            };

            // Save account.json
            const accountFile = await accountDir.getFileHandle('account.json', { create: true });
            const writable = await accountFile.createWritable();
            await writable.write(JSON.stringify(accountData, null, 2));
            await writable.close();

            // Save avatar image if provided
            if (userData.avatarImage) {
                await this.saveAvatarImage(accountDir, userData.avatarImage);
            }

            return { success: true, message: 'Account created successfully' };
        } catch (error) {
            console.error('Account creation failed:', error);
            return { success: false, message: 'Failed to create account: ' + error.message };
        }
    }

    async login(email, password) {
        if (!this.accountsDir) {
            const selected = await this.selectAccountsDirectory();
            if (!selected) {
                return { success: false, message: 'Please select accounts directory' };
            }
        }

        try {
            const folderName = this.sanitizeEmail(email);
            const accountDir = await this.accountsDir.getDirectoryHandle(folderName);
            const accountFile = await accountDir.getFileHandle('account.json');
            const file = await accountFile.getFile();
            const accountData = JSON.parse(await file.text());

            // Verify password
            const hashedPassword = await this.hashPassword(password);
            if (accountData.password !== hashedPassword) {
                return { success: false, message: 'Invalid email or password' };
            }

            // Load avatar image if exists
            try {
                const avatarFile = await accountDir.getFileHandle('avatar.png');
                const avatarBlob = await avatarFile.getFile();
                const avatarUrl = URL.createObjectURL(avatarBlob);
                accountData.avatarImage = avatarUrl;
            } catch (error) {
                // No avatar image, that's okay
            }

            this.currentUser = accountData;
            this.isLoggedIn = true;
            this.saveLoginState();

            return { success: true, user: accountData };
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, message: 'Account not found or invalid credentials' };
        }
    }

    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.saveLoginState();
    }

    saveLoginState() {
        const state = {
            isLoggedIn: this.isLoggedIn,
            currentUser: this.currentUser
        };
        localStorage.setItem('openchat_login_state', JSON.stringify(state));
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getLoginState() {
        return this.isLoggedIn;
    }

    sanitizeEmail(email) {
        return email.replace(/[^a-zA-Z0-9]/g, '_');
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async saveAvatarImage(accountDir, imageDataUrl) {
        try {
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            const avatarFile = await accountDir.getFileHandle('avatar.png', { create: true });
            const writable = await avatarFile.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (error) {
            console.error('Failed to save avatar:', error);
        }
    }
}

// Auth UI Class - handles UI interactions
class AuthUI {
    constructor() {
        this.accountManager = null;
        this.isLoggedIn = false;
        this.currentUser = null;
        this.selectedAvatar = 'default';
        this.selectedAvatarImage = null;
        
        this.initializeEventListeners();
    }

    async initialize(accountManager) {
        this.accountManager = accountManager;
        
        // Restore login state
        this.isLoggedIn = this.accountManager.getLoginState();
        this.currentUser = this.accountManager.getCurrentUser();
        this.updateAuthUI();
    }

    initializeEventListeners() {
        // Show login screen
        document.getElementById('loginMenuItem')?.addEventListener('click', () => {
            this.showAuthScreen('login');
        });

        // Show signup screen
        document.getElementById('showSignup')?.addEventListener('click', () => {
            this.showAuthScreen('signup');
        });

        // Switch between login and signup
        document.getElementById('switchToSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthScreen('signup');
        });

        document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthScreen('login');
        });

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Logout
        document.getElementById('logoutMenuItem')?.addEventListener('click', () => {
            this.logout();
        });

        // Avatar selection
        document.getElementById('avatarCircle')?.addEventListener('click', () => {
            this.selectAvatar();
        });

        // Close auth screen
        document.getElementById('closeAuth')?.addEventListener('click', () => {
            this.hideAuthScreen();
        });

        // Click outside to close
        document.getElementById('authOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'authOverlay') {
                this.hideAuthScreen();
            }
        });
    }

    showAuthScreen(mode = 'login') {
        const authScreen = document.getElementById('authScreen');
        const authTitle = document.getElementById('authTitle');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (!authScreen) return;

        if (mode === 'login') {
            if (authTitle) authTitle.textContent = 'Login to OpenChat';
            if (loginForm) loginForm.style.display = 'block';
            if (signupForm) signupForm.style.display = 'none';
        } else {
            if (authTitle) authTitle.textContent = 'Sign Up for OpenChat';
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'block';
        }

        authScreen.style.display = 'flex';
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = mode === 'login' 
                ? document.getElementById('loginEmail')
                : document.getElementById('signupName');
            firstInput?.focus();
        }, 100);
    }

    hideAuthScreen() {
        const authScreen = document.getElementById('authScreen');
        if (authScreen) {
            authScreen.style.display = 'none';
        }
        
        // Reset forms
        document.getElementById('loginForm')?.reset();
        document.getElementById('signupForm')?.reset();
        
        // Reset avatar selection
        this.selectedAvatar = 'default';
        this.selectedAvatarImage = null;
        this.updateAvatarDisplay();
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        this.showToast('Logging in...', 'info');

        const result = await this.accountManager.login(email, password);

        if (result.success) {
            this.currentUser = result.user;
            this.isLoggedIn = true;
            this.updateAuthUI();
            this.hideAuthScreen();
            this.showToast('Login successful!', 'success');
        } else {
            this.showToast(result.message, 'error');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;

        if (!name || !email || !password || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        this.showToast('Creating account...', 'info');

        const userData = {
            name: name,
            email: email,
            password: password,
            avatar: this.selectedAvatar,
            avatarImage: this.selectedAvatarImage,
            plan: 'Free',
            createdAt: new Date().toISOString()
        };

        const result = await this.accountManager.createAccount(userData);

        if (result.success) {
            this.showToast('Account created successfully!', 'success');
            
            // Auto-login after successful account creation
            const loginResult = await this.accountManager.login(email, password);
            if (loginResult.success) {
                this.currentUser = loginResult.user;
                this.isLoggedIn = true;
                this.updateAuthUI();
                this.hideAuthScreen();
            }
        } else {
            this.showToast(result.message, 'error');
        }
    }

    async selectAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('Image too large. Please select an image under 5MB.', 'error');
                return;
            }

            // Convert to base64
            const reader = new FileReader();
            reader.onload = (e) => {
                this.selectedAvatarImage = e.target.result;
                this.selectedAvatar = 'custom';
                this.updateAvatarDisplay();
                this.showToast('Avatar selected!', 'success');
            };
            reader.readAsDataURL(file);
        };

        input.click();
    }

    updateAvatarDisplay() {
        const avatarCircle = document.getElementById('currentAvatar');
        if (!avatarCircle) return;

        if (this.selectedAvatarImage) {
            avatarCircle.innerHTML = `<img src="${this.selectedAvatarImage}" alt="Selected Avatar">`;
        } else {
            avatarCircle.innerHTML = '<i class="fas fa-user"></i>';
        }
    }

    updateAuthUI() {
        const profileName = document.querySelector('.profile-name');
        const profilePlan = document.querySelector('.profile-plan');
        const profileAvatar = document.querySelector('.profile-avatar');
        const loginMenuItem = document.getElementById('loginMenuItem');
        const logoutMenuItem = document.getElementById('logoutMenuItem');

        if (this.isLoggedIn && this.currentUser) {
            if (profileName) profileName.textContent = this.currentUser.name || 'User';
            if (profilePlan) profilePlan.textContent = this.currentUser.plan || 'Free';
            if (loginMenuItem) loginMenuItem.style.display = 'none';
            if (logoutMenuItem) logoutMenuItem.style.display = 'block';

            // Update profile avatar
            if (profileAvatar) {
                if (this.currentUser.avatarImage) {
                    profileAvatar.innerHTML = `<img src="${this.currentUser.avatarImage}" alt="Profile">`;
                } else if (this.currentUser.avatar && this.currentUser.avatar !== 'default') {
                    profileAvatar.innerHTML = `<i class="fas fa-${this.currentUser.avatar}"></i>`;
                } else {
                    profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
                }
            }
        } else {
            if (profileName) profileName.textContent = 'Guest';
            if (profilePlan) profilePlan.textContent = 'Not logged in';
            if (loginMenuItem) loginMenuItem.style.display = 'block';
            if (logoutMenuItem) logoutMenuItem.style.display = 'none';
            if (profileAvatar) profileAvatar.innerHTML = '<i class="fas fa-user-circle"></i>';
        }
    }

    logout() {
        this.accountManager.logout();
        this.isLoggedIn = false;
        this.currentUser = null;
        this.updateAuthUI();
        this.closeProfileDropdown();
        this.showToast('Logged out successfully', 'info');
    }

    closeProfileDropdown() {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    showToast(message, type = 'info') {
        // Use existing toast system from main.js
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`Toast: ${message} (${type})`);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getLoginState() {
        return this.isLoggedIn;
    }
}

// Global functions for backward compatibility
function handleLogin() {
    if (window.authUI) {
        window.authUI.handleLogin();
    }
}

function handleSignup() {
    if (window.authUI) {
        window.authUI.handleSignup();
    }
}

function switchToLogin() {
    if (window.authUI) {
        window.authUI.showAuthScreen('login');
    }
}

function switchToSignup() {
    if (window.authUI) {
        window.authUI.showAuthScreen('signup');
    }
}

function hideAuthScreen() {
    if (window.authUI) {
        window.authUI.hideAuthScreen();
    }
}

function handleAvatarUpload(event) {
    if (window.authUI) {
        const file = event.target.files[0];
        if (file) {
            window.authUI.selectAvatar();
        }
    }
}

// Export classes globally
window.AccountManager = AccountManager;
window.AuthUI = AuthUI;
