import { Router } from 'express';
import multer from 'multer';
import {
  scheduleEmails,
  parseCsvEndpoint,
  getScheduledEmails,
  getSentEmails,
  searchEmails,
  getSenders,
  createSender,
} from '../controllers/emailController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Protect all email scheduling and retrieval routes
router.use(requireAuth);

router.post('/schedule', scheduleEmails);
router.post('/parse-csv', upload.single('file'), parseCsvEndpoint);
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/search', searchEmails);

router.get('/senders', getSenders);
router.post('/senders', createSender);

export default router;
