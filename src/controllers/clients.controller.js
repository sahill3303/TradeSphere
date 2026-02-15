import { recalculateCapital } from '../services/capital.service.js';
import db from '../config/db.js';


/**
 * CREATE CLIENT
 */
export const createClient = async (req, res) => {

    try {
        const { name, broker, capital_invested, join_date } = req.body;

        const [result] = await db.query(
            `INSERT INTO clients (name, broker, capital_invested, join_date, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
            [name, broker, capital_invested, join_date]
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

        res.status(200).json({
            success: true,
            data: rows[0]
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
        const { name, broker, capital_invested } = req.body;

        if (!name && !broker && !capital_invested) {
            return res.status(400).json({
                message: "Nothing to update"
            });
        }

        const fields = [];
        const values = [];

        if (name) {
            fields.push("name = ?");
            values.push(name);
        }

        if (broker) {
            fields.push("broker = ?");
            values.push(broker);
        }

        if (capital_invested !== undefined) {
            fields.push("capital_invested = ?");
            values.push(capital_invested);
        }

        values.push(id);

        const [result] = await db.query(
            `UPDATE clients SET ${fields.join(", ")} WHERE client_id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Client not found" });
        }

        // 🔥 Only recalc if capital changed
        if (capitalChanged) {
            await recalculateCapital();
        }

        res.json({
            message: "Client details updated successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Update client error",
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

