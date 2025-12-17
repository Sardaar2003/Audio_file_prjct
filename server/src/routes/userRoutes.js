const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const { listAgents } = require('../controllers/userController');

// All user utility routes require authentication but are not role-restricted.
router.use(authMiddleware);

router.get('/agents', listAgents);

module.exports = router;



