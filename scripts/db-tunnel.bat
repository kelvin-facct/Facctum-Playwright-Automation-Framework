@echo off
REM Database Tunnel Script
REM Opens an SSM port forwarding session to the RDS database
REM 
REM Usage: scripts\db-tunnel.bat
REM Keep this terminal open while running tests that need database access

set PROFILE=FacctumSSMAccess-102212213552
set INSTANCE_ID=i-08913ded80964ec8a
set RDS_HOST=dev-facctum-db.c9wassa8mhfh.ap-south-1.rds.amazonaws.com
set RDS_PORT=5432
set LOCAL_PORT=2345

echo ============================================
echo   Facctum Database Tunnel
echo ============================================
echo.
echo Profile:    %PROFILE%
echo Instance:   %INSTANCE_ID%
echo RDS Host:   %RDS_HOST%
echo Local Port: %LOCAL_PORT%
echo.

echo Step 1: Logging in via AWS SSO...
aws sso login --profile %PROFILE%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: SSO login failed
    pause
    exit /b 1
)

echo.
echo Step 2: Starting port forwarding session...
echo Keep this window open to maintain the tunnel.
echo Press Ctrl+C to close the tunnel.
echo.

aws ssm start-session ^
    --target %INSTANCE_ID% ^
    --document-name AWS-StartPortForwardingSessionToRemoteHost ^
    --parameters portNumber=%RDS_PORT%,localPortNumber=%LOCAL_PORT%,host=%RDS_HOST% ^
    --profile %PROFILE%

pause
