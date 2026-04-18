import db from '../config/db.js';

// Get all reference notes
export const getAllNotes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT note_id, title, content, created_at FROM reference_notes ORDER BY created_at DESC');
        res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error('Notes fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get single note
export const getNoteById = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT note_id, title, content, created_at FROM reference_notes WHERE note_id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Note fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new note (text only)
export const createNote = async (req, res) => {
    const { title, content } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Title is required' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO reference_notes (title, content) VALUES (?, ?)',
            [title.trim(), content || null]
        );

        const [newNote] = await db.query(
            'SELECT note_id, title, content, created_at FROM reference_notes WHERE note_id = ?',
            [result.insertId]
        );

        res.status(201).json({ success: true, data: newNote[0] });
    } catch (error) {
        console.error('Note creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a note
export const deleteNote = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT note_id FROM reference_notes WHERE note_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        await db.query('DELETE FROM reference_notes WHERE note_id = ?', [id]);
        res.status(200).json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Note deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
