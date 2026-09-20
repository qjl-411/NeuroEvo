@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo NeuroEvo-AD - Localize open-access literature PDFs
echo This command is resumable. You can safely run it again later.
echo ============================================================
python apps\api\scripts\localize_literature_pdfs.py --all --workers 4 --retries 2 --timeout 60
if errorlevel 1 (
  echo.
  echo PDF localization exited with an error. Check Python dependencies and network access.
) else (
  echo.
  echo PDF localization finished. Restart the API if it is currently running.
)
pause
endlocal
