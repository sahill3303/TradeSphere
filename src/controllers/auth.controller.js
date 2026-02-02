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
        res.status(500).json({ message: 'Register error', error: err.message });
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

        const token = jwt.sign(
            { id: admin.id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
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
        res.status(500).json({ message: 'Login error', error: err.message });
    }
};


export const getMe = async (req, res) => {
    try {
        const admin = req.admin;

        res.json({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch admin",
            error: error.message
        });
    }
};




console.log("AUTH CONTROLLER LOADED");