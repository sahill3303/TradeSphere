import db from '../config/db.js';


// ✅ CREATE TRADE
export const createTrade = async (req, res) => {
    try {
        const {
            symbol,
            company_name,
            trade_type,
            trade_mode,
            trade_date,
            entry_price,
            quantity,
            leverage
        } = req.body;

        if (!symbol || !trade_type || !trade_mode || !entry_price || !quantity) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const lev = leverage || 1;

        const exposure = entry_price * quantity;
        const capital_used = exposure / lev;

        const [result] = await db.query(
            `INSERT INTO trades 
            (symbol, company_name, trade_type, trade_mode, trade_date, quantity, leverage, exposure, capital_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                symbol,
                company_name,
                trade_type,
                trade_mode,
                trade_date,
                quantity,
                lev,
                exposure,
                capital_used
            ]
        );

        res.status(201).json({
            message: "Trade created successfully",
            trade_id: result.insertId,
            exposure,
            capital_used
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Create trade error",
            error: error.message
        });
    }
};


// ✅ CREATE FULL JOURNAL   
export const createFullJournal = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            trade,
            pre_trade,
            entry,
            holding,
            exit,
            reflection
        } = req.body;

        if (!trade || !entry || !exit) {
            return res.status(400).json({
                message: "Trade, entry and exit data are required"
            });
        }

        const {
            symbol,
            company_name,
            trade_type,
            trade_mode,
            trade_date,
            quantity,
            leverage
        } = trade;

        const {
            entry_price,
            stop_loss,
            target_price,
            confidence_level,
            entry_emotion
        } = entry;

        const {
            exit_price,
            exit_date,
            exit_reason,
            exit_emotion
        } = exit;

        const lev = leverage || 1;

        // ✅ Calculate exposure & capital used
        const exposure = entry_price * quantity;
        const capital_used = exposure / lev;

        // ✅ Calculate REALIZED P&L
        let pnl = 0;

        if (trade_type === "LONG") {
            pnl = (exit_price - entry_price) * quantity;
        } else if (trade_type === "SHORT") {
            pnl = (entry_price - exit_price) * quantity;
        }

        // ✅ Determine outcome
        let outcome = "BREAKEVEN";
        if (pnl > 0) outcome = "WIN";
        if (pnl < 0) outcome = "LOSS";

        // 1️⃣ Insert into trades
        const [tradeResult] = await connection.query(
            `INSERT INTO trades 
            (symbol, company_name, trade_type, trade_mode, trade_date,
             quantity, leverage, exposure, capital_used,
             total_pnl, outcome, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                symbol,
                company_name,
                trade_type,
                trade_mode,
                trade_date,
                quantity,
                lev,
                exposure,
                capital_used,
                pnl,
                outcome,
                "CLOSED"
            ]
        );

        const trade_id = tradeResult.insertId;

        // 2️⃣ Insert entry_details
        await connection.query(
            `INSERT INTO entry_details
            (trade_id, entry_price, quantity, stop_loss, target_price, confidence_level, entry_emotion)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                trade_id,
                entry_price,
                quantity,
                stop_loss,
                target_price,
                confidence_level,
                entry_emotion
            ]
        );

        // 3️⃣ Insert pre_trade_context
        if (pre_trade) {
            await connection.query(
                `INSERT INTO pre_trade_context
                (trade_id, market_trend, volatility, index_mood)
                VALUES (?, ?, ?, ?)`,
                [
                    trade_id,
                    pre_trade.market_trend,
                    pre_trade.volatility,
                    pre_trade.index_mood
                ]
            );
        }

        // 4️⃣ Insert holding_phase
        if (holding) {
            await connection.query(
                `INSERT INTO holding_phase
                (trade_id, notes, discipline_followed)
                VALUES (?, ?, ?)`,
                [
                    trade_id,
                    holding.notes,
                    holding.discipline_followed
                ]
            );
        }

        // 5️⃣ Insert exit_details
        await connection.query(
            `INSERT INTO exit_details
            (trade_id, exit_price, exit_date, exit_reason, exit_emotion)
            VALUES (?, ?, ?, ?, ?)`,
            [
                trade_id,
                exit_price,
                exit_date,
                exit_reason,
                exit_emotion
            ]
        );

        // 6️⃣ Insert reflection_notes
        if (reflection) {
            await connection.query(
                `INSERT INTO reflection_notes
                (trade_id, lessons_learned, improvement_notes)
                VALUES (?, ?, ?)`,
                [
                    trade_id,
                    reflection.lessons_learned,
                    reflection.improvement_notes
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: "Full trade journal created successfully",
            trade_id,
            exposure,
            capital_used,
            pnl,
            outcome
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);

        res.status(500).json({
            message: "Create full journal error",
            error: error.message
        });

    } finally {
        connection.release();
    }
};


// ✅ CLOSE TRADE
export const closeTrade = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { trade_id } = req.params;

        const { exit, holding, reflection } = req.body;

        if (!exit?.exit_price || !exit?.exit_date) {
            return res.status(400).json({ message: "Exit details required" });
        }

        // 1️⃣ Get trade + entry details
        const [[trade]] = await connection.query(
            `SELECT t.trade_type, t.capital_used, e.entry_price, e.quantity
             FROM trades t
             JOIN entry_details e ON t.trade_id = e.trade_id
             WHERE t.trade_id = ? AND t.status = 'OPEN'`,
            [trade_id]
        );

        if (!trade) {
            return res.status(404).json({ message: "Open trade not found" });
        }

        const { trade_type, capital_used, entry_price, quantity } = trade;

        // 2️⃣ Calculate PnL
        let pnl = 0;

        if (trade_type === "LONG") {
            pnl = (exit.exit_price - entry_price) * quantity;
        } else {
            pnl = (entry_price - exit.exit_price) * quantity;
        }

        pnl = Number(pnl.toFixed(2));

        let outcome = "BREAKEVEN";
        if (pnl > 0) outcome = "WIN";
        if (pnl < 0) outcome = "LOSS";

        // 3️⃣ Insert exit details
        await connection.query(
            `INSERT INTO exit_details
            (trade_id, exit_price, exit_date, exit_reason, exit_emotion)
            VALUES (?, ?, ?, ?, ?)`,
            [
                trade_id,
                exit.exit_price,
                exit.exit_date,
                exit.exit_reason,
                exit.exit_emotion
            ]
        );

        // 4️⃣ Insert holding phase (optional update)
        if (holding) {
            await connection.query(
                `UPDATE holding_phase
                 SET notes = ?, discipline_followed = ?
                 WHERE trade_id = ?`,
                [
                    holding.notes,
                    holding.discipline_followed,
                    trade_id
                ]
            );
        }

        // 5️⃣ Insert reflection
        if (reflection) {
            await connection.query(
                `INSERT INTO reflection_notes
                (trade_id, lessons_learned, improvement_notes)
                VALUES (?, ?, ?)`,
                [
                    trade_id,
                    reflection.lessons_learned,
                    reflection.improvement_notes
                ]
            );
        }

        // 6️⃣ Update trade
        await connection.query(
            `UPDATE trades
             SET total_pnl = ?, outcome = ?, status = 'CLOSED'
             WHERE trade_id = ?`,
            [pnl, outcome, trade_id]
        );

        // 7️⃣ Update capital summary
        await connection.query(
            `UPDATE capital_summary
             SET total_pnl = total_pnl + ?,
                 total_capital = total_capital + ?,
                 deployed_capital = deployed_capital - ?
             WHERE capital_id = 1`,
            [pnl, pnl, capital_used]
        );

        await connection.commit();

        res.json({
            message: "Trade closed successfully",
            trade_id,
            pnl,
            outcome
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);

        res.status(500).json({
            message: "Close trade error",
            error: error.message
        });
    } finally {
        connection.release();
    }
};


// ✅ GET ALL TRADES
export const getAllTrades = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            trade_mode,
            trade_type,
            sort = "trade_date",
            order = "DESC"
        } = req.query;

        const offset = (page - 1) * limit;

        let filters = [];
        let values = [];

        if (status) {
            filters.push("status = ?");
            values.push(status);
        }

        if (trade_mode) {
            filters.push("trade_mode = ?");
            values.push(trade_mode);
        }

        if (trade_type) {
            filters.push("trade_type = ?");
            values.push(trade_type);
        }

        const whereClause = filters.length
            ? `WHERE ${filters.join(" AND ")}`
            : "";

        const [rows] = await db.query(
            `SELECT *
             FROM trades
             ${whereClause}
             ORDER BY ${sort} ${order}
             LIMIT ? OFFSET ?`,
            [...values, Number(limit), Number(offset)]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM trades ${whereClause}`,
            values
        );

        res.json({
            total,
            page: Number(page),
            limit: Number(limit),
            trades: rows
        });

    } catch (error) {
        res.status(500).json({
            message: "Get trades error",
            error: error.message
        });
    }
};


