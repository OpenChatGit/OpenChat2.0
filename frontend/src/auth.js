// Account Management System for OpenChat 2.0
// Handles persistent account storage using browser's file system access API

class AccountManager {
    constructor() {
        this.accountsDir = null;
        this.currentUser = null;
        this.isLoggedIn = false;
    }

    // Initialize the account system
    async initialize() {
        try {
            // Check if we have stored directory handle
            const storedHandle = localStorage.getItem('accountsDirHandle');
            if (storedHandle) {
                // Try to restore the directory handle
                this.accountsDir = await this.restoreDirectoryHandle();
            }
        } catch (error) {
            console.log('No existing accounts directory found');
        }
    }

    // Request directory access for storing accounts
    async setupAccountsDirectory() {
        try {
            // Request directory picker
            this.accountsDir = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });
            
            // Store the handle for future use
            localStorage.setItem('accountsDirHandle', JSON.stringify(this.accountsDir));
            return true;
        } catch (error) {
            console.error('Failed to setup accounts directory:', error);
            return false;
        }
    }

    // Create a new account
    async createAccount(userData) {
        try {
            if (!this.accountsDir) {
                const setupSuccess = await this.setupAccountsDirectory();
                if (!setupSuccess) {
                    throw new Error('Failed to setup accounts directory');
                }
            }

            // Hash the password for security
            const hashedPassword = await this.hashPassword(userData.password);
            
            // Create account data
            const accountData = {
                name: userData.name,
                email: userData.email,
                passwordHash: hashedPassword,
                avatar: userData.avatar || 'default',
                avatarImage: userData.avatarImage || null,
                createdAt: new Date().toISOString(),
                plan: 'Free'
            };

            // Create account folder name (sanitized email)
            const folderName = this.sanitizeFileName(userData.email);
            
            // Create account directory
            const accountDir = await this.accountsDir.getDirectoryHandle(folderName, { create: true });
            
            // Create account.json file
            const accountFile = await accountDir.getFileHandle('account.json', { create: true });
            const writable = await accountFile.createWritable();
            await writable.write(JSON.stringify(accountData, null, 2));
            await writable.close();

            // Save avatar image if provided
            if (userData.avatarImage) {
                await this.saveAvatarImage(accountDir, userData.avatarImage);
            }

            return { success: true, message: 'Account created successfully!' };
        } catch (error) {
            console.error('Account creation failed:', error);
            return { success: false, message: 'Failed to create account: ' + error.message };
        }
    }

    // Login to an existing account
    async login(email, password) {
        try {
            if (!this.accountsDir) {
                return { success: false, message: 'No accounts directory found. Please create an account first.' };
            }

            const folderName = this.sanitizeFileName(email);
            
            // Try to access account directory
            const accountDir = await this.accountsDir.getDirectoryHandle(folderName);
            const accountFile = await accountDir.getFileHandle('account.json');
            const file = await accountFile.getFile();
            const accountData = JSON.parse(await file.text());

            // Verify password
            const isValidPassword = await this.verifyPassword(password, accountData.passwordHash);
            if (!isValidPassword) {
                return { success: false, message: 'Invalid password' };
            }

            // Load avatar image if exists
            let avatarImage = null;
            try {
                const avatarFile = await accountDir.getFileHandle('avatar.png');
                const avatarBlob = await avatarFile.getFile();
                avatarImage = URL.createObjectURL(avatarBlob);
            } catch (error) {
                // No avatar image file
            }

            // Set current user
            this.currentUser = {
                ...accountData,
                avatarImage: avatarImage || accountData.avatarImage
            };
            this.isLoggedIn = true;

            // Store login state
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('isLoggedIn', 'true');

            return { success: true, message: 'Login successful!', user: this.currentUser };
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, message: 'Account not found or login failed' };
        }
    }

    // Logout current user
    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
    }

    // Restore login state from localStorage
    restoreLoginState() {
        const storedUser = localStorage.getItem('currentUser');
        const storedLoginState = localStorage.getItem('isLoggedIn');
        
        if (storedUser && storedLoginState === 'true') {
            this.currentUser = JSON.parse(storedUser);
            this.isLoggedIn = true;
            return true;
        }
        return false;
    }

    // Hash password using Web Crypto API
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Verify password against hash
    async verifyPassword(password, hash) {
        const passwordHash = await this.hashPassword(password);
        return passwordHash === hash;
    }

    // Save avatar image to account directory
    async saveAvatarImage(accountDir, avatarImageData) {
        try {
            // Convert base64 to blob
            const response = await fetch(avatarImageData);
            const blob = await response.blob();
            
            // Save as avatar.png
            const avatarFile = await accountDir.getFileHandle('avatar.png', { create: true });
            const writable = await avatarFile.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (error) {
            console.error('Failed to save avatar image:', error);
        }
    }

    // Sanitize filename for directory creation
    sanitizeFileName(filename) {
        return filename.replace(/[^a-z0-9@.-]/gi, '_').toLowerCase();
    }

    // Restore directory handle from localStorage
    async restoreDirectoryHandle() {
        // Note: This is a simplified version. In a real implementation,
        // you'd need to handle the directory handle restoration properly
        // For now, we'll prompt for directory selection again
        return null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is logged in
    getLoginState() {
        return this.isLoggedIn;
    }
}

// Export for use in main.js
window.AccountManager = AccountManager;
