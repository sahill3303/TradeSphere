import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch fresh state from the database
        const [rows] = await db.query(
            'SELECT role, is_frozen, subscription_expires_at FROM admins WHERE id = ?',
            [decoded.id]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }
        
        const admin = rows[0];
        if (admin.is_frozen) {
            return res.status(403).json({ message: 'Your account has been frozen. Please contact Team TradeSphere.' });
        }
        
        if (admin.role !== 'superadmin' && admin.subscription_expires_at && new Date(admin.subscription_expires_at) < new Date()) {
            return res.status(403).json({ 
                message: 'Your trial plan has expired. Please contact Team TradeSphere to buy premium.',
                code: 'SUBSCRIPTION_EXPIRED'
            });
        }
        
        req.user = {
            id: decoded.id,
            role: admin.role
        };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
