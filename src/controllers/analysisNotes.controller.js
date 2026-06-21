import db from '../config/db.js';

export const getNotes = async (req, res) => {
    try {
        const [notes] = await db.query('SELECT * FROM analysis_notes ORDER BY created_at DESC');
        res.json({ success: true, data: notes });
    } catch (error) {
        console.error('Error fetching analysis notes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notes' });
    }
};

export const createNote = async (req, res) => {
    try {
        const { title, symbol, content, savedPrice } = req.body;
        
        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        const query = `
            INSERT INTO analysis_notes (title, symbol, content, saved_price) 
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [
            title, 
            symbol || null, 
            content || '', 
            savedPrice || null
        ]);

        const [newNote] = await db.query('SELECT * FROM analysis_notes WHERE id = ?', [result.insertId]);

        res.status(201).json({ success: true, data: newNote[0] });
    } catch (error) {
        console.error('Error creating analysis note:', error);
        res.status(500).json({ success: false, message: 'Failed to create note' });
    }
};

export const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, symbol, content, savedPrice } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        const query = `
            UPDATE analysis_notes 
            SET title = ?, symbol = ?, content = ?, saved_price = ? 
            WHERE id = ?
        `;
        const [result] = await db.query(query, [
            title, 
            symbol || null, 
            content || '', 
            savedPrice || null, 
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        const [updatedNote] = await db.query('SELECT * FROM analysis_notes WHERE id = ?', [id]);
        res.json({ success: true, data: updatedNote[0] });
    } catch (error) {
        console.error('Error updating analysis note:', error);
        res.status(500).json({ success: false, message: 'Failed to update note' });
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM analysis_notes WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting analysis note:', error);
        res.status(500).json({ success: false, message: 'Failed to delete note' });
    }
};

// Handle bulk import (for local storage migration)
export const bulkCreateNotes = async (req, res) => {
    try {
        const { notes } = req.body;
        
        if (!Array.isArray(notes) || notes.length === 0) {
            return res.status(400).json({ success: false, message: 'Valid notes array required' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const results = [];
            for (const note of notes) {
                // Skip if somehow invalid
                if (!note.title) continue;

                // Handle createdAt if provided (useful for migration)
                let query = 'INSERT INTO analysis_notes (title, symbol, content, saved_price) VALUES (?, ?, ?, ?)';
                let params = [
                    note.title, 
                    note.symbol || null, 
                    note.content || '', 
                    note.savedPrice || note.saved_price || null
                ];

                if (note.createdAt || note.created_at) {
                    query = 'INSERT INTO analysis_notes (title, symbol, content, saved_price, created_at) VALUES (?, ?, ?, ?, ?)';
                    const createdAtDate = new Date(note.createdAt || note.created_at);
                    params.push(isNaN(createdAtDate) ? new Date() : createdAtDate);
                }

                const [result] = await connection.query(query, params);
                const [newNote] = await connection.query('SELECT * FROM analysis_notes WHERE id = ?', [result.insertId]);
                results.push(newNote[0]);
            }

            await connection.commit();
            res.status(201).json({ success: true, data: results });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error bulk creating analysis notes:', error);
        res.status(500).json({ success: false, message: 'Failed to bulk create notes' });
    }
};
