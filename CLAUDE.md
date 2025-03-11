# TypeScript Strict Mode Migration

This document tracks the progress of migrating the codebase to strict TypeScript mode.

## Changes Made (strict-typescript branch)

1. Enabled strict mode in tsconfig.json:
   ```json
   "strict": true,
   "noImplicitAny": true
   ```

2. Created proper type definitions for boardgame.io in src/types/boardgame.io.d.ts
   - Added interfaces for Game, Ctx, and other core boardgame.io types
   - Added typings for all boardgame.io modules

3. Fixed CozenGame.ts:
   - Added proper return types to all functions
   - Fixed function parameter types
   - Added proper type signatures for boardgame.io callbacks
   - Added explicit return types

4. Fixed enumerate.ts in AI:
   - Added proper types for Card objects
   - Fixed function signatures
   - Made playerID optional with type guards

5. Updated Board.tsx:
   - Fixed parameter types for callbacks
   - Added proper typings to handlers

## Remaining Issues

1. CLI.ts (5 errors):
   - Property access on 'never' types
   - Need to properly type AI move options

2. Board.tsx (6 errors):
   - Type compatibility with Position interface
   - Optional properties not being checked for undefined
   - Type mismatches in function calls

3. TestClient.ts and MinimalTest.ts:
   - Incompatibilities with newer boardgame.io interfaces
   - Need to update setup function signature

## Next Steps

1. Finish fixing the Board.tsx component issues
2. Fix CLI.ts type errors 
3. Update test files to match new boardgame.io interfaces
4. Consider adding additional compiler options to enforce better practices:
   - strictNullChecks
   - strictPropertyInitialization
   - strictBindCallApply

## Useful Commands

- Run TypeScript build to check for errors:
  ```bash
  npm run build
  ```

- Run tests after fixing types:
  ```bash
  npm run test
  ```