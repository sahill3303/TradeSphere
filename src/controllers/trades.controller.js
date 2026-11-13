import db from '../config/db.js';

// Helper to validate date has a valid 4-digit year between 2000 and 2099
function isValidYear(dateStr) {
    if (!dateStr) return true;
    const str = String(dateStr).trim();
    const match = str.match(/^(\d+)-(\d{2})-(\d{2})/);
    if (!match) return false;
    const yearStr = match[1];
    if (yearStr.length !== 4) return false;
    const year = parseInt(yearStr, 10);
    return year >= 2000 && year <= 2099;
}

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
            entry_notes,
            trade_date,
            client_ids
        } = req.body;

        // Basic validation
        if (!stock_name || !trade_type || !mode || !entry_price || !quantity || !client_ids || client_ids.length === 0) {
            return res.status(400).json({
                message: "Required fields missing"
            });
        }

        if (trade_date && !isValidYear(trade_date)) {
            return res.status(400).json({
                message: "Invalid trade date. Year must be between 2000 and 2099."
            });
        }

        const adminId = req.user.id;
        const lev = leverage || 1;

        const [result] = await db.query(
            `INSERT INTO trades (
                stock_name, trade_type, mode, leverage, entry_price,
                quantity, target, stop_loss, strategy, conviction_level,
                entry_nifty_mood, entry_notes, trade_date, status, admin_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
            [
                stock_name, trade_type, mode, lev, entry_price,
                quantity, target, stop_loss, strategy, conviction_level,
                entry_nifty_mood, entry_notes, trade_date || null, adminId
            ]
        );

        const trade_id = result.insertId;

        // Map and insert clients
        if (client_ids && client_ids.length > 0) {
            const values = client_ids.map(cid => [trade_id, cid]);
            await db.query(`INSERT INTO trade_clients (trade_id, client_id) VALUES ?`, [values]);
        }

        res.status(201).json({
            message: "Trade opened successfully",
            trade_id
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

        // Check if trade exists (scoped to admin)
        const [[trade]] = await db.query(
            `SELECT status FROM trades 
             WHERE trade_id = ? AND admin_id = ? AND is_deleted = FALSE`,
            [trade_id, req.user.id]
        );

        if (!trade) {
            return res.status(404).json({
                message: "Trade not found"
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
            conclusion,
            exit_notes,
            exit_date,
            quantity: exitQuantity
        } = req.body;

        if (!exit_price) {
            return res.status(400).json({
                message: "Exit price required"
            });
        }

        if (exit_date && !isValidYear(exit_date)) {
            return res.status(400).json({
                message: "Invalid exit date. Year must be between 2000 and 2099."
            });
        }

        // Fetch trade (scoped to admin)
        const [[trade]] = await db.query(
            `SELECT *
             FROM trades
             WHERE trade_id = ? AND admin_id = ? AND is_deleted = FALSE`,
            [trade_id, req.user.id]
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

        const finalQuantity = exitQuantity ? Number(exitQuantity) : trade.quantity;

        if (isNaN(finalQuantity) || finalQuantity <= 0 || finalQuantity > trade.quantity) {
            return res.status(400).json({
                message: `Exit quantity must be between 1 and ${trade.quantity}`
            });
        }

        const { trade_type, entry_price } = trade;
        let pnl = 0;

        if (trade_type === 'LONG') {
            pnl = (Number(exit_price) - Number(entry_price)) * finalQuantity;
        } else {
            pnl = (Number(entry_price) - Number(exit_price)) * finalQuantity;
        }

        pnl = Number(pnl.toFixed(2));

        const finalNotes = exit_notes || conclusion || null;
        const actualExitDate = exit_date || new Date().toISOString().split('T')[0];

        const isPartial = finalQuantity < trade.quantity;
        const effectiveExitReason = isPartial 
            ? (exit_reason || 'PARTIAL_PROFIT') 
            : (exit_reason || null);

        if (isPartial) {
            const remainingQuantity = trade.quantity - finalQuantity;

            // 1. Create a new CLOSED trade record for the exited portion
            const [insertResult] = await db.query(
                `INSERT INTO trades (
                    stock_name, trade_type, mode, leverage, entry_price,
                    quantity, target, stop_loss, strategy, conviction_level,
                    entry_nifty_mood, entry_notes, trade_date, status,
                    exit_price, exit_nifty_mood, exit_reason, exit_emotion,
                    conclusion, exit_notes, total_pnl, exit_date, closed_at,
                    admin_id, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLOSED', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
                [
                    trade.stock_name,
                    trade.trade_type,
                    trade.mode,
                    trade.leverage || 1,
                    trade.entry_price,
                    finalQuantity,
                    trade.target,
                    trade.stop_loss,
                    trade.strategy,
                    trade.conviction_level,
                    trade.entry_nifty_mood,
                    trade.entry_notes,
                    trade.trade_date,
                    exit_price,
                    exit_nifty_mood || null,
                    effectiveExitReason,
                    exit_emotion || null,
                    finalNotes,
                    finalNotes,
                    pnl,
                    actualExitDate,
                    req.user.id,
                    trade.created_at || new Date()
                ]
            );

            const newClosedTradeId = insertResult.insertId;

            // Copy client mappings
            const [clients] = await db.query(
                `SELECT client_id FROM trade_clients WHERE trade_id = ?`,
                [trade_id]
            );
            if (clients.length > 0) {
                const clientValues = clients.map(c => [newClosedTradeId, c.client_id]);
                await db.query(`INSERT INTO trade_clients (trade_id, client_id) VALUES ?`, [clientValues]);
            }

            // Copy trade list mappings
            const [lists] = await db.query(
                `SELECT list_id FROM trade_list_items WHERE trade_id = ?`,
                [trade_id]
            );
            if (lists.length > 0) {
                const listValues = lists.map(l => [l.list_id, newClosedTradeId]);
                await db.query(`INSERT INTO trade_list_items (list_id, trade_id) VALUES ?`, [listValues]);
            }

            // Copy existing trade notes
            const [notes] = await db.query(
                `SELECT note_text, created_at FROM trade_notes WHERE trade_id = ?`,
                [trade_id]
            );
            if (notes.length > 0) {
                const noteValues = notes.map(n => [newClosedTradeId, n.note_text, n.created_at]);
                await db.query(`INSERT INTO trade_notes (trade_id, note_text, created_at) VALUES ?`, [noteValues]);
            }

            // Add note on closed trade record
            const closedPartialNote = `⚡ Partial Exit Booked: ${finalQuantity} qty @ ₹${Number(exit_price).toFixed(2)} (${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString('en-IN')}). Reason: ${effectiveExitReason}.${finalNotes ? ` Notes: "${finalNotes}"` : ''} (Original position was ${trade.quantity} qty)`;
            await db.query(
                `INSERT INTO trade_notes (trade_id, note_text)
                 VALUES (?, ?)`,
                [newClosedTradeId, closedPartialNote]
            );

            // 2. Keep the original trade OPEN with the remaining quantity
            await db.query(
                `UPDATE trades
                 SET quantity = ?
                 WHERE trade_id = ? AND admin_id = ?`,
                [remainingQuantity, trade_id, req.user.id]
            );

            // Add note on open trade record
            const openPartialNote = `⚡ Partial Profit/Loss Booked: Sold ${finalQuantity} qty @ ₹${Number(exit_price).toFixed(2)} (${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString('en-IN')}). ${remainingQuantity} qty remaining in position. Reason: ${effectiveExitReason}.${finalNotes ? ` Notes: "${finalNotes}"` : ''}`;
            await db.query(
                `INSERT INTO trade_notes (trade_id, note_text)
                 VALUES (?, ?)`,
                [trade_id, openPartialNote]
            );

            return res.json({
                message: `Partially exited ${finalQuantity} qty. ${remainingQuantity} qty remaining.`,
                is_partial: true,
                exited_trade_id: newClosedTradeId,
                remaining_quantity: remainingQuantity,
                exited_quantity: finalQuantity,
                total_pnl: pnl
            });
        }

        // Full exit: close original trade
        await db.query(
            `UPDATE trades
             SET exit_price = ?,
                 exit_nifty_mood = ?,
                 exit_reason = ?,
                 exit_emotion = ?,
                 conclusion = ?,
                 exit_notes = ?,
                 total_pnl = ?,
                 exit_date = ?,
                 quantity = ?,
                 status = 'CLOSED',
                 closed_at = NOW()
             WHERE trade_id = ? AND admin_id = ?`,
            [
                exit_price,
                exit_nifty_mood || null,
                exit_reason || null,
                exit_emotion || null,
                finalNotes,
                finalNotes,
                pnl,
                actualExitDate,
                finalQuantity,
                trade_id,
                req.user.id
            ]
        );

        res.json({
            message: "Trade closed successfully",
            is_partial: false,
            total_pnl: pnl,
            quantity: finalQuantity
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
            limit = 200,
            status,
            mode,
            sort = "created_at",
            order = "DESC"
        } = req.query;

        const offset = (page - 1) * limit;

        let where = "WHERE t.is_deleted = FALSE AND t.admin_id = ?";
        let values = [req.user.id];

        if (status) {
            where += " AND t.status = ?";
            values.push(status);
        }

        if (mode) {
            const cleanMode = String(mode).trim().toUpperCase();
            if (cleanMode.replace(/\s+/g, '') === 'LONGTERM') {
                where += " AND (UPPER(t.mode) = 'LONG TERM' OR UPPER(t.mode) = 'LONGTERM')";
            } else {
                where += " AND UPPER(t.mode) = ?";
                values.push(cleanMode);
            }
        }

        const allowedSort = ['created_at', 'trade_date', 'stock_name', 'mode', 'status', 'total_pnl', 'entry_price', 'quantity'];
        const sortCol = allowedSort.includes(sort) ? sort : 'created_at';
        const orderDir = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const [rows] = await db.query(
            `SELECT 
                trade_id, stock_name, trade_type, mode, entry_price,
                quantity, target, stop_loss, total_pnl, status, created_at, closed_at, leverage, trade_date,
                strategy, conviction_level, entry_nifty_mood, entry_notes, exit_price, exit_date, exit_reason, exit_notes, conclusion
             FROM trades t
             ${where}
             ORDER BY t.${sortCol} ${orderDir}
             LIMIT ? OFFSET ?`,
            [...values, Number(limit), Number(offset)]
        );

        // Attach list tags to trades
        if (rows.length > 0) {
            const tradeIds = rows.map(r => r.trade_id);
            const [itemRows] = await db.query(`
                SELECT tli.trade_id, tl.list_id, tl.name, tl.color
                FROM trade_list_items tli
                JOIN trade_lists tl ON tli.list_id = tl.list_id
                WHERE tli.trade_id IN (?)
            `, [tradeIds]);

            const listMap = {};
            for (const item of itemRows) {
                if (!listMap[item.trade_id]) listMap[item.trade_id] = [];
                listMap[item.trade_id].push({ list_id: item.list_id, name: item.name, color: item.color });
            }

            for (const r of rows) {
                r.lists = listMap[r.trade_id] || [];
            }
        }

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM trades t ${where}`,
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

// 🔹 GET TRADE BY ID (WITH NOTES, CLIENTS & LISTS)
export const getTradeById = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const [[trade]] = await db.query(
            `SELECT * FROM trades
             WHERE trade_id = ? AND admin_id = ? AND is_deleted = FALSE`,
            [trade_id, req.user.id]
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

        const [clients] = await db.query(
            `SELECT c.client_id, c.name 
             FROM trade_clients tc
             JOIN clients c ON tc.client_id = c.client_id
             WHERE tc.trade_id = ?`,
            [trade_id]
        );

        const [lists] = await db.query(
            `SELECT tl.list_id, tl.name, tl.color
             FROM trade_list_items tli
             JOIN trade_lists tl ON tli.list_id = tl.list_id
             WHERE tli.trade_id = ?`,
            [trade_id]
        );

        res.json({
            trade,
            notes,
            clients,
            lists
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Get trade error",
            error: error.message
        });
    }
};

// 🔹 UPDATE TRADE (EVERYTHING EDITABLE)
export const updateTrade = async (req, res) => {
    try {
        const { trade_id } = req.params;
        const updates = req.body;

        // Check trade exists
        const [[trade]] = await db.query(
            `SELECT * FROM trades
             WHERE trade_id = ? AND admin_id = ? AND is_deleted = FALSE`,
            [trade_id, req.user.id]
        );

        if (!trade) {
            return res.status(404).json({ message: "Trade not found" });
        }

        if (updates.trade_date && !isValidYear(updates.trade_date)) {
            return res.status(400).json({ message: "Invalid trade date. Year must be between 2000 and 2099." });
        }

        if (updates.exit_date && !isValidYear(updates.exit_date)) {
            return res.status(400).json({ message: "Invalid exit date. Year must be between 2000 and 2099." });
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
            "entry_notes",
            "trade_date",
            "status",
            "exit_price",
            "exit_nifty_mood",
            "exit_reason",
            "exit_emotion",
            "conclusion",
            "exit_notes",
            "exit_date"
        ];

        const fields = [];
        const values = [];

        // Track changes for PNL recalculation
        let needsPnlRecalc = false;
        let newEntryPrice = trade.entry_price;
        let newQuantity = trade.quantity;
        let newExitPrice = trade.exit_price;
        let newTradeType = trade.trade_type;

        for (let key of allowedFields) {
            if (updates[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
                
                if (key === 'entry_price') newEntryPrice = updates[key];
                if (key === 'quantity') newQuantity = updates[key];
                if (key === 'exit_price') newExitPrice = updates[key];
                if (key === 'trade_type') newTradeType = updates[key];
                if (['entry_price', 'quantity', 'exit_price', 'trade_type'].includes(key)) {
                    needsPnlRecalc = true;
                }
            }
        }

        // Keep exit_notes and conclusion in sync if one is provided
        if (updates.exit_notes !== undefined && updates.conclusion === undefined) {
            fields.push("conclusion = ?");
            values.push(updates.exit_notes);
        } else if (updates.conclusion !== undefined && updates.exit_notes === undefined) {
            fields.push("exit_notes = ?");
            values.push(updates.conclusion);
        }

        // Recalculate P&L if closed and relevant fields changed
        const currentStatus = updates.status !== undefined ? updates.status : trade.status;
        if (currentStatus === 'CLOSED' && needsPnlRecalc && newExitPrice) {
            let pnl = 0;
            if (newTradeType === 'LONG') {
                pnl = (Number(newExitPrice) - Number(newEntryPrice)) * Number(newQuantity);
            } else {
                pnl = (Number(newEntryPrice) - Number(newExitPrice)) * Number(newQuantity);
            }
            pnl = Number(pnl.toFixed(2));
            fields.push("total_pnl = ?");
            values.push(pnl);
        }

        if (fields.length > 0) {
            await db.query(
                `UPDATE trades
                 SET ${fields.join(", ")}
                 WHERE trade_id = ? AND admin_id = ?`,
                [...values, trade_id, req.user.id]
            );
        }

        // Update clients if provided
        if (updates.client_ids && Array.isArray(updates.client_ids)) {
            await db.query(`DELETE FROM trade_clients WHERE trade_id = ?`, [trade_id]);
            if (updates.client_ids.length > 0) {
                const clientValues = updates.client_ids.map(cid => [trade_id, cid]);
                await db.query(`INSERT INTO trade_clients (trade_id, client_id) VALUES ?`, [clientValues]);
            }
        }

        res.json({ message: "Trade updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Update trade error",
            error: error.message
        });
    }
};

// 🔹 DELETE TRADE (soft delete)
export const deleteTrade = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const [result] = await db.query(
            `UPDATE trades SET is_deleted = TRUE, deleted_at = NOW()
             WHERE trade_id = ? AND admin_id = ? AND is_deleted = FALSE`,
            [trade_id, req.user.id]
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
            `SELECT trade_id, stock_name, status, total_pnl, deleted_at
             FROM trades
             WHERE is_deleted = TRUE AND admin_id = ?
             ORDER BY deleted_at DESC`,
            [req.user.id]
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

export const restoreTrade = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const [result] = await db.query(
            `UPDATE trades SET is_deleted = FALSE, deleted_at = NULL
             WHERE trade_id = ? AND admin_id = ? AND is_deleted = TRUE`,
            [trade_id, req.user.id]
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

// 🔹 HARD DELETE TRADE (permanent — only soft-deleted trades)
export const hardDeleteTrade = async (req, res) => {
    try {
        const { trade_id } = req.params;

        const [[trade]] = await db.query(
            `SELECT trade_id FROM trades WHERE trade_id = ? AND admin_id = ? AND is_deleted = TRUE`,
            [trade_id, req.user.id]
        );

        if (!trade) {
            return res.status(404).json({ message: "Deleted trade not found" });
        }

        // Delete child rows first (FK constraints)
        await db.query(`DELETE FROM trade_notes WHERE trade_id = ?`, [trade_id]);
        await db.query(`DELETE FROM trade_list_items WHERE trade_id = ?`, [trade_id]);
        await db.query(`DELETE FROM trade_clients WHERE trade_id = ?`, [trade_id]);

        // Now permanently delete the trade
        await db.query(`DELETE FROM trades WHERE trade_id = ?`, [trade_id]);

        res.json({ message: "Trade permanently deleted" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Hard delete trade error", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 TRADE LISTS (TAGS) CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

// 🔹 TRADE LISTS (TAGS)
export const getTradeLists = async (req, res) => {
    try {
        const adminId = req.user.id;
        const type = req.query.type ? String(req.query.type).trim().toUpperCase() : null;

        let typeCondition = '';
        const params = [adminId, adminId];
        if (type) {
            typeCondition = 'AND (l.type = ? OR (l.type IS NULL AND ? = "TRADES"))';
            params.push(type, type);
        }

        const [lists] = await db.query(`
            SELECT 
                l.list_id,
                l.name,
                l.description,
                l.color,
                COALESCE(l.type, 'TRADES') AS type,
                l.created_at,
                COUNT(DISTINCT t.trade_id) AS trade_count,
                SUM(CASE WHEN t.status = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
                SUM(CASE WHEN t.status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_count,
                COALESCE(SUM(t.entry_price * t.quantity), 0) AS total_capital,
                COALESCE(SUM(t.total_pnl), 0) AS total_pnl,
                SUM(CASE WHEN t.status = 'CLOSED' AND t.total_pnl > 0 THEN 1 ELSE 0 END) AS win_count,
                COALESCE(GROUP_CONCAT(DISTINCT t.trade_id), '') AS trade_ids_str
            FROM trade_lists l
            LEFT JOIN trade_list_items li ON l.list_id = li.list_id
            LEFT JOIN trades t ON li.trade_id = t.trade_id AND t.is_deleted = FALSE AND t.admin_id = ?
            WHERE l.admin_id = ? ${typeCondition}
            GROUP BY l.list_id
            ORDER BY l.created_at DESC
        `, params);

        const mappedLists = lists.map(l => ({
            ...l,
            trade_ids: l.trade_ids_str ? l.trade_ids_str.split(',').map(Number) : []
        }));

        res.json({ success: true, lists: mappedLists });
    } catch (err) {
        console.error('getTradeLists error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch trade lists', error: err.message });
    }
};

// CREATE NEW TRADE LIST
export const createTradeList = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { name, description, color, type } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'List name is required' });
        }

        const listType = (type || 'TRADES').trim().toUpperCase();

        const [result] = await db.query(
            `INSERT INTO trade_lists (admin_id, name, description, color, type) VALUES (?, ?, ?, ?, ?)`,
            [adminId, name.trim(), description ? description.trim() : null, color || '#d4af37', listType]
        );

        res.status(201).json({
            success: true,
            message: 'Trade list created successfully',
            list: {
                list_id: result.insertId,
                name: name.trim(),
                description: description ? description.trim() : null,
                color: color || '#d4af37',
                type: listType
            }
        });
    } catch (err) {
        console.error('createTradeList error:', err);
        res.status(500).json({ success: false, message: 'Failed to create trade list', error: err.message });
    }
};

// DELETE TRADE LIST
export const deleteTradeList = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { list_id } = req.params;

        // 1. Delete associated trade_list_items first so foreign key constraints never block deletion
        await db.query(
            `DELETE FROM trade_list_items WHERE list_id = ?`,
            [list_id]
        );

        // 2. Delete the list record
        const [result] = await db.query(
            `DELETE FROM trade_lists WHERE list_id = ? AND admin_id = ?`,
            [list_id, adminId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'List not found' });
        }

        res.json({ success: true, message: 'List deleted successfully' });
    } catch (err) {
        console.error('deleteTradeList error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete trade list', error: err.message });
    }
};

// ADD TRADES TO LIST (Enforces: each trade belongs to at most ONE list)
export const addTradesToList = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { list_id } = req.params;
        const { trade_ids } = req.body;

        if (!Array.isArray(trade_ids) || trade_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one trade ID is required' });
        }

        // Verify list exists for this admin
        const [[list]] = await db.query(
            `SELECT list_id FROM trade_lists WHERE list_id = ? AND admin_id = ?`,
            [list_id, adminId]
        );
        if (!list) {
            return res.status(404).json({ success: false, message: 'List not found' });
        }

        // Remove these trades from any previous list so a trade can only belong to ONE list
        await db.query(
            `DELETE FROM trade_list_items WHERE trade_id IN (?)`,
            [trade_ids]
        );

        // Insert new association
        const values = trade_ids.map(tid => [list_id, tid]);
        await db.query(
            `INSERT IGNORE INTO trade_list_items (list_id, trade_id) VALUES ?`,
            [values]
        );

        res.json({ success: true, message: `Moved ${trade_ids.length} trade(s) to list` });
    } catch (err) {
        console.error('addTradesToList error:', err);
        res.status(500).json({ success: false, message: 'Failed to add trades to list', error: err.message });
    }
};

// REMOVE TRADES FROM LIST
export const removeTradesFromList = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { list_id } = req.params;
        const { trade_ids } = req.body;

        if (!Array.isArray(trade_ids) || trade_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one trade ID is required' });
        }

        const [[list]] = await db.query(
            `SELECT list_id FROM trade_lists WHERE list_id = ? AND admin_id = ?`,
            [list_id, adminId]
        );
        if (!list) {
            return res.status(404).json({ success: false, message: 'List not found' });
        }

        await db.query(
            `DELETE FROM trade_list_items WHERE list_id = ? AND trade_id IN (?)`,
            [list_id, trade_ids]
        );

        res.json({ success: true, message: 'Trade(s) removed from list' });
    } catch (err) {
        console.error('removeTradesFromList error:', err);
        res.status(500).json({ success: false, message: 'Failed to remove trades from list', error: err.message });
    }
};

// REMOVE SINGLE TRADE FROM ANY LIST
export const removeTradeFromAllLists = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { trade_id } = req.params;

        const [[trade]] = await db.query(
            `SELECT trade_id FROM trades WHERE trade_id = ? AND admin_id = ?`,
            [trade_id, adminId]
        );
        if (!trade) {
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        await db.query(`DELETE FROM trade_list_items WHERE trade_id = ?`, [trade_id]);
        res.json({ success: true, message: 'Trade removed from list' });
    } catch (err) {
        console.error('removeTradeFromAllLists error:', err);
        res.status(500).json({ success: false, message: 'Failed to remove trade from list', error: err.message });
    }
};

// 🔹 MOVE TRADE TO PORTFOLIO (Switch to LONG TERM conviction holding)
export const moveToPortfolio = async (req, res) => {
    try {
        const { trade_id } = req.params;
        const [result] = await db.query(
            `UPDATE trades 
             SET mode = 'LONG TERM', leverage = 1 
             WHERE trade_id = ? AND admin_id = ? AND is_deleted = FALSE`,
            [trade_id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Trade not found" });
        }

        res.json({ success: true, message: "Trade successfully moved to Long-Term Portfolio" });
    } catch (error) {
        console.error("Move to portfolio error:", error);
        res.status(500).json({ message: "Failed to move trade to portfolio", error: error.message });
    }
};

// 🔹 MOVE FROM PORTFOLIO TO ACTIVE TRADES (Switch back to SWING trading)
export const moveToTrades = async (req, res) => {
    try {
        const { trade_id } = req.params;
        const [result] = await db.query(
            `UPDATE trades 
             SET mode = 'SWING', leverage = 1 
             WHERE trade_id = ? AND admin_id = ? AND is_deleted = FALSE`,
            [trade_id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Holding not found" });
        }

        res.json({ success: true, message: "Holding successfully moved to Active Trades (Swing)" });
    } catch (error) {
        console.error("Move to trades error:", error);
        res.status(500).json({ message: "Failed to move holding to active trades", error: error.message });
    }
};

// 🔹 APPLY CORPORATE ACTION (STOCK SPLIT, BONUS ISSUE, REVERSE SPLIT, CUSTOM ADJUSTMENT)
export const applyCorporateAction = async (req, res) => {
    try {
        const { trade_id } = req.params;
        const adminId = req.user.id;
        const {
            action_type,      // 'STOCK_SPLIT' | 'BONUS_ISSUE' | 'REVERSE_SPLIT' | 'CUSTOM_ADJUSTMENT'
            ratio_from = 1,   // e.g. 1
            ratio_to = 1,     // e.g. 10
            adjust_target_sl = true,
            ex_date,
            notes,
            custom_quantity,
            custom_entry_price
        } = req.body;

        const [[trade]] = await db.query(
            `SELECT * FROM trades WHERE trade_id = ? AND admin_id = ? AND is_deleted = FALSE`,
            [trade_id, adminId]
        );

        if (!trade) {
            return res.status(404).json({ success: false, message: 'Position not found' });
        }

        const oldQty = Number(trade.quantity);
        const oldPrice = Number(trade.entry_price);
        const oldTarget = trade.target ? Number(trade.target) : null;
        const oldStopLoss = trade.stop_loss ? Number(trade.stop_loss) : null;
        const oldInvested = (oldPrice * oldQty) / (Number(trade.leverage) || 1);

        let newQty = oldQty;
        let newPrice = oldPrice;
        let newTarget = oldTarget;
        let newStopLoss = oldStopLoss;
        let multiplier = 1;
        let actionLabel = 'Corporate Action';
        let ratioStr = `${ratio_from}:${ratio_to}`;

        const numFrom = parseFloat(ratio_from) || 1;
        const numTo = parseFloat(ratio_to) || 1;

        if (action_type === 'STOCK_SPLIT') {
            // e.g. 1:10 split (1 old share becomes 10 new shares)
            multiplier = numTo / numFrom;
            if (multiplier <= 0 || isNaN(multiplier)) {
                return res.status(400).json({ success: false, message: 'Invalid split ratio' });
            }
            newQty = Math.round(oldQty * multiplier);
            newPrice = Number((oldPrice / multiplier).toFixed(4));
            actionLabel = `Stock Split (${ratio_from}:${ratio_to})`;
        } else if (action_type === 'BONUS_ISSUE') {
            // e.g. 1:1 bonus (1 bonus for every 1 held => multiplier = 2)
            // e.g. 2:1 bonus (2 bonus for every 1 held => multiplier = 3)
            multiplier = 1 + (numTo / numFrom);
            if (multiplier <= 0 || isNaN(multiplier)) {
                return res.status(400).json({ success: false, message: 'Invalid bonus ratio' });
            }
            newQty = Math.round(oldQty * multiplier);
            newPrice = Number((oldPrice / multiplier).toFixed(4));
            actionLabel = `Bonus Issue (${ratio_to}:${ratio_from})`;
        } else if (action_type === 'REVERSE_SPLIT') {
            // e.g. 10:1 consolidation (10 old shares become 1 new share)
            multiplier = numTo / numFrom;
            if (multiplier <= 0 || isNaN(multiplier)) {
                return res.status(400).json({ success: false, message: 'Invalid reverse split ratio' });
            }
            newQty = Math.max(1, Math.round(oldQty * multiplier));
            newPrice = Number((oldPrice / multiplier).toFixed(4));
            actionLabel = `Reverse Split / Consolidation (${ratio_from}:${ratio_to})`;
        } else if (action_type === 'CUSTOM_ADJUSTMENT') {
            if (custom_quantity && Number(custom_quantity) > 0) {
                newQty = Math.round(Number(custom_quantity));
            }
            if (custom_entry_price && Number(custom_entry_price) > 0) {
                newPrice = Number(Number(custom_entry_price).toFixed(4));
            }
            actionLabel = 'Custom Position Adjustment';
            ratioStr = 'Custom';
        } else {
            return res.status(400).json({ success: false, message: 'Unknown corporate action type' });
        }

        // Target and Stop Loss adjustments
        if (adjust_target_sl && multiplier !== 1) {
            if (newTarget !== null) newTarget = Number((newTarget / multiplier).toFixed(2));
            if (newStopLoss !== null) newStopLoss = Number((newStopLoss / multiplier).toFixed(2));
        }

        // Apply Update to trades table
        await db.query(
            `UPDATE trades 
             SET quantity = ?, entry_price = ?, target = ?, stop_loss = ?
             WHERE trade_id = ?`,
            [newQty, newPrice, newTarget, newStopLoss, trade_id]
        );

        // Proportionately update trade_clients if client accounts are assigned
        if (multiplier !== 1) {
            try {
                const [clients] = await db.query(
                    `SELECT client_id, quantity FROM trade_clients WHERE trade_id = ?`,
                    [trade_id]
                );
                for (const c of clients) {
                    if (c.quantity) {
                        const updatedClientQty = Math.round(Number(c.quantity) * multiplier);
                        await db.query(
                            `UPDATE trade_clients SET quantity = ? WHERE trade_id = ? AND client_id = ?`,
                            [updatedClientQty, trade_id, c.client_id]
                        );
                    }
                }
            } catch (err) {
                console.error("Non-fatal: client allocation update error:", err);
            }
        }

        // Insert Audit Journal Note
        const dateStr = ex_date || new Date().toISOString().split('T')[0];
        const newInvested = (newPrice * newQty) / (Number(trade.leverage) || 1);
        const auditNote = `🏛️ Corporate Action Applied: ${actionLabel} (Ex-Date: ${dateStr}).
Qty adjusted: ${oldQty} → ${newQty} shares.
Avg Entry Price adjusted: ₹${oldPrice.toFixed(2)} → ₹${newPrice.toFixed(2)}.
Cost Basis: ₹${oldInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })} → ₹${newInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (Preserved).${notes ? `\nNotes: "${notes.trim()}"` : ''}`;

        await db.query(
            `INSERT INTO trade_notes (trade_id, note_text, created_at) VALUES (?, ?, NOW())`,
            [trade_id, auditNote]
        );

        res.json({
            success: true,
            message: `${actionLabel} applied successfully`,
            adjusted: {
                trade_id: Number(trade_id),
                stock_name: trade.stock_name,
                old_quantity: oldQty,
                new_quantity: newQty,
                old_entry_price: oldPrice,
                new_entry_price: newPrice,
                target: newTarget,
                stop_loss: newStopLoss,
                action_type,
                ratio: ratioStr
            }
        });
    } catch (error) {
        console.error("applyCorporateAction error:", error);
        res.status(500).json({ success: false, message: "Failed to apply corporate action", error: error.message });
    }
};
