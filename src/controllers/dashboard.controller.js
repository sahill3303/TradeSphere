import db from '../config/db.js';

export const getDashboardSummary = async (req, res) => {
    try {

        // CLIENT COUNTS
        const [[{ totalClients }]] = await db.query(
            `SELECT COUNT(*) AS totalClients 
             FROM clients 
             WHERE is_deleted = FALSE`
        );

        const [[{ activeClients }]] = await db.query(
            `SELECT COUNT(*) AS activeClients 
             FROM clients 
             WHERE status = 'ACTIVE'
             AND is_deleted = FALSE`
        );

        // TOTAL CLIENT CAPITAL (THIS IS WHAT YOU WANT)
        const [[{ totalCapital }]] = await db.query(
            `SELECT COALESCE(SUM(capital_invested), 0) AS totalCapital
             FROM clients
             WHERE status = 'ACTIVE'
             AND is_deleted = FALSE`
        );

        // TRADE STATS (ONLY CLOSED)
        const [[stats]] = await db.query(
            `SELECT 
                COUNT(*) AS totalTrades,
                COALESCE(SUM(total_pnl), 0) AS totalPnl,
                SUM(CASE WHEN total_pnl > 0 THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN total_pnl < 0 THEN 1 ELSE 0 END) AS losses
             FROM trades
             WHERE status = 'CLOSED'
             AND is_deleted = FALSE`
        );

        const totalTrades = stats.totalTrades || 0;
        const totalPnl = stats.totalPnl || 0;
        const wins = stats.wins || 0;
        const losses = stats.losses || 0;

        const winRate =
            totalTrades > 0
                ? Number(((wins / totalTrades) * 100).toFixed(2))
                : 0;

        res.json({
            totalClients,
            activeClients,
            totalCapital,   // 👈 This replaces capitalManaged
            totalTrades,
            totalPnl,
            wins,
            losses,
            winRate
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Dashboard summary error',
            error: error.message
        });
    }
};

export const getMonthlyPerformance = async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT
                DATE_FORMAT(closed_at, '%Y-%m') AS month_key,
                DATE_FORMAT(closed_at, '%b') AS month,
                SUM(CASE WHEN total_pnl > 0 THEN total_pnl ELSE 0 END) AS profit,
                SUM(CASE WHEN total_pnl < 0 THEN total_pnl ELSE 0 END) AS loss
            FROM trades
            WHERE status = 'CLOSED'
              AND is_deleted = FALSE
              AND closed_at IS NOT NULL
            GROUP BY DATE_FORMAT(closed_at, '%Y-%m'),
                     DATE_FORMAT(closed_at, '%b')
            ORDER BY month_key
        `);

        // remove month_key before sending to frontend
        const formatted = rows.map(r => ({
            month: r.month,
            profit: r.profit,
            loss: r.loss
        }));

        res.json(formatted);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Monthly performance error',
            error: error.message
        });
    }
};

export const getWinLossDistribution = async (req, res) => {
    try {
        const [[stats]] = await db.query(`
            SELECT
                SUM(CASE WHEN total_pnl > 0 THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN total_pnl < 0 THEN 1 ELSE 0 END) AS losses,
                SUM(CASE WHEN total_pnl = 0 THEN 1 ELSE 0 END) AS breakeven
            FROM trades
            WHERE status = 'CLOSED'
            AND is_deleted = FALSE
        `);

        res.json(stats);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Win/Loss distribution error',
            error: error.message
        });
    }
};

export const getRecentTrades = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                trade_id,
                stock_name,
                trade_type,
                total_pnl,
                status,
                created_at
            FROM trades
            WHERE is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT 5
        `);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Recent trades error',
            error: error.message
        });
    }
};