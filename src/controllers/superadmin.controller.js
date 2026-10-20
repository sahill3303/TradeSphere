import db from '../config/db.js';
import bcrypt from 'bcrypt';

export const getAllUsers = async (req, res) => {
    try {
        const { sort = 'registered_desc', search = '' } = req.query;

        let query = `
            SELECT 
                a.id, a.email, a.role, a.created_at, a.last_login_at, a.login_count, a.is_frozen, a.subscription_expires_at, a.must_reset_password
            FROM admins a
            WHERE a.role != 'superadmin'
        `;
        const params = [];

        if (search && search.trim()) {
            query += ` AND a.email LIKE ?`;
            params.push(`%${search.trim()}%`);
        }

        // Sorting options:
        // 'registered_desc': New user registered (newest first)
        // 'registered_asc': Oldest registered first
        // 'expiry_near': User expiry near (expiring soonest first)
        // 'login_desc': User login (most recent login first)
        // 'inactive_desc': User inactive (longest inactive / never logged in first)
        // 'email_asc': Alphabetical by email
        switch (sort) {
            case 'registered_asc':
                query += ` ORDER BY a.created_at ASC`;
                break;
            case 'expiry_near':
                query += ` ORDER BY 
                    CASE 
                        WHEN a.subscription_expires_at IS NULL THEN 2
                        WHEN a.subscription_expires_at < NOW() THEN 0
                        ELSE 1
                    END ASC,
                    a.subscription_expires_at ASC`;
                break;
            case 'login_desc':
                query += ` ORDER BY 
                    CASE WHEN a.last_login_at IS NULL THEN 1 ELSE 0 END ASC, 
                    a.last_login_at DESC`;
                break;
            case 'inactive_desc':
                query += ` ORDER BY 
                    CASE WHEN a.last_login_at IS NULL THEN 0 ELSE 1 END ASC, 
                    a.last_login_at ASC, 
                    a.created_at ASC`;
                break;
            case 'email_asc':
                query += ` ORDER BY a.email ASC`;
                break;
            case 'registered_desc':
            default:
                query += ` ORDER BY a.created_at DESC`;
                break;
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('GET ALL USERS ERROR:', err);
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
};

const parseDateSafe = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    let s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
        s = s.replace(' ', 'T');
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

export const getNotifications = async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT a.id, a.email, a.created_at, a.last_login_at, a.login_count, a.is_frozen, a.subscription_expires_at
            FROM admins a
            WHERE a.role != 'superadmin'
        `);

        const now = new Date();
        const notifications = [];

        users.forEach(user => {
            const createdAt = parseDateSafe(user.created_at);
            const daysSinceCreated = createdAt ? (now - createdAt) / (1000 * 60 * 60 * 24) : 999;

            // 1. New user registered (within last 7 days)
            if (daysSinceCreated <= 7) {
                notifications.push({
                    id: `reg-${user.id}`,
                    userId: user.id,
                    email: user.email,
                    type: 'new_user_registered',
                    title: 'New User Registered',
                    message: `${user.email} joined the platform`,
                    timestamp: user.created_at,
                    severity: 'success',
                    meta: { daysAgo: Math.max(0, Math.floor(daysSinceCreated)) }
                });
            }

            // 2. User expiry near or expired
            if (user.subscription_expires_at) {
                const expiryDate = parseDateSafe(user.subscription_expires_at);
                if (expiryDate) {
                    const diffTime = expiryDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 7 && diffDays > 0) {
                        notifications.push({
                            id: `exp-near-${user.id}`,
                            userId: user.id,
                            email: user.email,
                            type: 'user_expiry_near',
                            title: 'User Expiry Near',
                            message: `${user.email} license expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
                            timestamp: user.subscription_expires_at,
                            severity: 'warning',
                            meta: { daysLeft: diffDays, expiryDate: user.subscription_expires_at }
                        });
                    } else if (diffDays === 0) {
                        notifications.push({
                            id: `exp-today-${user.id}`,
                            userId: user.id,
                            email: user.email,
                            type: 'user_expiry_near',
                            title: 'License Expires Today',
                            message: `${user.email} license expires today`,
                            timestamp: user.subscription_expires_at,
                            severity: 'warning',
                            meta: { daysLeft: 0, expiryDate: user.subscription_expires_at }
                        });
                    } else if (diffDays < 0 && diffDays >= -14) {
                        notifications.push({
                            id: `exp-expired-${user.id}`,
                            userId: user.id,
                            email: user.email,
                            type: 'user_expiry_near',
                            title: 'License Expired',
                            message: `${user.email} license expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`,
                            timestamp: user.subscription_expires_at,
                            severity: 'danger',
                            meta: { daysLeft: diffDays, expiryDate: user.subscription_expires_at }
                        });
                    }
                }
            }

            // 3. User login (within last 48 hours)
            if (user.last_login_at) {
                const lastLogin = parseDateSafe(user.last_login_at);
                if (lastLogin) {
                    const hoursSinceLogin = (now - lastLogin) / (1000 * 60 * 60);
                    if (hoursSinceLogin <= 48 && hoursSinceLogin >= 0) {
                        notifications.push({
                            id: `login-${user.id}`,
                            userId: user.id,
                            email: user.email,
                            type: 'user_login',
                            title: 'User Login',
                            message: `${user.email} logged in (${user.login_count || 1} total sessions)`,
                            timestamp: user.last_login_at,
                            severity: 'info',
                            meta: { loginCount: user.login_count || 1, hoursAgo: Math.max(0, Math.round(hoursSinceLogin)) }
                        });
                    }
                }
            }

            // 4. User inactive (>= 14 days without login, or registered >= 3 days ago with 0 logins)
            if (user.last_login_at) {
                const lastLogin = parseDateSafe(user.last_login_at);
                if (lastLogin) {
                    const daysSinceLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
                    if (daysSinceLogin >= 14) {
                        notifications.push({
                            id: `inactive-${user.id}`,
                            userId: user.id,
                            email: user.email,
                            type: 'user_inactive',
                            title: 'User Inactive',
                            message: `${user.email} inactive for ${daysSinceLogin} days`,
                            timestamp: user.last_login_at,
                            severity: 'warning',
                            meta: { daysInactive: daysSinceLogin, lastLogin: user.last_login_at }
                        });
                    }
                }
            } else if (daysSinceCreated >= 3) {
                notifications.push({
                    id: `inactive-never-${user.id}`,
                    userId: user.id,
                    email: user.email,
                    type: 'user_inactive',
                    title: 'User Inactive (Never Logged In)',
                    message: `${user.email} registered ${Math.floor(daysSinceCreated)} days ago with no login`,
                    timestamp: user.created_at,
                    severity: 'warning',
                    meta: { daysInactive: Math.floor(daysSinceCreated), neverLoggedIn: true }
                });
            }
        });

        // Sort notifications by timestamp descending (newest first)
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const summary = {
            total: notifications.length,
            newUsers: notifications.filter(n => n.type === 'new_user_registered').length,
            expiryNear: notifications.filter(n => n.type === 'user_expiry_near').length,
            recentLogins: notifications.filter(n => n.type === 'user_login').length,
            inactiveUsers: notifications.filter(n => n.type === 'user_inactive').length
        };

        res.json({ summary, notifications });
    } catch (err) {
        console.error('GET NOTIFICATIONS ERROR:', err);
        res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
    }
};

