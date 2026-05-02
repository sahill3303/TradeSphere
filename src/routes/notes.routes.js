import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
    getAllNotes,
    getNoteById,
    createNote,
    deleteNote
} from '../controllers/notes.controller.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getAllNotes);
router.get('/:id', getNoteById);
router.post('/', createNote);
router.delete('/:id', deleteNote);

export default router;
