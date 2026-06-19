import { Router } from 'express';
import { create, list, getById, update, remove, getEmissionFactors } from '../controllers/activityController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createActivitySchema, updateActivitySchema, activityQuerySchema } from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Emission factors (public data, but behind auth for consistency)
router.get('/emission-factors', getEmissionFactors);

// CRUD
router.post('/', validate(createActivitySchema), create);
router.get('/', validate(activityQuerySchema, 'query'), list);
router.get('/:id', getById);
router.put('/:id', validate(updateActivitySchema), update);
router.delete('/:id', remove);

export default router;
