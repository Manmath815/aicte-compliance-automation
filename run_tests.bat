@echo off
echo ========================================================
echo Running AICTE SmartFlow Automated Test Suite...
echo ========================================================
cd backend
python -m pytest tests/test_all.py -v
pause
