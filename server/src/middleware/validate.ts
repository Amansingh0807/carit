import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

type RequestField = 'body' | 'query' | 'params';

/**
 * Generic Zod validation middleware factory.
 * Validates the specified request field against a Zod schema.
 */
export function validate(schema: ZodSchema, field: RequestField = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[field]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Replace the request field with the parsed (and potentially transformed) data
    if (field === 'body') {
      req.body = result.data;
    } else if (field === 'query') {
      // Assign validated query params back - need to use Object.assign
      // since req.query is readonly in strict mode
      Object.assign(req.query, result.data);
    }

    next();
  };
}
