import db from '../config/db.js';

export const getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                a.id, a.name, a.email, a.role, a.created_at, a.last_login_at, a.is_frozen, a.subscription_expires_at, a.password_plain,
                (SELECT COUNT(*) FROM clients c WHERE c.admin_id = a.id AND c.is_deleted = FALSE) AS client_count,
                (SELECT COUNT(*) FROM trades t WHERE t.admin_id = a.id AND t.is_deleted = FALSE) AS trade_count,
                COALESCE((SELECT total_capital FROM capital_summary cs WHERE cs.admin_id = a.id), 0.00) AS total_capital
            FROM admins a
            WHERE a.role != 'superadmin'
            ORDER BY a.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('GET ALL USERS ERROR:', err);
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
};

export const getUserClients = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT client_id, name, broker, capital_invested, join_date, status, created_at 
             FROM clients 
             WHERE admin_id = ? AND is_deleted = FALSE 
             ORDER BY created_at DESC`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('GET USER CLIENTS ERROR:', err);
        res.status(500).json({ message: 'Failed to fetch clients', error: err.message });
    }
};

export const getUserTrades = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT trade_id, stock_name, trade_type, mode, quantity, entry_price, target, stop_loss, status, total_pnl, created_at 
             FROM trades 
             WHERE admin_id = ? AND is_deleted = FALSE 
             ORDER BY created_at DESC`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('GET USER TRADES ERROR:', err);
        res.status(500).json({ message: 'Failed to fetch trades', error: err.message });
    }
};

export const getUserCapital = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            'SELECT total_capital, total_pnl, deployed_capital FROM capital_summary WHERE admin_id = ?',
            [id]
        );
        res.json(rows[0] || { total_capital: 0, total_pnl: 0, deployed_capital: 0 });
    } catch (err) {
        console.error('GET USER CAPITAL ERROR:', err);
        res.status(500).json({ message: 'Failed to fetch capital summary', error: err.message });
    }
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
