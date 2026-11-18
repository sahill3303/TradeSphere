import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
    getAllNotes,
    getNoteById,
    createNote,
    updateNote,
    getNoteLogs,
    deleteNote
} from '../controllers/notes.controller.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getAllNotes);
router.get('/:id', getNoteById);
router.get('/:id/logs', getNoteLogs);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;
