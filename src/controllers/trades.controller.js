import db from '../config/db.js';

// 🔹 OPEN TRADE
export const openTrade = async (req, res) => {
    try {
        const {
            stock_name,
            trade_type,
            mode,
            leverage,
            entry_price,
            quantity,
            target,
            stop_loss,
            strategy,
            conviction_level,
            entry_nifty_mood,
            entry_notes
        } = req.body;

        // Basic validation
        if (!stock_name || !trade_type || !mode || !entry_price || !quantity) {
            return res.status(400).json({
                message: "Required fields missing"
            });
        }

        const lev = leverage || 1;

        const [result] = await db.query(
            `INSERT INTO trades (
                stock_name,
                trade_type,
                mode,
                leverage,
                entry_price,
                quantity,
                target,
                stop_loss,
                strategy,
                conviction_level,
                entry_nifty_mood,
                entry_notes,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
            [
                stock_name,
                trade_type,
                mode,
                lev,
                entry_price,
                quantity,
                target,
                stop_loss,
                strategy,
                conviction_level,
                entry_nifty_mood,
                entry_notes
            ]
        );

        res.status(201).json({
            message: "Trade opened successfully",
            trade_id: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Open trade error",
            error: error.message
        });
    }
};

// 🔹 ADD NOTE TO TRADE
export const addTradeNote = async (req, res) => {
    try {
        const { trade_id } = req.params;
        const { note_text } = req.body;

        if (!note_text) {
            return res.status(400).json({
                message: "Note text is required"
            });
        }

        // Check if trade exists & is OPEN
        const [[trade]] = await db.query(
            `SELECT status FROM trades 
             WHERE trade_id = ? AND is_deleted = FALSE`,
            [trade_id]
        );

        if (!trade) {
            return res.status(404).json({
                message: "Trade not found"
            });
        }

        if (trade.status !== 'OPEN') {
            return res.status(400).json({
                message: "Cannot add note to closed trade"
            });
        }

        await db.query(
            `INSERT INTO trade_notes (trade_id, note_text)
             VALUES (?, ?)`,
            [trade_id, note_text]
        );

        res.json({
            message: "Note added successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Add note error",
            error: error.message
        });
    }
};

// 🔹 EXIT TRADE
export const exitTrade = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const {
            exit_price,
            exit_nifty_mood,
            exit_reason,
            exit_emotion,
            conclusion
        } = req.body;

        if (!exit_price) {
            return res.status(400).json({
                message: "Exit price required"
            });
        }

        // Fetch trade
        const [[trade]] = await db.query(
            `SELECT trade_type, entry_price, quantity, status
             FROM trades
             WHERE trade_id = ? AND is_deleted = FALSE`,
            [trade_id]
        );

        if (!trade) {
            return res.status(404).json({
                message: "Trade not found"
            });
        }

        if (trade.status !== 'OPEN') {
            return res.status(400).json({
                message: "Trade already closed"
            });
        }

        const { trade_type, entry_price, quantity } = trade;

        let pnl = 0;

        if (trade_type === 'LONG') {
            pnl = (exit_price - entry_price) * quantity;
        } else {
            pnl = (entry_price - exit_price) * quantity;
        }

        pnl = Number(pnl.toFixed(2));

        await db.query(
            `UPDATE trades
             SET exit_price = ?,
                 exit_nifty_mood = ?,
                 exit_reason = ?,
                 exit_emotion = ?,
                 conclusion = ?,
                 total_pnl = ?,
                 status = 'CLOSED',
                 closed_at = NOW()
             WHERE trade_id = ?`,
            [
                exit_price,
                exit_nifty_mood,
                exit_reason,
                exit_emotion,
                conclusion,
                pnl,
                trade_id
            ]
        );

        res.json({
            message: "Trade closed successfully",
            total_pnl: pnl
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Exit trade error",
            error: error.message
        });
    }
};