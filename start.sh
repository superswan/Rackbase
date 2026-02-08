#!/bin/bash
# Rackbase Startup Script for Linux/macOS

echo "========================================"
echo "  Rackbase - Starting Servers"
echo "========================================"
echo ""

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set defaults
BACKEND_PORT=${BACKEND_PORT:-8088}
BACKEND_HOST=${BACKEND_HOST:-0.0.0.0}
FRONTEND_PORT=${FRONTEND_PORT:-3036
FRONTEND_HOST=${FRONTEND_HOST:-0.0.0.0}

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    exit 1
fi
echo "Python: $(python3 --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    exit 1
fi
echo "Node.js: $(node --version)"
echo ""

echo "Configuration:"
echo "  Backend:  $BACKEND_HOST:$BACKEND_PORT"
echo "  Frontend: $FRONTEND_HOST:$FRONTEND_PORT"
echo ""

# Start backend
echo "Starting Backend Server..."
python3 -m uvicorn main:app --reload --port $BACKEND_PORT --host $BACKEND_HOST &
BACKEND_PID=$!

# Start frontend with correct port
echo "Starting Frontend Server..."
cd frontend
npm run dev -- --port $FRONTEND_PORT --hostname $FRONTEND_HOST &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "  Servers Started!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "Press Ctrl+C to stop..."
echo ""

# Handle shutdown
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'; exit 0" INT

# Wait
wait
