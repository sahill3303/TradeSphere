import db from '../config/db.js';

// Helper to ensure paper account exists for admin
const ensureAccount = async (adminId) => {
    const [[acc]] = await db.query(`SELECT * FROM paper_accounts WHERE admin_id = ?`, [adminId]);
    if (!acc) {
        const initialCapital = 1000000.00;
        await db.query(
            `INSERT INTO paper_accounts (admin_id, virtual_balance, total_added_capital) VALUES (?, ?, ?)`,
            [adminId, initialCapital, initialCapital]
        );
        return { admin_id: adminId, virtual_balance: initialCapital, total_added_capital: initialCapital };
    }
    return acc;
};

// 🔹 GET ACCOUNT SUMMARY & METRICS
export const getAccountSummary = async (req, res) => {
    try {
        const adminId = req.user.id;
        const account = await ensureAccount(adminId);

        // Compute invested capital in OPEN trades
        const [[openSummary]] = await db.query(
            `SELECT COUNT(*) as count, IFNULL(SUM(entry_price * quantity), 0) as invested 
             FROM paper_trades WHERE admin_id = ? AND status = 'OPEN'`,
            [adminId]
        );

        // Compute realized PnL in CLOSED trades
        const [[closedSummary]] = await db.query(
            `SELECT IFNULL(SUM(realized_pnl), 0) as totalRealizedPnl, COUNT(*) as count 
             FROM paper_trades WHERE admin_id = ? AND status = 'CLOSED'`,
            [adminId]
        );

        res.json({
            success: true,
            data: {
                available_cash: Number(account.virtual_balance),
                total_added_capital: Number(account.total_added_capital),
                invested_capital: Number(openSummary.invested),
                open_trades_count: Number(openSummary.count),
                closed_trades_count: Number(closedSummary.count),
                realized_pnl: Number(closedSummary.totalRealizedPnl),
                total_portfolio_value: Number(account.virtual_balance) + Number(openSummary.invested)
            }
        });
    } catch (error) {
        console.error('getAccountSummary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch paper account summary', error: error.message });
    }
};

// 🔹 ADD OR RESET FUNDS
export const addFunds = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { amount, action } = req.body; // action: 'ADD' | 'RESET'
        const amt = Number(amount);

        if (isNaN(amt) || amt <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount entered' });
        }

        const account = await ensureAccount(adminId);

        if (action === 'RESET') {
            await db.query(
                `UPDATE paper_accounts SET virtual_balance = ?, total_added_capital = ? WHERE admin_id = ?`,
                [amt, amt, adminId]
            );
            return res.json({ success: true, message: `Account balance reset to ₹${amt.toLocaleString('en-IN')}` });
        } else {
            const newBalance = Number(account.virtual_balance) + amt;
            const newTotal = Number(account.total_added_capital) + amt;
            await db.query(
                `UPDATE paper_accounts SET virtual_balance = ?, total_added_capital = ? WHERE admin_id = ?`,
                [newBalance, newTotal, adminId]
            );
            return res.json({ success: true, message: `Added ₹${amt.toLocaleString('en-IN')} to simulated balance` });
        }
    } catch (error) {
        console.error('addFunds error:', error);
        res.status(500).json({ success: false, message: 'Failed to manage funds', error: error.message });
    }
};

// 🔹 GET ALL PAPER TRADES
export const getPaperTrades = async (req, res) => {
    try {
        const adminId = req.user.id;
        const [trades] = await db.query(
            `SELECT * FROM paper_trades WHERE admin_id = ? ORDER BY trade_id DESC`,
            [adminId]
        );
        res.json({ success: true, data: trades });
    } catch (error) {
        console.error('getPaperTrades error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch paper trades', error: error.message });
    }
};

