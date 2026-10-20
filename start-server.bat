@echo off
rem Double-click to start the stand-in J2 server for phone testing.
cd /d "%~dp0j2-mock"

set PY=
where py >nul 2>nul && set PY=py
if not defined PY where python >nul 2>nul && set PY=python
if not defined PY (
  echo Python was not found. Install it from https://www.python.org/downloads/
  echo and tick "Add python.exe to PATH" during setup, then run this again.
  pause
  exit /b 1
)

%PY% --version
%PY% -m pip install --disable-pip-version-check -q -r requirements.txt || goto failed
%PY% manage.py migrate -v 0 || goto failed
%PY% manage.py seed || goto failed

echo.
echo Server starting. Keep this window open.
echo On the phone, use this laptop's address followed by :8000
echo   Tailscale: the 100.x.x.x address in the Tailscale app
echo   Same Wi-Fi: the IPv4 Address below
ipconfig | findstr /c:"IPv4"
echo.
%PY% manage.py runserver 0.0.0.0:8000

:failed
echo.
echo Something went wrong. Send a screenshot of this window.
pause
