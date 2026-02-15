import express from 'express';
import { createClient, getAllClients, getClientSummary, getClientById, updateClientStatus, updateClientDetails } from '../controllers/clients.controller.js';
import verifyToken from '../middleware/verifyToken.js';


const router = express.Router();

// create client
router.post('/', verifyToken, createClient);

// get all clients
router.get('/', verifyToken, getAllClients);

// get client summary
router.get('/summary', verifyToken, getClientSummary);

// get client by ID
router.get('/:id', verifyToken, getClientById);

// update client details
router.put('/:id', verifyToken, updateClientDetails);

// update client status
router.patch('/:id/status', verifyToken, updateClientStatus);

// update client details
router.patch('/:id', verifyToken, updateClientDetails);



export default router;
