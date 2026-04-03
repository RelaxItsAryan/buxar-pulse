@echo off
REM Quick Setup Script for Map Integration (Windows)

echo.
echo 🗺️  Setting up Free Map Integration...
echo.

REM Install dependencies
echo 📦 Installing Leaflet and React Leaflet...
call npm install leaflet react-leaflet @types/leaflet

echo.
echo ✅ Installation Complete!
echo.
echo 🚀 Next Steps:
echo 1. Run: npm run dev
echo 2. Navigate to /map-explorer route
echo 3. Try searching for places in Buxar
echo.
echo 📖 Read MAP_INTEGRATION.md for full documentation
echo.
pause
