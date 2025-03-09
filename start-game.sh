#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command was successful
check_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
    echo -e "${YELLOW}Try running 'npm install' to ensure all dependencies are installed${NC}"
    exit 1
  fi
}

# Print a step message
step() {
  echo -e "${YELLOW}==>${NC} $1"
}

# Create dist directory if it doesn't exist
step "Creating dist directory if needed..."
mkdir -p dist/boardgame

# Build the webpack bundle
step "Building game with webpack..."
npm run build:boardgame
check_result

# Start the server in the background
step "Starting server..."
npm run start:boardgame &
SERVER_PID=$!

# Wait for the server to start
step "Waiting for server to start..."
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
  echo -e "${GREEN}✓ Server is running${NC}"
  
  # Open the browser to the game
  step "Opening game in browser..."
  open http://localhost:8000/
  
  # Show instructions for stopping the server
  echo -e "\n${YELLOW}The server is running in the background.${NC}"
  echo -e "To stop the server, press ${RED}Ctrl+C${NC} or run: ${YELLOW}kill $SERVER_PID${NC}\n"
  
  # Keep script running so server stays alive
  wait $SERVER_PID
else
  echo -e "${RED}✗ Server failed to start${NC}"
  echo -e "${YELLOW}Check the logs above for errors${NC}"
  exit 1
fi