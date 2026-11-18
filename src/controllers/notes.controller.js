import db from '../config/db.js';
import { generateNoteDiff } from '../utils/diffHelper.js';

// Get all reference notes with edit counts and last updated timestamp
export const getAllNotes = async (req, res) => {
    try {
        const adminId = req.user.id;
        const [rows] = await db.query(
            `SELECT 
                n.note_id, 
                n.title, 
                n.content, 
                n.created_at, 
                n.updated_at,
                (SELECT COUNT(*) FROM reference_note_logs l WHERE l.note_id = n.note_id) AS edit_count
             FROM reference_notes n
             WHERE n.admin_id = ? 
             ORDER BY COALESCE(n.updated_at, n.created_at) DESC`,
            [adminId]
        );
        res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error('Notes fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get single note with its details
export const getNoteById = async (req, res) => {
    try {
        const adminId = req.user.id;
        const [rows] = await db.query(
            `SELECT 
                n.note_id, 
                n.title, 
                n.content, 
                n.created_at, 
                n.updated_at,
                (SELECT COUNT(*) FROM reference_note_logs l WHERE l.note_id = n.note_id) AS edit_count
             FROM reference_notes n 
             WHERE n.note_id = ? AND n.admin_id = ?`,
            [req.params.id, adminId]
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
        const adminId = req.user.id;
        const [result] = await db.query(
            'INSERT INTO reference_notes (title, content, admin_id) VALUES (?, ?, ?)',
            [title.trim(), content || null, adminId]
        );

        const [newNote] = await db.query(
            `SELECT 
                note_id, 
                title, 
                content, 
                created_at, 
                updated_at, 
                0 AS edit_count 
             FROM reference_notes 
             WHERE note_id = ? AND admin_id = ?`,
            [result.insertId, adminId]
        );

        res.status(201).json({ success: true, data: newNote[0] });
    } catch (error) {
        console.error('Note creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update an existing note and log the diff/changes
export const updateNote = async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const adminId = req.user.id;

    if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Title is required' });
    }

    try {
        // Fetch current note state
        const [rows] = await db.query(
            'SELECT note_id, title, content, created_at, updated_at FROM reference_notes WHERE note_id = ? AND admin_id = ?',
            [id, adminId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        const currentNote = rows[0];
        const oldTitle = currentNote.title || '';
        const newTitle = title.trim();
        const oldContent = currentNote.content || '';
        const newContent = content !== undefined ? content : oldContent;

        // Check if anything actually changed
        const titleChanged = oldTitle !== newTitle;
        const contentChanged = oldContent !== newContent;

        if (!titleChanged && !contentChanged) {
            return res.status(200).json({ 
                success: true, 
                message: 'No changes detected', 
                data: currentNote 
            });
        }

        // Generate diff summary
        const diffData = generateNoteDiff({
            oldTitle,
            newTitle,
            oldContent,
            newContent
        });

        // Insert revision history log
        await db.query(
            `INSERT INTO reference_note_logs 
                (note_id, admin_id, previous_title, new_title, previous_content, new_content, diff_summary) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                adminId, 
                oldTitle, 
                newTitle, 
                oldContent, 
                newContent, 
                JSON.stringify(diffData)
            ]
        );

        // Update the reference note
        await db.query(
            `UPDATE reference_notes 
             SET title = ?, content = ?, updated_at = NOW() 
             WHERE note_id = ? AND admin_id = ?`,
            [newTitle, newContent, id, adminId]
        );

        // Fetch updated note with edit count
        const [updatedRows] = await db.query(
            `SELECT 
                n.note_id, 
                n.title, 
                n.content, 
                n.created_at, 
                n.updated_at,
                (SELECT COUNT(*) FROM reference_note_logs l WHERE l.note_id = n.note_id) AS edit_count
             FROM reference_notes n 
             WHERE n.note_id = ? AND n.admin_id = ?`,
            [id, adminId]
        );

        res.status(200).json({ 
            success: true, 
            message: 'Note updated successfully', 
            data: updatedRows[0],
            diff: diffData
        });
    } catch (error) {
        console.error('Note update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get revision history logs for a note
export const getNoteLogs = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    try {
        // Verify note ownership
        const [note] = await db.query(
            'SELECT note_id, title FROM reference_notes WHERE note_id = ? AND admin_id = ?',
            [id, adminId]
        );

        if (note.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        const [logs] = await db.query(
            `SELECT 
                id, 
                note_id, 
                previous_title, 
                new_title, 
                previous_content, 
                new_content, 
                diff_summary, 
                created_at 
             FROM reference_note_logs 
             WHERE note_id = ? AND admin_id = ? 
             ORDER BY created_at DESC`,
            [id, adminId]
        );

        // Parse diff_summary if string
        const parsedLogs = logs.map(l => {
            let diff = l.diff_summary;
            if (typeof diff === 'string') {
                try {
                    diff = JSON.parse(diff);
                } catch (e) {
                    diff = null;
                }
            }
            return {
                ...l,
                diff_summary: diff
            };
        });

        res.status(200).json({ 
            success: true, 
            note: note[0], 
            count: parsedLogs.length, 
            data: parsedLogs 
        });
    } catch (error) {
        console.error('Note logs fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a note and its logs
export const deleteNote = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    try {
        const [rows] = await db.query('SELECT note_id FROM reference_notes WHERE note_id = ? AND admin_id = ?', [id, adminId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        // Clean up logs explicitly before deleting note
        await db.query('DELETE FROM reference_note_logs WHERE note_id = ? AND admin_id = ?', [id, adminId]);
        await db.query('DELETE FROM reference_notes WHERE note_id = ? AND admin_id = ?', [id, adminId]);
        
        res.status(200).json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Note deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
