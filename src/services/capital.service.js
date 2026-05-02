
import db from '../config/db.js';

export const recalculateCapital = async (adminId) => {
    if (!adminId) {
        console.error('❌ recalculateCapital called without adminId');
        return;
    }
    try {
        const [[{ totalCapital }]] = await db.query(`
            SELECT IFNULL(SUM(capital_invested), 0) AS totalCapital
            FROM clients
            WHERE admin_id = ? AND is_deleted = FALSE
        `, [adminId]);

        const [[{ totalPnl }]] = await db.query(`
            SELECT IFNULL(SUM(total_pnl), 0) AS totalPnl
            FROM trades
            WHERE admin_id = ? AND is_deleted = FALSE
        `, [adminId]);

        const deployedCapital = Number(totalCapital) + Number(totalPnl);

        await db.query(`
            UPDATE capital_summary
            SET total_capital = ?,
                total_pnl = ?,
                deployed_capital = ?
            WHERE admin_id = ?
        `, [totalCapital, totalPnl, deployedCapital, adminId]);

        console.log(`✅ Capital recalculated for admin ${adminId}`);

    } catch (error) {
        console.error("❌ Capital recalculation error:", error);
    }
};
