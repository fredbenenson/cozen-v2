#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting development server...${NC}"
echo -e "${GREEN}This will automatically open your browser when ready${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server when done${NC}"

# Start the webpack dev server
npm run dev:boardgame