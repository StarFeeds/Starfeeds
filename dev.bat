@echo off
REM Start backend
echo Starting backend...
cd backend
start "StarFeeds Backend" .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000

timeout /t 3

REM Start frontend
echo Starting frontend...
cd ..\frontend
start "StarFeeds Frontend" npm run dev

echo.
echo Backend: http://localhost:8000 (API docs at /docs)
echo Frontend: http://localhost:3000
echo.
echo Demo Login: demo@starfeeds.app / password123
