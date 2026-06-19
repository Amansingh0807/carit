import { Router } from 'express';
import { getAchievements, getStreak } from '../controllers/gamificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/achievements', getAchievements);
router.get('/streak', getStreak);

export default router;
