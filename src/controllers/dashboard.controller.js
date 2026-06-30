import db from '../config/db.js';

export const getDashboardSummary = async (req, res) => {
    try {

        const adminId = req.user.id;

        // CLIENT COUNTS
        const [[{ totalClients }]] = await db.query(
            `SELECT COUNT(*) AS totalClients 
             FROM clients 
             WHERE is_deleted = FALSE AND admin_id = ?`,
            [adminId]
        );

        const [[{ activeClients }]] = await db.query(
            `SELECT COUNT(*) AS activeClients 
             FROM clients 
             WHERE status = 'ACTIVE'
             AND is_deleted = FALSE AND admin_id = ?`,
            [adminId]
        );

        // TOTAL CLIENT CAPITAL (THIS IS WHAT YOU WANT)
        const [[{ totalCapital }]] = await db.query(
            `SELECT COALESCE(SUM(capital_invested), 0) AS totalCapital
             FROM clients
             WHERE status = 'ACTIVE'
             AND is_deleted = FALSE AND admin_id = ?`,
            [adminId]
        );

        // TOTAL TRADE COUNT (ALL — Open + Closed)
        const [[{ allTrades }]] = await db.query(
            `SELECT COUNT(*) AS allTrades FROM trades WHERE is_deleted = FALSE AND admin_id = ?`,
            [adminId]
        );

        // TOTAL JOURNAL/NOTE COUNT
        const [[{ totalNotes }]] = await db.query(
            `SELECT COUNT(*) AS totalNotes FROM reference_notes WHERE admin_id = ?`,
            [adminId]
        );

        // TOTAL WATCHLIST SYMBOL COUNT
        const [[{ totalWatchlist }]] = await db.query(
            `SELECT COUNT(*) AS totalWatchlist FROM watchlist_symbols WHERE admin_id = ?`,
            [adminId]
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
             AND is_deleted = FALSE AND admin_id = ?`,
            [adminId]
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
            profitFactor,
            totalNotes: totalNotes || 0,
            totalWatchlist: totalWatchlist || 0
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
        const adminId = req.user.id;

        const [rows] = await db.query(`
            SELECT
                DATE_FORMAT(COALESCE(trade_date, created_at), '%Y-%m') AS month_key,
                DATE_FORMAT(COALESCE(trade_date, created_at), '%b') AS month,
                stock_name,
                trade_type,
                entry_price,
                quantity,
                leverage,
                total_pnl
            FROM trades
            WHERE status = 'CLOSED'
              AND is_deleted = FALSE
              AND admin_id = ?
              AND entry_price > 0
              AND quantity > 0
        `, [adminId]);

        const monthMap = {};
        for (const row of rows) {
            // Calculate trade return percentage
            const lev = row.leverage || 1;
            const invested = (row.entry_price * row.quantity) / lev;
            const tradePct = invested > 0 ? (row.total_pnl / invested) * 100 : 0;
            
            // For backward compatibility if any row had NULL trade_date and created_at
            if (!row.month_key) continue;

            if (!monthMap[row.month_key]) {
                monthMap[row.month_key] = {
                    month: row.month,
                    profit: 0,
                    loss: 0,
                    returnPercentage: 0,
                    stocks: {} // Use object map temporarily to aggregate same stock trades in a month
                };
            }
            
            monthMap[row.month_key].profit += row.total_pnl > 0 ? row.total_pnl : 0;
            monthMap[row.month_key].loss += row.total_pnl < 0 ? row.total_pnl : 0;
            monthMap[row.month_key].returnPercentage += tradePct;
            
            if (!monthMap[row.month_key].stocks[row.stock_name]) {
                monthMap[row.month_key].stocks[row.stock_name] = 0;
            }
            monthMap[row.month_key].stocks[row.stock_name] += tradePct;
        }

        const formatted = Object.keys(monthMap).sort().map(mKey => {
            const m = monthMap[mKey];
            // Convert stock map back to array and sort
            m.stocks = Object.keys(m.stocks).map(stk => ({
                stock_name: stk,
                returnPercentage: m.stocks[stk]
            })).sort((a, b) => b.returnPercentage - a.returnPercentage);
            
            return {
                month: m.month,
                profit: m.profit,
                loss: m.loss,
                returnPercentage: Number(m.returnPercentage.toFixed(2)),
                stocks: m.stocks
            };
        });

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
        const adminId = req.user.id;
        const [[stats]] = await db.query(`
            SELECT
                SUM(CASE WHEN total_pnl > 0 THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN total_pnl < 0 THEN 1 ELSE 0 END) AS losses,
                SUM(CASE WHEN total_pnl = 0 THEN 1 ELSE 0 END) AS breakeven
            FROM trades
            WHERE status = 'CLOSED'
            AND is_deleted = FALSE AND admin_id = ?
        `, [adminId]);

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
        const adminId = req.user.id;
        const [rows] = await db.query(`
            SELECT
                trade_id,
                stock_name,
                trade_type,
                total_pnl,
                status,
                created_at
            FROM trades
            WHERE is_deleted = FALSE AND admin_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        `, [adminId]);

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