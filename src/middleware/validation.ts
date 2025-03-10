import { Request, Response, NextFunction } from 'express';
// Use require for express-validator since TypeScript is having issues with imports
const { body, validationResult } = require('express-validator');

export const gameCreateValidation = [
  body('player1Id').isMongoId().withMessage('Invalid player ID'),
  body('player2Id').isMongoId().withMessage('Invalid player ID'),
];

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
