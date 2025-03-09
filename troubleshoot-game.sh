#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Cozen Boardgame.io Troubleshooting ===${NC}\n"

# Check if the directory exists
echo -e "${BLUE}Checking directory structure...${NC}"
if [ -d "src/boardgame" ]; then
  echo -e "  ${GREEN}✓ src/boardgame directory exists${NC}"
else
  echo -e "  ${RED}✗ src/boardgame directory not found${NC}"
  exit 1
fi

# Check boardgame.io version
echo -e "\n${BLUE}Checking boardgame.io version...${NC}"
BOARDGAME_VERSION=$(npm list boardgame.io --json | grep version | head -1 | awk -F'"' '{print $4}')
echo -e "  boardgame.io version: ${GREEN}$BOARDGAME_VERSION${NC}"

if [[ $(echo "$BOARDGAME_VERSION" | cut -d. -f1) -eq 0 && $(echo "$BOARDGAME_VERSION" | cut -d. -f2) -lt 40 ]]; then
  echo -e "  ${RED}✗ Version too old. Updated version required (>=0.44.0)${NC}"
  echo -e "  ${YELLOW}Run: npm install boardgame.io@^0.44.0 --save${NC}"
else
  echo -e "  ${GREEN}✓ Version is compatible${NC}"
fi

# Check key files
echo -e "\n${BLUE}Checking key files...${NC}"
FILES=("src/boardgame/CozenGame.ts" "src/boardgame/moves.ts" "src/boardgame/setup.ts" "src/boardgame/components/EnhancedBoard.tsx")
ALL_FILES_EXIST=true

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓ $file exists${NC}"
  else
    echo -e "  ${RED}✗ $file not found${NC}"
    ALL_FILES_EXIST=false
  fi
done

if [ "$ALL_FILES_EXIST" = false ]; then
  echo -e "  ${RED}Some required files are missing${NC}"
else
  echo -e "  ${GREEN}All required files exist${NC}"
fi

# Check if dist directory exists
echo -e "\n${BLUE}Checking build output...${NC}"
if [ -d "dist/boardgame" ]; then
  echo -e "  ${GREEN}✓ dist/boardgame directory exists${NC}"
  
  if [ -f "dist/boardgame/bundle.js" ]; then
    echo -e "  ${GREEN}✓ Bundle file exists${NC}"
    BUNDLE_SIZE=$(du -h dist/boardgame/bundle.js | cut -f1)
    echo -e "  Bundle size: ${BUNDLE_SIZE}"
  else
    echo -e "  ${RED}✗ dist/boardgame/bundle.js not found${NC}"
    echo -e "  ${YELLOW}Run: npm run build:boardgame${NC}"
  fi
else
  echo -e "  ${RED}✗ dist/boardgame directory not found${NC}"
  echo -e "  ${YELLOW}Run: mkdir -p dist/boardgame && npm run build:boardgame${NC}"
fi

# Check ports
echo -e "\n${BLUE}Checking if ports are available...${NC}"
PORT_8000=$(lsof -i:8000 -t)
PORT_8001=$(lsof -i:8001 -t)

if [ -z "$PORT_8000" ]; then
  echo -e "  ${GREEN}✓ Port 8000 is available${NC}"
else
  echo -e "  ${RED}✗ Port 8000 is in use (PID: $PORT_8000)${NC}"
  echo -e "  ${YELLOW}Run: kill $PORT_8000${NC}"
fi

if [ -z "$PORT_8001" ]; then
  echo -e "  ${GREEN}✓ Port 8001 is available${NC}"
else
  echo -e "  ${RED}✗ Port 8001 is in use (PID: $PORT_8001)${NC}"
  echo -e "  ${YELLOW}Run: kill $PORT_8001${NC}"
fi

# Check if webpack-dev-server is installed
echo -e "\n${BLUE}Checking webpack dependencies...${NC}"
if npm list webpack-dev-server --json | grep -q "webpack-dev-server"; then
  echo -e "  ${GREEN}✓ webpack-dev-server is installed${NC}"
else
  echo -e "  ${RED}✗ webpack-dev-server is not installed${NC}"
  echo -e "  ${YELLOW}Run: npm install --save-dev webpack-dev-server${NC}"
fi

# Summary
echo -e "\n${YELLOW}=== Recommendation ===${NC}"
if [ "$ALL_FILES_EXIST" = true ] && [ -f "dist/boardgame/bundle.js" ] && [ -z "$PORT_8000" ] && [ -z "$PORT_8001" ]; then
  echo -e "${GREEN}All checks passed! Try running one of these commands:${NC}"
  echo -e "${BLUE}  Development mode:${NC} npm run dev:boardgame"
  echo -e "${BLUE}  Production mode:${NC} npm run start:boardgame"
  echo -e "${BLUE}  Direct file access:${NC} open cozen-game.html"
else
  echo -e "${YELLOW}Some issues were detected. Fix them and try again.${NC}"
  echo -e "${BLUE}The best approach is usually:${NC}"
  echo -e "1. Install required dependencies:"
  echo -e "   ${YELLOW}npm install boardgame.io@^0.44.0 --save${NC}"
  echo -e "   ${YELLOW}npm install --save-dev webpack-dev-server webpack-cli ts-loader${NC}"
  echo -e "2. Build the game:"
  echo -e "   ${YELLOW}npm run build:boardgame${NC}"
  echo -e "3. Try development mode first:"
  echo -e "   ${YELLOW}npm run dev:boardgame${NC}"
fi