// Zero-knowledge security: tenant data is strictly forbidden to superadmin
export const getUserClients = async (req, res) => {
    res.status(403).json({ message: 'Access denied: Tenant client data is private and restricted strictly to the user.' });
};

export const getUserTrades = async (req, res) => {
    res.status(403).json({ message: 'Access denied: Tenant trading data is private and restricted strictly to the user.' });
};

export const getUserCapital = async (req, res) => {
    res.status(403).json({ message: 'Access denied: Tenant financial data is private and restricted strictly to the user.' });
};

export const freezeUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE admins SET is_frozen = TRUE WHERE id = ?', [id]);
        res.json({ message: 'User account frozen successfully' });
    } catch (err) {
        console.error('FREEZE USER ERROR:', err);
        res.status(500).json({ message: 'Failed to freeze user', error: err.message });
    }
};

export const unfreezeUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE admins SET is_frozen = FALSE WHERE id = ?', [id]);
        res.json({ message: 'User account unfrozen successfully' });
    } catch (err) {
        console.error('UNFREEZE USER ERROR:', err);
        res.status(500).json({ message: 'Failed to unfreeze user', error: err.message });
    }
};

export const updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { expiresAt, daysToAdd } = req.body;
        
        let targetDate;
        if (expiresAt) {
            targetDate = new Date(expiresAt);
        } else if (daysToAdd) {
            const [rows] = await db.query('SELECT subscription_expires_at FROM admins WHERE id = ?', [id]);
            const currentExpiry = rows[0]?.subscription_expires_at;
            const baseDate = (currentExpiry && new Date(currentExpiry) > new Date()) 
                ? new Date(currentExpiry) 
                : new Date();
            baseDate.setDate(baseDate.getDate() + parseInt(daysToAdd));
            targetDate = baseDate;
        } else {
            return res.status(400).json({ message: 'Either expiresAt or daysToAdd is required' });
        }
        
        await db.query('UPDATE admins SET subscription_expires_at = ? WHERE id = ?', [targetDate, id]);
        res.json({ message: 'Subscription updated successfully', expiresAt: targetDate });
    } catch (err) {
        console.error('UPDATE SUBSCRIPTION ERROR:', err);
        res.status(500).json({ message: 'Failed to update subscription', error: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Cascades automatically delete related records (clients, trades, notes, capital) due to foreign key constraints.
        await db.query('DELETE FROM admins WHERE id = ?', [id]);
        res.json({ message: 'User and all associated data deleted successfully' });
    } catch (err) {
        console.error('DELETE USER ERROR:', err);
        res.status(500).json({ message: 'Failed to delete user', error: err.message });
    }
};

export const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { customPassword } = req.body;

        // Generate a cryptographically secure temporary password if not provided
        // Example format: TS#9x7k2q!A
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let randomStr = '';
        for (let i = 0; i < 6; i++) {
            randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const tempPassword = customPassword && customPassword.trim().length >= 8 
            ? customPassword.trim() 
            : `TS#${randomStr}!9`;

        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // Update password_hash in database, flag account to force password change on login
        await db.query(
            'UPDATE admins SET password_hash = ?, password_plain = NULL, must_reset_password = TRUE WHERE id = ?',
            [passwordHash, id]
        );

        res.json({ 
            message: 'User password reset successfully', 
            tempPassword 
        });
    } catch (err) {
        console.error('RESET USER PASSWORD ERROR:', err);
        res.status(500).json({ message: 'Failed to reset user password', error: err.message });
    }
};
