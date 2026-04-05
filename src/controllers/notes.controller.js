import db from '../config/db.js';
import fs from 'fs';
import path from 'path';

// Get all reference notes
export const getAllNotes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM reference_notes ORDER BY created_at DESC');
        res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error('Notes fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get single note
export const getNoteById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM reference_notes WHERE note_id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Note fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new note (with optional file)
export const createNote = async (req, res) => {
    const { title, content } = req.body;
    const file = req.file;

    if (!title) {
        // If file was uploaded but validation fails, clean it up
        if (file) { fs.unlinkSync(file.path); }
        return res.status(400).json({ success: false, message: 'Title is required' });
    }

    try {
        const query = `
            INSERT INTO reference_notes 
            (title, content, file_name, original_file_name, file_type) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [
            title,
            content || null,
            file ? file.filename : null,
            file ? file.originalname : null,
            file ? file.mimetype : null
        ];

        const [result] = await db.query(query, values);
        
        const [newNote] = await db.query('SELECT * FROM reference_notes WHERE note_id = ?', [result.insertId]);

        res.status(201).json({
            success: true,
            data: newNote[0]
        });
    } catch (error) {
        console.error('Note creation error:', error);
        if (file) { fs.unlinkSync(file.path); } // Clean up file if db insert fails
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a note
export const deleteNote = async (req, res) => {
    const { id } = req.params;
    try {
        // Find the note to get the filename
        const [rows] = await db.query('SELECT * FROM reference_notes WHERE note_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        const note = rows[0];

        // Delete from DB
        await db.query('DELETE FROM reference_notes WHERE note_id = ?', [id]);

        // Delete the actual file if it exists
        if (note.file_name) {
            const filePath = path.join(process.cwd(), 'uploads', note.file_name);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.status(200).json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Note deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
