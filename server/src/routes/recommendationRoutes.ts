import { Router } from 'express';
import { list } from '../controllers/recommendationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', list);

export default router;
