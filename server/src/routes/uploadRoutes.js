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
  updateFlag,
  updateStatus,
  addComment,
  deleteComment,

  getFilePairDetails,
  migrateFileSizes,
} = require('../controllers/uploadController');
const { ROLES } = require('../constants/roles');
const { QA_TEAMS } = require('../constants/roles');

router.post(
  '/folder',
  authMiddleware,
  roleMiddleware(ROLES.USER, ROLES.AGENT, ROLES.ADMIN, ROLES.MONITOR),
  upload.array('files'),
  uploadFolder
);

router.get('/mine', authMiddleware, getMyUploads);
router.get('/text/:filePairId', authMiddleware, getTextContent);
router.put('/text/:filePairId', authMiddleware, saveEditedText);
router.get('/records', authMiddleware, roleMiddleware(...QA_TEAMS, ROLES.MONITOR, ROLES.ADMIN), listRecords);
router.get('/:filePairId', authMiddleware, getFilePairDetails);
router.put('/:filePairId/sold', authMiddleware, updateSoldStatus);
router.put('/:filePairId/sold', authMiddleware, updateSoldStatus);
router.put('/:filePairId/flag', authMiddleware, roleMiddleware(...QA_TEAMS, ROLES.MONITOR, ROLES.ADMIN), updateFlag);
router.put('/:filePairId/status', authMiddleware, roleMiddleware(...QA_TEAMS, ROLES.MONITOR, ROLES.ADMIN), updateStatus);
router.post('/:filePairId/comments', authMiddleware, roleMiddleware(...QA_TEAMS, ROLES.MONITOR, ROLES.ADMIN), addComment);
router.delete('/:filePairId/comments/:commentId', authMiddleware, roleMiddleware(...QA_TEAMS, ROLES.MONITOR, ROLES.ADMIN), deleteComment);

router.post('/migrate-sizes', authMiddleware, roleMiddleware(ROLES.ADMIN), migrateFileSizes);
// router.post('/migrate-sizes', migrateFileSizes);

module.exports = router;


