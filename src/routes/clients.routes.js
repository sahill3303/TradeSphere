import express from 'express';
import {
    createClient,
    getAllClients,
    getClientSummary,
    getClientById,
    getClientActivity,
    updateClientStatus,
    updateClientDetails,
    deleteClient,
    getDeletedClients,
    restoreClient,
    hardDeleteClient
} from '../controllers/clients.controller.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

// ── Static / non-parameterised routes MUST come before /:id ──────────────────

// create client
router.post('/', verifyToken, createClient);

// get all clients
router.get('/', verifyToken, getAllClients);

// get client summary
router.get('/summary', verifyToken, getClientSummary);

// get deleted clients
router.get('/deleted', verifyToken, getDeletedClients);

// get client activity (last 5 updated)
router.get('/client-activity', verifyToken, getClientActivity);

// ── Parameterised routes ──────────────────────────────────────────────────────

// get client by ID
router.get('/:id', verifyToken, getClientById);

// update client details
router.put('/:id', verifyToken, updateClientDetails);

// update client status
router.patch('/:id/status', verifyToken, updateClientStatus);

// delete client
router.delete('/:id', verifyToken, deleteClient);

// restore client
router.patch('/:id/restore', verifyToken, restoreClient);

// hard delete client (permanent)
router.delete('/:id/permanent', verifyToken, hardDeleteClient);

export default router;
