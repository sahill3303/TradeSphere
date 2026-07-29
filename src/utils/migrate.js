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

        // Add password_plain if it doesn't exist
        if (!columnNames.includes('password_plain')) {
            console.log('Migrating: Adding password_plain column to admins...');
            await db.query('ALTER TABLE admins ADD COLUMN password_plain VARCHAR(255) DEFAULT NULL');
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
                 VALUES (?, ?, ?, 'superadmin', ?)`,
                ['Super Admin', email, passwordHash, password]
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

        console.log('✅ Database migrations and seed completed.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
};

