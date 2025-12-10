const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');
const {
  listFilePairs,
  assignFilePair,
  listAssignments,
  listQAUsers,
} = require('../controllers/managerController');

const managerAccess = [ROLES.MONITOR, ROLES.ADMIN];

router.use(authMiddleware, roleMiddleware(...managerAccess));

router.get('/file-pairs', listFilePairs);
router.get('/assignments', listAssignments);
router.post('/assign', assignFilePair);
router.get('/qa-users', listQAUsers);

module.exports = router;


