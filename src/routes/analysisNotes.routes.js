import express from 'express';
import {
    getNotes,
    createNote,
    updateNote,
    deleteNote,
    bulkCreateNotes
} from '../controllers/analysisNotes.controller.js';

const router = express.Router();

router.get('/', getNotes);
router.post('/', createNote);
router.post('/bulk', bulkCreateNotes);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;
