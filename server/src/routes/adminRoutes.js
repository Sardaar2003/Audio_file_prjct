const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');
const { getStats, listUsers, updateUserRole, deleteUser } = require('../controllers/adminController');

router.use(authMiddleware, roleMiddleware(ROLES.ADMIN));

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);

module.exports = router;


