Last login: Fri Mar  7 12:16:38 on ttys006
The buffalo isn't as dangerous as everyone makes him out to be.
Statistics prove that in the United States more Americans are killed in
automobile accidents than are killed by buffalo.
		-- Art Buchwald
{13:35}[3.2.0]~/cozen/cozen-v2:boardgame-io ✗ ➭ npm run cli
npm error Missing script: "cli"
npm error
npm error Did you mean this?
npm error   npm ci # Clean install a project
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: /Users/fredbenenson/.npm/_logs/2025-03-07T18_35_10_915Z-debug-0.log
{13:35}[3.2.0]~/cozen/cozen-v2:boardgame-io ✗ ➭ npm run cli
{13:35}[3.2.0]~/cozen/cozen-v2:boardgame-io ✗ ➭ git add .
{13:35}[3.2.0]~/cozen/cozen-v2:boardgame-io ✗ ➭ git status
On branch boardgame-io
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	modified:   .gitignore
	modified:   README.md
	new file:   migration-plan/BOARDGAME-IO-AI-INTEGRATION.md
	new file:   migration-plan/EXAMPLE-IMPLEMENTATION.ts
	new file:   migration-plan/MIGRATION-PLAN.md
	modified:   package-lock.json
	modified:   package.json
	new file:   src/boardgame/CozenClient.tsx
	new file:   src/boardgame/CozenGame.ts
	new file:   src/boardgame/README.md
	new file:   src/boardgame/TestClient.ts
	new file:   src/boardgame/ai.html
	new file:   src/boardgame/ai/enumerate.ts
	new file:   src/boardgame/board.html
	new file:   src/boardgame/components/Board.tsx
	new file:   src/boardgame/index.html
	new file:   src/boardgame/index.tsx
	new file:   src/boardgame/local.html
	new file:   src/boardgame/moves.ts
	new file:   src/boardgame/server.ts
	new file:   src/boardgame/setup.ts
	new file:   src/boardgame/simple-server.js
	new file:   src/boardgame/testing/MinimalTest.ts
	new file:   src/boardgame/turnOrder.ts
	new file:   src/boardgame/types/board-game-io.d.ts
	new file:   src/boardgame/types/index.ts
	new file:   src/boardgame/utils/boardUtils.ts
	new file:   src/boardgame/utils/cardEvaluation.ts
	new file:   src/boardgame/utils/deckUtils.ts
	modified:   tsconfig.json
	new file:   webpack.config.js

{13:35}[3.2.0]~/cozen/cozen-v2:boardgame-io ✗ ➭ git commit -m "Boardgame IO attempt."
[boardgame-io 8a10693] Boardgame IO attempt.
 31 files changed, 8996 insertions(+), 1912 deletions(-)
 create mode 100644 migration-plan/BOARDGAME-IO-AI-INTEGRATION.md
 create mode 100644 migration-plan/EXAMPLE-IMPLEMENTATION.ts
 create mode 100644 migration-plan/MIGRATION-PLAN.md
 create mode 100644 src/boardgame/CozenClient.tsx
 create mode 100644 src/boardgame/CozenGame.ts
 create mode 100644 src/boardgame/README.md
 create mode 100644 src/boardgame/TestClient.ts
 create mode 100644 src/boardgame/ai.html
 create mode 100644 src/boardgame/ai/enumerate.ts
 create mode 100644 src/boardgame/board.html
 create mode 100644 src/boardgame/components/Board.tsx
 create mode 100644 src/boardgame/index.html
 create mode 100644 src/boardgame/index.tsx
 create mode 100644 src/boardgame/local.html
 create mode 100644 src/boardgame/moves.ts
 create mode 100644 src/boardgame/server.ts
 create mode 100644 src/boardgame/setup.ts
 create mode 100644 src/boardgame/simple-server.js
 create mode 100644 src/boardgame/testing/MinimalTest.ts
 create mode 100644 src/boardgame/turnOrder.ts
 create mode 100644 src/boardgame/types/board-game-io.d.ts
 create mode 100644 src/boardgame/types/index.ts
 create mode 100644 src/boardgame/utils/boardUtils.ts
 create mode 100644 src/boardgame/utils/cardEvaluation.ts
 create mode 100644 src/boardgame/utils/deckUtils.ts
 create mode 100644 webpack.config.js
{13:35}[3.2.0]~/cozen/cozen-v2:boardgame-io ✓ ➭ git checkout master
error: pathspec 'master' did not match any file(s) known to git

====================================================================================================
                                  COZEN GAME STATE
====================================================================================================

SCORES:
Black: 0   Red: 0

ACTIVE PLAYER:  BLACK

 BLACK PLAYER
➤ Hand: 7♣ (7) J♠ (11) 5♠ (5) 7♠ (7) 5♣ (5)
  Stakes available: 0, 1, 2, 3
  Jail: empty
  Deck remaining: 20

BOARD:
       0   1   2   3   4   5   6   7   8   9
       ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓
 1 B: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]
 2 B: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]
 3 B: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]
 4 B: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]
S:    [ ] [ ] [ ] [ ] 8♣  A♦ [ ] [ ] [ ] [ ]
 1 R: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]
 2 R: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]
 3 R: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]
 4 R: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]

 RED PLAYER
  Hand: 2♥ (2) 10♦ (10) 4♦ (4) 3♦ (3) 8♥ (8)
  Stakes available: 6, 7, 8, 9
  Jail: empty
  Deck remaining: 20

COMMANDS:
  stake <card_number> <column>     e.g. "stake 5 3"
  play <card_number>,... <column>  e.g. "play 7,8 0"
  help                             Show this help text
  quit                             Exit the game
====================================================================================================
AI is thinking...

=== AI's Top Moves ===
→ 1. Play 5,5,7,7 to column 4 (Score: 12.00)
  2. Play 5,5,7,7 to column 5 (Score: 12.00)
  3. Play 11,5,5,7,7 to column 4 (Score: 12.00)
  4. Play 11,5,5,7,7 to column 5 (Score: 12.00)
  5. Play 5,5,7 to column 4 (Score: 10.00)
  6. Play 5,5,7 to column 4 (Score: 10.00)
  7. Play 11,5,5,7 to column 4 (Score: 10.00)
  8. Play 11,5,5,7 to column 4 (Score: 10.00)
  9. Play 7,7 to column 4 (Score: 6.00)
  10. Play 5,5 to column 4 (Score: 6.00)

AI will play to column 4 with 4 cards
Press Enter to continue...
