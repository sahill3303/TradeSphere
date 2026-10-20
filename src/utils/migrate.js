import db from '../config/db.js';
import bcrypt from 'bcrypt';

export const runMigrations = async () => {
    console.log('Running database migrations...');
    try {
        // 1. Check if columns exist in `admins` table
        const [columns] = await db.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'admins'`
        );
        
        const columnNames = columns.map(c => c.COLUMN_NAME.toLowerCase());
        
        // Add is_frozen if it doesn't exist
        if (!columnNames.includes('is_frozen')) {
            console.log('Migrating: Adding is_frozen column to admins...');
            await db.query('ALTER TABLE admins ADD COLUMN is_frozen BOOLEAN DEFAULT FALSE');
        }
        
        // Add subscription_expires_at if it doesn't exist
        if (!columnNames.includes('subscription_expires_at')) {
            console.log('Migrating: Adding subscription_expires_at column to admins...');
            await db.query('ALTER TABLE admins ADD COLUMN subscription_expires_at TIMESTAMP NULL DEFAULT NULL');
        }
        
        // Add last_login_at if it doesn't exist
        if (!columnNames.includes('last_login_at')) {
            console.log('Migrating: Adding last_login_at column to admins...');
            await db.query('ALTER TABLE admins ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL');
        }

        // Add login_count if it doesn't exist
        if (!columnNames.includes('login_count')) {
            console.log('Migrating: Adding login_count column to admins...');
            await db.query('ALTER TABLE admins ADD COLUMN login_count INT DEFAULT 0');
        }

        // Add must_reset_password if it doesn't exist
        if (!columnNames.includes('must_reset_password')) {
            console.log('Migrating: Adding must_reset_password column to admins...');
            await db.query('ALTER TABLE admins ADD COLUMN must_reset_password BOOLEAN DEFAULT FALSE');
        }

        // Security: Scrub any plaintext passwords from the database
        if (columnNames.includes('password_plain')) {
            console.log('Migrating: Sanitizing and scrubbing plaintext passwords for user privacy...');
            await db.query('UPDATE admins SET password_plain = NULL');
        }

        // 2. Check if a superadmin exists
        const [superadmins] = await db.query(
            "SELECT id FROM admins WHERE role = 'superadmin' LIMIT 1"
        );
        
        if (superadmins.length === 0) {
            console.log('Migrating: Seeding default superadmin...');
            const email = process.env.SUPERADMIN_EMAIL || 'superadmin@tradesphere.com';
            const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
            const passwordHash = await bcrypt.hash(password, 10);
            
            await db.query(
                `INSERT INTO admins (name, email, password_hash, role, password_plain) 
                 VALUES (?, ?, ?, 'superadmin', NULL)`,
                ['Super Admin', email, passwordHash]
            );
            console.log(`✅ Default Super Admin seeded successfully with email: ${email}`);
        } else {
            console.log('Super Admin already exists.');
        }

        // 3. Create Paper Trading and Virtual Portfolio Tables
        console.log('Checking Paper Trading tables...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS paper_accounts (
                admin_id INT PRIMARY KEY,
                virtual_balance DECIMAL(15,2) DEFAULT 1000000.00,
                total_added_capital DECIMAL(15,2) DEFAULT 1000000.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS paper_trades (
                trade_id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NOT NULL,
                stock_name VARCHAR(255) NOT NULL,
                holding_type VARCHAR(50) DEFAULT 'TRADING',
                entry_price DECIMAL(15,2) NOT NULL,
                quantity INT NOT NULL,
                target DECIMAL(15,2) DEFAULT NULL,
                stop_loss DECIMAL(15,2) DEFAULT NULL,
                strategy VARCHAR(255) DEFAULT NULL,
                conviction_level VARCHAR(50) DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                trade_date DATE DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'OPEN',
                exit_price DECIMAL(15,2) DEFAULT NULL,
                exit_date DATE DEFAULT NULL,
                exit_reason VARCHAR(255) DEFAULT NULL,
                realized_pnl DECIMAL(15,2) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP NULL DEFAULT NULL,
                INDEX (admin_id),
                INDEX (status),
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Paper Trading tables verified.');

        // 4. Clean up any orphaned watchlist symbols (symbols with no matching category)
        await db.query(`
            DELETE s FROM watchlist_symbols s
            LEFT JOIN watchlist_categories c ON s.admin_id = c.admin_id AND s.category = c.name
            WHERE c.id IS NULL
        `);
        console.log('✅ Orphaned watchlist symbols cleaned up.');

        console.log('✅ Database migrations and seed completed.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
};

