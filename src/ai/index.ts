// Main exports for AI package
import { CozenAI } from './cozenAI';
import { AIDifficulty, AIMove, AIDecisionResult } from './aiTypes';
import * as aiUtils from './aiUtils';

// Export the AI classes and types
export {
  CozenAI,
  AIDifficulty,
  AIMove,
  AIDecisionResult,
  aiUtils
};

// Export default CozenAI for convenience
export default CozenAI;