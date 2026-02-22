import express from 'express';
import { createClient, getAllClients, getClientSummary, getClientById, updateClientStatus, updateClientDetails, deleteClient, getDeletedClients, restoreClient } from '../controllers/clients.controller.js';
import verifyToken from '../middleware/verifyToken.js';


const router = express.Router();

// create client
router.post('/', verifyToken, createClient);

// get all clients
router.get('/', verifyToken, getAllClients);

// get client summary
router.get('/summary', verifyToken, getClientSummary);


// get deleted clients
router.get('/deleted', verifyToken, getDeletedClients);


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


export default router;
