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

        // TOTAL TRADE COUNT (ALL — Open + Closed)
        const [[{ allTrades }]] = await db.query(
            `SELECT COUNT(*) AS allTrades FROM trades WHERE is_deleted = FALSE`
        );

        // TRADE STATS (ONLY CLOSED — for profitability ratios)
        const [[stats]] = await db.query(
            `SELECT 
                COUNT(*) AS closedTrades,
                COALESCE(SUM(total_pnl), 0) AS totalPnl,
                SUM(CASE WHEN total_pnl > 0 THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN total_pnl < 0 THEN 1 ELSE 0 END) AS losses,
                COALESCE(AVG(CASE WHEN total_pnl > 0 THEN total_pnl END), 0) AS avgWin,
                COALESCE(AVG(CASE WHEN total_pnl < 0 THEN total_pnl END), 0) AS avgLoss,
                COALESCE(SUM(CASE WHEN total_pnl > 0 THEN total_pnl ELSE 0 END), 0) AS totalGrossWin,
                COALESCE(ABS(SUM(CASE WHEN total_pnl < 0 THEN total_pnl ELSE 0 END)), 0) AS totalGrossLoss
             FROM trades
             WHERE status = 'CLOSED'
             AND is_deleted = FALSE`
        );

        const totalTrades = allTrades || 0;
        const closedTrades = parseInt(stats.closedTrades, 10) || 0;
        const totalPnl = stats.totalPnl || 0;
        const wins = parseInt(stats.wins, 10) || 0;
        const losses = parseInt(stats.losses, 10) || 0;
        const avgWin = Number(Number(stats.avgWin || 0).toFixed(2));
        const avgLoss = Number(Number(stats.avgLoss || 0).toFixed(2));
        const totalGrossWin = Number(stats.totalGrossWin || 0);
        const totalGrossLoss = Number(stats.totalGrossLoss || 0);
        const profitFactor = totalGrossLoss > 0 ? Number((totalGrossWin / totalGrossLoss).toFixed(2)) : totalGrossWin > 0 ? Infinity : 0;

        const winRate =
            closedTrades > 0
                ? Number(((wins / closedTrades) * 100).toFixed(2))
                : 0;

        res.json({
            totalClients,
            activeClients,
            totalCapital,
            totalTrades,
            totalPnl,
            wins,
            losses,
            winRate,
            avgWin,
            avgLoss,
            profitFactor
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

// need to make some changes in dashboard controller