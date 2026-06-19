import { Router } from 'express';
import { getSummary } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { analyticsQuerySchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/summary', validate(analyticsQuerySchema, 'query'), getSummary);

export default router;
