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

// 🔹 GET ALL TRADES
export const getAllTrades = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            sort = "created_at",
            order = "DESC"
        } = req.query;

        const offset = (page - 1) * limit;

        let where = "WHERE is_deleted = FALSE";
        let values = [];

        if (status) {
            where += " AND status = ?";
            values.push(status);
        }

        const [rows] = await db.query(
            `SELECT 
                trade_id,
                stock_name,
                trade_type,
                mode,
                entry_price,
                quantity,
                total_pnl,
                status,
                created_at,
                closed_at
             FROM trades
             ${where}
             ORDER BY ${sort} ${order}
             LIMIT ? OFFSET ?`,
            [...values, Number(limit), Number(offset)]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total
             FROM trades
             ${where}`,
            values
        );

        res.json({
            total,
            page: Number(page),
            limit: Number(limit),
            trades: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Get trades error",
            error: error.message
        });
    }
};

// 🔹 GET TRADE BY ID (WITH NOTES)
export const getTradeById = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const [[trade]] = await db.query(
            `SELECT * FROM trades
             WHERE trade_id = ? AND is_deleted = FALSE`,
            [trade_id]
        );

        if (!trade) {
            return res.status(404).json({
                message: "Trade not found"
            });
        }

        const [notes] = await db.query(
            `SELECT note_id, note_text, created_at
             FROM trade_notes
             WHERE trade_id = ?
             ORDER BY created_at ASC`,
            [trade_id]
        );

        res.json({
            trade,
            notes
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Get trade error",
            error: error.message
        });
    }
};

// 🔹 UPDATE TRADE (ONLY IF OPEN)
export const updateTrade = async (req, res) => {
    try {
        const { trade_id } = req.params;
        const updates = req.body;

        // Check trade exists
        const [[trade]] = await db.query(
            `SELECT status FROM trades
             WHERE trade_id = ? AND is_deleted = FALSE`,
            [trade_id]
        );

        if (!trade) {
            return res.status(404).json({ message: "Trade not found" });
        }

        if (trade.status !== 'OPEN') {
            return res.status(400).json({
                message: "Cannot edit a closed trade"
            });
        }

        const allowedFields = [
            "stock_name",
            "trade_type",
            "mode",
            "leverage",
            "entry_price",
            "quantity",
            "target",
            "stop_loss",
            "strategy",
            "conviction_level",
            "entry_nifty_mood",
            "entry_notes"
        ];

        const fields = [];
        const values = [];

        for (let key of allowedFields) {
            if (updates[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({
                message: "No valid fields provided"
            });
        }

        await db.query(
            `UPDATE trades
             SET ${fields.join(", ")}
             WHERE trade_id = ?`,
            [...values, trade_id]
        );

        res.json({ message: "Trade updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Update trade error",
            error: error.message
        });
    }
};

// 🔹 DELETE TRADE (SOFT)
export const deleteTrade = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const [result] = await db.query(
            `UPDATE trades
             SET is_deleted = TRUE,
                 deleted_at = NOW()
             WHERE trade_id = ? AND is_deleted = FALSE`,
            [trade_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Trade not found"
            });
        }

        res.json({ message: "Trade deleted successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Delete trade error",
            error: error.message
        });
    }
};

// 🔹 GET DELETED TRADES
export const getDeletedTrades = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT trade_id,
                    stock_name,
                    status,
                    total_pnl,
                    deleted_at
             FROM trades
             WHERE is_deleted = TRUE
             ORDER BY deleted_at DESC`
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Fetch deleted trades error",
            error: error.message
        });
    }
};

// 🔹 RESTORE TRADE
export const restoreTrade = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const [result] = await db.query(
            `UPDATE trades
             SET is_deleted = FALSE,
                 deleted_at = NULL
             WHERE trade_id = ? AND is_deleted = TRUE`,
            [trade_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Deleted trade not found"
            });
        }

        res.json({ message: "Trade restored successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Restore trade error",
            error: error.message
        });
    }
};