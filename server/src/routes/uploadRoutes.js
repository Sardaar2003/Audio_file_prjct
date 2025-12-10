const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  uploadFolder,
  getMyUploads,
  getTextContent,
  saveEditedText,
  listRecords,
  updateSoldStatus,
  addComment,
} = require('../controllers/uploadController');
const { ROLES } = require('../constants/roles');
const { QA_TEAMS } = require('../constants/roles');

router.post(
  '/folder',
  authMiddleware,
  roleMiddleware(ROLES.USER, ROLES.ADMIN, ROLES.MONITOR),
  upload.array('files'),
  uploadFolder
);

router.get('/mine', authMiddleware, getMyUploads);
router.get('/text/:filePairId', authMiddleware, getTextContent);
router.put('/text/:filePairId', authMiddleware, saveEditedText);
router.get('/records', authMiddleware, roleMiddleware(...QA_TEAMS, ROLES.MONITOR, ROLES.ADMIN), listRecords);
router.put('/:filePairId/sold', authMiddleware, updateSoldStatus);
router.post('/:filePairId/comments', authMiddleware, roleMiddleware(...QA_TEAMS, ROLES.MONITOR, ROLES.ADMIN), addComment);

module.exports = router;


