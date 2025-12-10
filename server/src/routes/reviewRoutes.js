const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');
const { getAssignmentsForQA, submitReview, listReviews } = require('../controllers/reviewController');

const qaRoles = [ROLES.QA1, ROLES.QA2];

router.use(authMiddleware, roleMiddleware(...qaRoles));

router.get('/assigned', getAssignmentsForQA);
router.post('/submit', submitReview);
router.get('/mine', listReviews);

module.exports = router;


