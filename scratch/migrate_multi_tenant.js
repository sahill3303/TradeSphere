import db from '../src/config/db.js';

async function migrate() {
    try {
        console.log("Starting Migration...");

        // 1. Add preferences to admins
        try {
            await db.query(`ALTER TABLE admins ADD COLUMN preferences JSON DEFAULT NULL;`);
            console.log("✅ Added preferences to admins");
        } catch (e) {
            console.log("⚠️ Skipping admins.preferences: " + e.message);
        }

        // 2. Add admin_id to core tables (Default to 1 for existing data)
        const tables = [
            'clients',
            'trades',
            'reference_notes',
            'watchlist_categories',
            'watchlist_symbols',
            'capital_summary'
        ];

        for (const table of tables) {
            try {
                await db.query(`ALTER TABLE ${table} ADD COLUMN admin_id INT DEFAULT 1;`);
                
                // Add foreign key constraint
                await db.query(`
                    ALTER TABLE ${table} 
                    ADD CONSTRAINT fk_${table}_admin_id 
                    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;
                `);
                console.log(`✅ Added admin_id to ${table}`);
            } catch (e) {
                console.log(`⚠️ Skipping ${table}.admin_id: ` + e.message);
            }
        }

        // 3. Update capital_summary Primary Key
        try {
            // First drop existing primary key
            await db.query(`ALTER TABLE capital_summary DROP PRIMARY KEY;`);
            // Add new composite primary key or just admin_id
            await db.query(`ALTER TABLE capital_summary ADD PRIMARY KEY (admin_id);`);
            console.log("✅ Updated capital_summary primary key");
        } catch (e) {
            console.log("⚠️ Skipping capital_summary PK update: " + e.message);
        }

        console.log("🎉 Migration Complete!");
        process.exit(0);

    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
}

migrate();
