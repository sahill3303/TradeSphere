import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    getAllNotes,
    getNoteById,
    createNote,
    deleteNote
} from '../controllers/notes.controller.js';

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.get('/', getAllNotes);
router.get('/:id', getNoteById);
router.post('/', upload.single('file'), createNote);
router.delete('/:id', deleteNote);

export default router;
