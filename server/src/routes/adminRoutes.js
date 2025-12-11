const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');
const {
  getStats,
  listUsers,
  updateUserRole,
  deleteUser,
  listFilePairs,
  deleteFilePair,
} = require('../controllers/adminController');

router.use(authMiddleware, roleMiddleware(ROLES.ADMIN));

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);
router.get('/file-pairs', listFilePairs);
router.delete('/file-pairs/:filePairId', deleteFilePair);

module.exports = router;


