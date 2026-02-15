import db from '../config/db.js';

export const getDashboardSummary = async (req, res) => {
    try {
        // 1️⃣ Client counts
        const [[{ totalClients }]] = await db.query(
            'SELECT COUNT(*) AS totalClients FROM clients'
        );

        const [[{ activeClients }]] = await db.query(
            "SELECT COUNT(*) AS activeClients FROM clients WHERE status = 'ACTIVE'"
        );

        // 2️⃣ Capital from capital_summary table (single source of truth)
        const [[capitalData]] = await db.query(
            `SELECT total_capital, total_pnl, deployed_capital
             FROM capital_summary
             WHERE capital_id = 1`
        );

        const capitalManaged = capitalData?.total_capital || 0;
        const totalPnl = capitalData?.total_pnl || 0;
        const deployedCapital = capitalData?.deployed_capital || 0;

        // 3️⃣ Trades stats
        const [[{ totalTrades }]] = await db.query(
            'SELECT COUNT(*) AS totalTrades FROM trades'
        );

        const [[{ winningTrades }]] = await db.query(
            'SELECT COUNT(*) AS winningTrades FROM trades WHERE total_pnl > 0'
        );

        const winRate =
            totalTrades > 0
                ? Number(((winningTrades / totalTrades) * 100).toFixed(2))
                : 0;

        res.json({
            totalClients,
            activeClients,
            capitalManaged,
            deployedCapital,
            totalPnl,
            totalTrades,
            winningTrades,
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
        DATE_FORMAT(month_key, '%b') AS month,
        profit,
        loss
      FROM (
        SELECT
          DATE_FORMAT(trade_date, '%Y-%m-01') AS month_key,
          SUM(CASE WHEN total_pnl > 0 THEN total_pnl ELSE 0 END) AS profit,
          SUM(CASE WHEN total_pnl < 0 THEN total_pnl ELSE 0 END) AS loss
        FROM trades
        GROUP BY month_key
      ) monthly
      ORDER BY month_key
    `);

        res.json(rows);
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
        const [rows] = await db.query(`
      SELECT
        SUM(outcome = 'WIN') AS wins,
        SUM(outcome = 'LOSS') AS losses,
        SUM(outcome = 'BREAKEVEN') AS breakeven
      FROM trades
    `);

        res.json(rows[0]);
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
        symbol,
        company_name,
        trade_type,
        total_pnl,
        outcome,
        trade_date
      FROM trades
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
