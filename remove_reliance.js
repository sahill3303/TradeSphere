import db from './src/config/db.js';

async function removeReliance() {
    try {
        const [categories] = await db.query('SELECT * FROM watchlist_categories WHERE name = ?', ['Reliance']);
        if (categories.length > 0) {
            console.log('Found category Reliance, deleting...');
            await db.query('DELETE FROM watchlist_categories WHERE id = ?', [categories[0].id]);
        } else {
            console.log('No category named Reliance found. Deleting Reliance stock...');
            await db.query('DELETE FROM watchlist_symbols WHERE symbol LIKE ?', ['%RELIANCE%']);
        }
        console.log('Done.');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

removeReliance();
