import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const DEFAULT_PREFERENCES = {
    theme: 'dark',
    accentColor: 'gold',
    sidebarFeatures: {
        watchlist: true,
        clients: true,
        trades: true,
        analysis: true,
        notes: true
    }
};

/**
 * REGISTER ADMIN
 */
export const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const [existing] = await db.query(
            'SELECT id FROM admins WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO admins (name, email, password_hash, preferences) VALUES (?, ?, ?, ?)',
            [name, email, passwordHash, JSON.stringify(DEFAULT_PREFERENCES)]
        );

        const newAdminId = result.insertId;

        // Provision default data for new user
        await db.query(
            'INSERT INTO capital_summary (admin_id, total_capital, total_pnl, deployed_capital) VALUES (?, 0.00, 0.00, 0.00)',
            [newAdminId]
        );

        await db.query(
            'INSERT INTO watchlist_categories (name, admin_id) VALUES (?, ?), (?, ?), (?, ?)',
            ['Short', newAdminId, 'Long', newAdminId, 'Specific Week', newAdminId]
        );

        res.status(201).json({ message: 'Admin registered successfully', isNew: true });
    } catch (err) {
        console.error('REGISTRATION ERROR:', err);
        res.status(500).json({ 
            message: 'Register error', 
            error: err.message,
            code: err.code
        });
    }
};

/**
 * LOGIN ADMIN
 */
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [admins] = await db.query(
            'SELECT * FROM admins WHERE email = ?',
            [email]
        );

        if (admins.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const admin = admins[0];

        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET not set.' });
        }

        const token = jwt.sign(
            { id: admin.id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        let preferences = DEFAULT_PREFERENCES;
        try {
            if (admin.preferences) {
                preferences = typeof admin.preferences === 'string'
                    ? JSON.parse(admin.preferences)
                    : admin.preferences;
            }
        } catch (_) { /* keep defaults */ }

        res.json({
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                preferences
            }
        });
    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ message: 'Login error', error: err.message });
    }
};


export const getMe = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, email, role, preferences FROM admins WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const admin = rows[0];
        let preferences = DEFAULT_PREFERENCES;
        try {
            if (admin.preferences) {
                preferences = typeof admin.preferences === 'string'
                    ? JSON.parse(admin.preferences)
                    : admin.preferences;
            }
        } catch (_) { /* keep defaults */ }

        res.json({ ...admin, preferences });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch admin',
            error: error.message
        });
    }
};

/**
 * UPDATE PREFERENCES
 */
export const updatePreferences = async (req, res) => {
    try {
        const { preferences } = req.body;
        if (!preferences) return res.status(400).json({ message: 'Preferences required' });

        await db.query(
            'UPDATE admins SET preferences = ? WHERE id = ?',
            [JSON.stringify(preferences), req.user.id]
        );

        res.json({ message: 'Preferences saved' });
    } catch (error) {
        res.status(500).json({ message: 'Save preferences error', error: error.message });
    }
};
