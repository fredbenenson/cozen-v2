# Cozen Game Project Guide

This document serves as a guide for Claude when working on the Cozen card game project. It captures project details, code organization, development preferences, and common workflows.

## Project Overview

Cozen is a strategy card game with the following characteristics:
- Two players: Red, and Black
- When playing against AI, the human plays as Red, and the AI as Black
- Played on a grid-based board
- Uses custom card mechanics with stakes and wagers
- Built with React, TypeScript, and boardgame.io

## Architecture

### Framework & Technologies
- **Frontend**: React 17
- **State Management**: boardgame.io
- **Language**: TypeScript with strict mode
- **Styling**: CSS with component-scoped styles
- **Testing**: Jest

### Directory Structure
- `src/ai/`: AI implementation for the game
- `src/components/`: React components for UI
- `src/game/`: Core game logic and boardgame.io setup
- `src/services/`: Business logic and game services
- `src/types/`: TypeScript definitions
- `src/utils/`: Helper functions
- `src/tests/`: Test files

## Code Style Preferences

### Component Organization
- Components are modular and focused on a single responsibility
- Prefer smaller components over large, monolithic ones
- Component logic should be separated from presentation when possible
- Avoid unnecessary wrappers/divs ("div soup")
- Adhere to DRY (Don't Repeat Yourself) principles both in backend logic and UI components

### TypeScript Usage
- Use proper TypeScript typing for all functions and components
- Prefer interfaces over types for object definitions
- Use type guards to handle null/undefined cases
- Avoid using `any` type when possible

### Functional Programming Approach
- Prefer functional components over class components
- Use hooks for state and side effects
- Pure functions are preferred where possible
- Avoid mutation of state objects

### Naming Conventions
- PascalCase for component names
- camelCase for variables, functions, and instances
- Descriptive names over abbreviations
- Logical grouping in imports

### Code Organization
- Don't introduce unnecessary abstractions or "overengineer"
- Prefer to fix the core issue rather than work around it
- Remove unused/debug code before committing
- Clear and descriptive comments where necessary

## AI Implementation

The game uses a custom AI implementation:
- Minimax algorithm for move evaluation
- Card evaluation based on value and position
- Configurable difficulty levels
- Integrated with boardgame.io via a custom bot interface

When working with the AI:
- Ensure moves are validated on both client and server sides
- Maintain state isolation during minimax tree search
- Use proper deep copying to prevent state corruption
- Log meaningful diagnostic information but suppress noisy AI logs during simulation

## Game State Management

- Game state managed through boardgame.io
- Turn order follows active/inactive player paradigm
- Important state validation happens in move functions
- Game phases handled through boardgame.io's phase mechanism
- Card movement updates both the board and player hands

## Development Workflow

### Testing Changes
1. Run `npm run build` to check for TypeScript errors
2. Claude Code: DO NOT Run `npm start` as there is a development server running and Claude sessions will hang
3. Use `npm test` to run unit tests
4. Use boardgame.io debug panel to simulate AI moves and game states

### Debugging
- Use browser console for debugging
- Conditional logging with ENABLE_LOGGING flag
- AI logs can be controlled with suppressAILogs/showAILogs functions
- Use boardgame.io debug panel to inspect game state

### Fixing Bugs
1. Understand the root cause before implementing fixes
2. Identify the source of errors using console logs
3. Create minimal, targeted fixes rather than broad changes
4. Test extensively after making changes to ensure no regressions

## Working Preferences

When working on this project:

1. **Think before coding**:
   - Take time to understand the problem deeply
   - Consider multiple solutions and their tradeoffs
   - Explain your reasoning before implementing any code changes

2. **Focused changes**:
   - Prefer targeted fixes over broad refactoring
   - Don't add extra features/complexity unless requested
   - Remove console.log statements and debug code when no longer needed
   - Remove comments that are no longer relevant or are not adjacent to the code they describe

3. **Explain complexity**:
   - When working with complex algorithms or patterns, provide clear explanations
   - Use diagrams or step-by-step descriptions for complex logic

4. **Code quality**:
   - Maintainability is prioritized over clever solutions
   - Readability matters more than brevity
   - Avoid introducing external dependencies when possible
   - Remove dead/commented code rather than leaving it in

5. **Communication style**:
   - Direct and concise explanations are preferred
   - Provide technical details when needed
   - Focus on the core issues rather than extensive preambles
   - When explaining technical concepts, provide context and examples

## Common Commands

```bash
# Build project
npm run build

# Run tests
npm test

# Run specific tests
npm test -- -t "test name"

# Typecheck only
tsc --noEmit
```

## Special Notes

- The AI (Black player) should always go first in a new game
- NEVER change game rules when fixing implementation issues
- boardgame.io's API has specific quirks that need special handling
- Turn advancement needs careful handling in the CozenGame.ts file
- Console logging should be controlled to prevent flooding during AI simulations

## Architecture Decisions

1. **Custom Bot Implementation**: Using our own CozenBot instead of boardgame.io's MCTSBot to ensure proper state handling during simulation.

2. **Component Refactoring**: The Board.tsx component was refactored into smaller components for maintainability.

3. **Type Enforcement**: All game objects have strong typing to ensure correctness.

4. **Game State Structure**: The game state is structured to match our internal model while still working with boardgame.io's requirements.

5. **AI Difficulty**: The AI difficulty can be adjusted through search depth and move selection parameters.

## TypeScript Migration Notes

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

## Recent Work

1. **AI Implementation**:
   - Implemented a custom CozenBot to replace MCTSBot
   - Used proper deep cloning for game state during minimax search
   - Added debugging capabilities to track AI decision making
   - Fixed turn advancement issues related to player state synchronization

2. **Component Refactoring**:
   - Split Board.tsx into multiple smaller components
   - Created proper type interfaces for component props
   - Ensured consistent state management across components
   - Improved UI interaction and feedback

3. **Performance Optimization**:
   - Added logging controls to reduce console noise during AI simulations
   - Improved type safety throughout the codebase
   - Fixed memory issues related to state mutations in AI simulation
