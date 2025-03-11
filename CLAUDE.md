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

1. TestClient.ts and MinimalTest.ts:
   - Incompatibilities with newer boardgame.io interfaces
   - Need to update setup function signature

## Fixed Issues

1. CLI.ts:
   - Added AIMove interface to properly type AI move options
   - Fixed type casting for move properties

2. Board.tsx:
   - Fixed type compatibility with Position interface
   - Added null checks and undefined handling
   - Fixed function parameter types
   - Updated move handling to work with void return types

## Next Steps

1. Update test files to match new boardgame.io interfaces
   - Either update TestClient.ts and MinimalTest.ts
   - Or ignore them for now if they're only used for testing

2. Consider adding additional compiler options to enforce better practices:
   - strictNullChecks
   - strictPropertyInitialization
   - strictBindCallApply

3. Extend type safety to more files in the codebase

## Useful Commands

- Run TypeScript build to check for errors:
  ```bash
  npm run build
  ```

- Run tests after fixing types:
  ```bash
  npm run test
  ```