
import db from '../src/config/db.js';

async function checkSchema() {
    try {
        const tables = ['admins', 'trades', 'clients', 'capital_summary', 'reference_notes', 'watchlist_categories', 'watchlist_symbols'];
        
        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            try {
                const [rows] = await db.query(`DESCRIBE ${table}`);
                console.table(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Key: r.Key })));
                
                const [indexes] = await db.query(`SHOW INDEX FROM ${table}`);
                console.log(`Indexes for ${table}:`);
                console.table(indexes.map(i => ({ Name: i.Key_name, Unique: !i.Non_unique, Column: i.Column_name })));
            } catch (e) {
                console.log(`Error describing ${table}: ${e.message}`);
            }
        }

        console.log('\n--- Checking row counts ---');
        for (const table of tables) {
            try {
                const [[{ count }]] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`${table}: ${count} rows`);
            } catch (e) {
                console.log(`Error counting ${table}: ${e.message}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
