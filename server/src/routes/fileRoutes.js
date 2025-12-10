const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getTextFile, getAudioFile, getAudioUrl, generateFileUrl } = require('../controllers/fileController');

router.use(authMiddleware);

// Unified presigned URL route (GET /file/:id?type=audio|text|review)
router.get('/file/:id', generateFileUrl);

// Legacy routes (for backward compatibility)
router.get('/text/:filePairId', getTextFile);
router.get('/audio/:filePairId', getAudioFile);
router.get('/audio/:filePairId/url', getAudioUrl);

module.exports = router;



