import express from 'express';
import { 
    getAllUsers, 
    getNotifications,
    getUserClients, 
    getUserTrades, 
    getUserCapital, 
    freezeUser, 
    unfreezeUser, 
    updateSubscription, 
    deleteUser,
    resetUserPassword
} from '../controllers/superadmin.controller.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

// Helper middleware to restrict to super admins
const requireSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Super Admin role required' });
    }
};

// Apply auth & role restriction to all superadmin endpoints
router.use(verifyToken);
router.use(requireSuperAdmin);

router.get('/users', getAllUsers);
router.get('/notifications', getNotifications);
router.get('/users/:id/clients', getUserClients);
router.get('/users/:id/trades', getUserTrades);
router.get('/users/:id/capital', getUserCapital);
router.post('/users/:id/freeze', freezeUser);
router.post('/users/:id/unfreeze', unfreezeUser);
router.put('/users/:id/subscription', updateSubscription);
router.post('/users/:id/reset-password', resetUserPassword);
router.delete('/users/:id', deleteUser);

export default router;
