const router = require('express').Router();
const { signup, login, currentUser } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, currentUser);

module.exports = router;


