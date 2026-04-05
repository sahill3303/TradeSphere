import { recalculateCapital } from '../services/capital.service.js';
import db from '../config/db.js';


/**
 * CREATE CLIENT
 */
export const createClient = async (req, res) => {

    try {
        const { name, broker, capital_invested, join_date, status } = req.body;
        const clientStatus = status || 'ACTIVE';

        const [result] = await db.query(
            `INSERT INTO clients (name, broker, capital_invested, join_date, status)
       VALUES (?, ?, ?, ?, ?)`,
            [name, broker, capital_invested, join_date, clientStatus]
        );
        await recalculateCapital();

        res.status(201).json({
            message: 'Client created successfully',
            clientId: result.insertId
        });
    } catch (err) {
        res.status(500).json({ message: 'Create client error', error: err.message });
    }
};

/**
 * GET ALL CLIENTS
 */
export const getAllClients = async (req, res) => {
    try {
        const [clients] = await db.query(`
      SELECT 
        client_id,
        name,
        broker,
        capital_invested,
        join_date,
        status,
        created_at
      FROM clients
      WHERE is_deleted = FALSE
      ORDER BY created_at DESC
    `);

        res.status(200).json({
            success: true,
            count: clients.length,
            data: clients
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Fetch clients error',
            error: err.message
        });
    }
};

/**
 * GET CLIENT BY ID
 */
export const getClientById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `
      SELECT 
        client_id,
        name,
        broker,
        capital_invested,
        join_date,
        status,
        created_at
      FROM clients
      WHERE client_id = ?
      `,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        const [trades] = await db.query(
            `SELECT t.trade_id, t.stock_name, t.trade_type, t.mode, t.trade_date, t.status, t.total_pnl, t.entry_price, t.exit_price 
             FROM trade_clients tc
             JOIN trades t ON tc.trade_id = t.trade_id
             WHERE tc.client_id = ? AND t.is_deleted = FALSE
             ORDER BY t.created_at DESC`,
            [id]
        );

        res.status(200).json({
            success: true,
            data: { ...rows[0], trades }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Fetch client error',
            error: error.message
        });
    }
};

/**
 * UPDATE CLIENT STATUS
 */
export const updateClientStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // validation
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const allowedStatuses = ['ACTIVE', 'INACTIVE', 'PENDING'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const [result] = await db.query(
            'UPDATE clients SET status = ? WHERE client_id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Client status updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Update client status error',
            error: error.message
        });
    }
};

/**
 * UPDATE CLIENT DETAILS
 */
export const updateClientDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, broker, capital_invested, join_date } = req.body;

        if (!name && !broker && capital_invested === undefined && !join_date) {
            return res.status(400).json({ message: 'Nothing to update' });
        }

        const fields = [];
        const values = [];

        if (name) {
            fields.push('name = ?');
            values.push(name);
        }

        if (broker !== undefined) {
            fields.push('broker = ?');
            values.push(broker);
        }

        // Track whether capital changed so we can recalculate after
        const capitalChanged = capital_invested !== undefined;
        if (capitalChanged) {
            fields.push('capital_invested = ?');
            values.push(capital_invested);
        }

        if (join_date) {
            fields.push('join_date = ?');
            values.push(join_date);
        }

        values.push(id);

        const [result] = await db.query(
            `UPDATE clients SET ${fields.join(', ')} WHERE client_id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }

        if (capitalChanged) {
            await recalculateCapital();
        }

        res.json({ message: 'Client details updated successfully' });
    } catch (error) {
        res.status(500).json({
            message: 'Update client error',
            error: error.message
        });
    }
};


/**
 * GET CLIENT SUMMARY
 */
export const getClientSummary = async (req, res) => {
    try {
        const [[clientCounts]] = await db.query(`
            SELECT 
                COUNT(*) as totalClients,
                SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) as activeClients,
                SUM(CASE WHEN status='INACTIVE' THEN 1 ELSE 0 END) as inactiveClients,
                SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) as pendingClients
            FROM clients
        `);

        const [[capitalData]] = await db.query(`
            SELECT total_capital
            FROM capital_summary
            WHERE capital_id = 1
        `);

        res.json({
            ...clientCounts,
            totalCapital: capitalData?.total_capital || 0
        });

    } catch (err) {
        res.status(500).json({
            message: "Client summary error",
            error: err.message
        });
    }
};


/**
 * DELETE CLIENT
 */
export const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `UPDATE clients
             SET is_deleted = TRUE,
                 deleted_at = NOW()
             WHERE client_id = ? AND is_deleted = FALSE`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Client not found or already deleted"
            });
        }

        await recalculateCapital();

        res.json({
            message: "Client deleted successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Delete client error",
            error: error.message
        });
    }
};

/**
 * GET DELETED CLIENTS
 */
export const getDeletedClients = async (req, res) => {
    const [rows] = await db.query(
        `SELECT * FROM clients
         WHERE is_deleted=TRUE
         ORDER BY deleted_at DESC`
    );

    res.json(rows);
};


/**
 * RESTORE CLIENT
 */
export const restoreClient = async (req, res) => {
    try {
        const { id } = req.params; // route is /:id/restore

        const [result] = await db.query(
            `UPDATE clients
             SET is_deleted = FALSE, deleted_at = NULL
             WHERE client_id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Client not found or already active' });
        }

        await recalculateCapital();

        res.json({ message: 'Client restored successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Restore client error', error: error.message });
    }
};

// get client activity
export const getClientActivity = async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT
        client_id,
        name,
        status,
        join_date
      FROM clients
      WHERE is_deleted = FALSE
      ORDER BY client_id DESC
      LIMIT 5
    `);

        res.json(rows);

    } catch (error) {
        res.status(500).json({
            message: "Client activity error",
            error: error.message
        });
    }
};

// 🔹 HARD DELETE CLIENT (permanent — only soft-deleted clients)
export const hardDeleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `DELETE FROM clients WHERE client_id = ? AND is_deleted = TRUE`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Deleted client not found" });
        }

        res.json({ message: "Client permanently deleted" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Hard delete client error", error: error.message });
    }
};