// ✅ GET TRADE BY ID
export const getTradeById = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const [[trade]] = await db.query(
            `SELECT * FROM trades WHERE trade_id = ?`,
            [trade_id]
        );

        if (!trade) {
            return res.status(404).json({ message: "Trade not found" });
        }

        const [[entry]] = await db.query(
            `SELECT * FROM entry_details WHERE trade_id = ?`,
            [trade_id]
        );

        const [[pre_trade]] = await db.query(
            `SELECT * FROM pre_trade_context WHERE trade_id = ?`,
            [trade_id]
        );

        const [[holding]] = await db.query(
            `SELECT * FROM holding_phase WHERE trade_id = ?`,
            [trade_id]
        );

        const [[exit]] = await db.query(
            `SELECT * FROM exit_details WHERE trade_id = ?`,
            [trade_id]
        );

        const [[reflection]] = await db.query(
            `SELECT * FROM reflection_notes WHERE trade_id = ?`,
            [trade_id]
        );

        res.json({
            trade,
            pre_trade,
            entry,
            holding,
            exit,
            reflection
        });

    } catch (error) {
        res.status(500).json({
            message: "Get trade error",
            error: error.message
        });
    }
};


// ✅ GET TRADE ANALYTICS   
export const getTradeAnalytics = async (req, res) => {
    try {
        const [[stats]] = await db.query(`
            SELECT
                COUNT(*) as total_trades,
                SUM(CASE WHEN outcome='WIN' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN outcome='LOSS' THEN 1 ELSE 0 END) as losses,
                SUM(total_pnl) as total_pnl,
                AVG(total_pnl) as avg_pnl,
                MAX(total_pnl) as best_trade,
                MIN(total_pnl) as worst_trade
            FROM trades
            WHERE status='CLOSED'
        `);

        const winRate =
            stats.total_trades > 0
                ? ((stats.wins / stats.total_trades) * 100).toFixed(2)
                : 0;

        res.json({
            ...stats,
            win_rate: winRate
        });

    } catch (error) {
        res.status(500).json({
            message: "Analytics error",
            error: error.message
        });
    }
};


// ✅ GET TRADE RISK METRICS
export const getRiskMetrics = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                t.trade_id,
                e.entry_price,
                e.stop_loss,
                ex.exit_price,
                t.quantity,
                t.capital_used,
                t.total_pnl
            FROM trades t
            JOIN entry_details e ON t.trade_id = e.trade_id
            JOIN exit_details ex ON t.trade_id = ex.trade_id
            WHERE t.status='CLOSED'
        `);

        const metrics = rows.map(trade => {
            const risk = Math.abs(trade.entry_price - trade.stop_loss) * trade.quantity;
            const reward = trade.total_pnl;
            const rr_ratio = risk ? (reward / risk).toFixed(2) : null;
            const return_pct = trade.capital_used
                ? ((trade.total_pnl / trade.capital_used) * 100).toFixed(2)
                : null;

            return {
                trade_id: trade.trade_id,
                rr_ratio,
                return_pct
            };
        });

        res.json(metrics);

    } catch (error) {
        res.status(500).json({
            message: "Risk metrics error",
            error: error.message
        });
    }
};