// 🔹 OPEN PAPER TRADE (BUY SIDE ONLY)
export const openPaperTrade = async (req, res) => {
    try {
        const adminId = req.user.id;
        const {
            stock_name,
            holding_type, // 'TRADING' or 'INVESTMENT'
            entry_price,
            quantity,
            target,
            stop_loss,
            strategy,
            conviction_level,
            notes,
            trade_date
        } = req.body;

        if (!stock_name || !entry_price || !quantity) {
            return res.status(400).json({ success: false, message: 'Stock Symbol, Entry Price, and Quantity are required' });
        }

        const price = Number(entry_price);
        const qty = Number(quantity);
        if (price <= 0 || qty <= 0) {
            return res.status(400).json({ success: false, message: 'Entry Price and Quantity must be greater than zero' });
        }

        const totalCost = Number((price * qty).toFixed(2));
        const account = await ensureAccount(adminId);

        if (Number(account.virtual_balance) < totalCost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient virtual cash balance (Available: ₹${Number(account.virtual_balance).toLocaleString('en-IN')}, Required: ₹${totalCost.toLocaleString('en-IN')}). Please add funds using the '+ Add Funds' button.`
            });
        }

        // Deduct from balance
        const newBalance = Number(account.virtual_balance) - totalCost;
        await db.query(`UPDATE paper_accounts SET virtual_balance = ? WHERE admin_id = ?`, [newBalance, adminId]);

        // Insert trade
        const [result] = await db.query(
            `INSERT INTO paper_trades (
                admin_id, stock_name, holding_type, entry_price, quantity,
                target, stop_loss, strategy, conviction_level, notes,
                trade_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
            [
                adminId,
                stock_name.trim().toUpperCase(),
                holding_type || 'TRADING',
                price,
                qty,
                target ? Number(target) : null,
                stop_loss ? Number(stop_loss) : null,
                strategy || null,
                conviction_level || null,
                notes || null,
                trade_date || new Date().toISOString().split('T')[0]
            ]
        );

        res.status(201).json({
            success: true,
            message: `${holding_type === 'INVESTMENT' ? 'Investment' : 'Paper Trade'} position opened successfully`,
            trade_id: result.insertId
        });
    } catch (error) {
        console.error('openPaperTrade error:', error);
        res.status(500).json({ success: false, message: 'Failed to place paper trade', error: error.message });
    }
};

// 🔹 EXIT PAPER TRADE
export const exitPaperTrade = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { id } = req.params;
        const { exit_price, exit_date, exit_reason } = req.body;

        if (!exit_price) {
            return res.status(400).json({ success: false, message: 'Exit price is required' });
        }
        const exitP = Number(exit_price);
        if (exitP <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid exit price' });
        }

        // Check if trade exists and is OPEN
        const [[trade]] = await db.query(
            `SELECT * FROM paper_trades WHERE trade_id = ? AND admin_id = ?`,
            [id, adminId]
        );

        if (!trade) {
            return res.status(404).json({ success: false, message: 'Paper trade not found' });
        }
        if (trade.status !== 'OPEN') {
            return res.status(400).json({ success: false, message: 'Trade is already closed' });
        }

        // Buy side only: PnL = (Exit Price - Entry Price) * Quantity
        const realizedPnl = Number(((exitP - Number(trade.entry_price)) * Number(trade.quantity)).toFixed(2));
        const returnedCash = Number((exitP * Number(trade.quantity)).toFixed(2));

        // Add funds back to account
        const account = await ensureAccount(adminId);
        const updatedBalance = Number(account.virtual_balance) + returnedCash;
        await db.query(`UPDATE paper_accounts SET virtual_balance = ? WHERE admin_id = ?`, [updatedBalance, adminId]);

        // Mark trade closed
        const closeDate = exit_date || new Date().toISOString().split('T')[0];
        await db.query(
            `UPDATE paper_trades SET 
                status = 'CLOSED', 
                exit_price = ?, 
                exit_date = ?, 
                exit_reason = ?, 
                realized_pnl = ?, 
                closed_at = NOW() 
             WHERE trade_id = ? AND admin_id = ?`,
            [exitP, closeDate, exit_reason || 'Manual Exit', realizedPnl, id, adminId]
        );

        res.json({
            success: true,
            message: `Trade closed. Realized P&L: ₹${realizedPnl.toLocaleString('en-IN')}`,
            realized_pnl: realizedPnl
        });
    } catch (error) {
        console.error('exitPaperTrade error:', error);
        res.status(500).json({ success: false, message: 'Failed to exit trade', error: error.message });
    }
};

// 🔹 DELETE PAPER TRADE
export const deletePaperTrade = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { id } = req.params;

        const [[trade]] = await db.query(
            `SELECT * FROM paper_trades WHERE trade_id = ? AND admin_id = ?`,
            [id, adminId]
        );

        if (!trade) {
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        // If trade was open, restore the initial capital investment
        if (trade.status === 'OPEN') {
            const refund = Number((Number(trade.entry_price) * Number(trade.quantity)).toFixed(2));
            const account = await ensureAccount(adminId);
            const updatedBalance = Number(account.virtual_balance) + refund;
            await db.query(`UPDATE paper_accounts SET virtual_balance = ? WHERE admin_id = ?`, [updatedBalance, adminId]);
        }

        await db.query(`DELETE FROM paper_trades WHERE trade_id = ? AND admin_id = ?`, [id, adminId]);

        res.json({ success: true, message: 'Trade deleted successfully' });
    } catch (error) {
        console.error('deletePaperTrade error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete trade', error: error.message });
    }
};

// 🔹 UPDATE HOLDING TYPE (TRADING <-> INVESTMENT)
export const updatePaperTradeCategory = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { id } = req.params;
        const { holding_type } = req.body;

        if (!holding_type || !['TRADING', 'INVESTMENT'].includes(holding_type)) {
            return res.status(400).json({ success: false, message: 'Invalid holding type' });
        }

        const [result] = await db.query(
            `UPDATE paper_trades SET holding_type = ? WHERE trade_id = ? AND admin_id = ?`,
            [holding_type, id, adminId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        res.json({ success: true, message: `Position switched to ${holding_type === 'INVESTMENT' ? 'Long-Term Investment' : 'Active Trading'}` });
    } catch (error) {
        console.error('updatePaperTradeCategory error:', error);
        res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
    }
};

