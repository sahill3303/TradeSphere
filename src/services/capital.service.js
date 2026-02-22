
import db from '../config/db.js';

export const recalculateCapital = async () => {
    try {
        // 1️⃣ Total Capital from clients
        const [[{ totalCapital }]] = await db.query(`
            SELECT IFNULL(SUM(capital_invested), 0) AS totalCapital
            FROM clients
        `);

        // 2️⃣ Total PnL from trades
        const [[{ totalPnl }]] = await db.query(`
            SELECT IFNULL(SUM(total_pnl), 0) AS totalPnl
            FROM trades
        `);

        // 3️⃣ Deployed capital (optional logic – simple version)
        const deployedCapital = Number(totalCapital) + Number(totalPnl);

        // 4️⃣ Update capital_summary
        await db.query(`
            UPDATE capital_summary
            SET total_capital = ?,
                total_pnl = ?,
                deployed_capital = ?
            WHERE capital_id = 1
        `, [totalCapital, totalPnl, deployedCapital]);

        console.log("✅ Capital recalculated successfully");

    } catch (error) {
        console.error("❌ Capital recalculation error:", error);
    }
};
