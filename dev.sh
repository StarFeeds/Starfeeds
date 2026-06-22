#!/bin/bash
# Start backend in the background
echo "Starting backend..."
cd backend
./.venv/Scripts/uvicorn.exe app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm run dev

# Kill backend when frontend exits
kill $BACKEND_PID
