import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

/**
 * REGISTER ADMIN
 */
export const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // check if email exists
        const [existing] = await db.query(
            'SELECT id FROM admins WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, passwordHash]
        );

        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (err) {
        console.error('REGISTRATION ERROR:', err);
        res.status(500).json({ 
            message: 'Register error', 
            error: err.message,
            code: err.code // Helpful for DB errors like 'ER_BAD_TABLE_ERROR'
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

        res.json({
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ message: 'Login error', error: err.message });
    }
};


export const getMe = async (req, res) => {
    try {
        // req.admin = JWT payload which only has { id, role }
        // Fetch full admin row from DB to get name, email, etc.
        const [rows] = await db.query(
            'SELECT id, name, email, role FROM admins WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch admin',
            error: error.message
        });
    }
};



export const updateProfile = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userId = req.user.id;

        // Validations
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // Check if email is already taken by another user
        const [existing] = await db.query(
            'SELECT id FROM admins WHERE email = ? AND id != ?',
            [email, userId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already taken' });
        }

        let query = 'UPDATE admins SET name = ?, email = ?';
        const params = [name, email];

        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            query += ', password_hash = ?';
            params.push(passwordHash);
        }

        query += ' WHERE id = ?';
        params.push(userId);

        await db.query(query, params);

        // Fetch updated user
        const [rows] = await db.query(
            'SELECT id, name, email, role FROM admins WHERE id = ?',
            [userId]
        );

        res.json({
            message: 'Profile updated successfully',
            user: rows[0]
        });
    } catch (error) {
        console.error('UPDATE PROFILE ERROR:', error);
        res.status(500).json({
            message: 'Failed to update profile',
            error: error.message
        });
    }
};
