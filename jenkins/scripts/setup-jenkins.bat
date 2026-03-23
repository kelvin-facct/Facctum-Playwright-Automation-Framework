@echo off
REM Jenkins Local Setup Script for Windows
REM This script helps set up Jenkins locally for the Playwright BDD test framework

setlocal enabledelayedexpansion

echo ============================================
echo  Jenkins Local Setup for Playwright Tests
echo ============================================
echo.

REM Check for Java
where java >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Java is not installed or not in PATH
    echo Please install Java 11 or higher from: https://adoptium.net/
    pause
    exit /b 1
)

echo [OK] Java found
java -version 2>&1 | findstr /i "version"
echo.

REM Create Jenkins directory
set JENKINS_HOME=%USERPROFILE%\.jenkins-local
if not exist "%JENKINS_HOME%" (
    echo Creating Jenkins home directory: %JENKINS_HOME%
    mkdir "%JENKINS_HOME%"
)

REM Check if Jenkins WAR exists
set JENKINS_WAR=%JENKINS_HOME%\jenkins.war
if not exist "%JENKINS_WAR%" (
    echo.
    echo Jenkins WAR not found. Downloading...
    echo This may take a few minutes...
    
    REM Try curl first, then PowerShell
    where curl >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        curl -L https://get.jenkins.io/war-stable/latest/jenkins.war -o "%JENKINS_WAR%"
    ) else (
        powershell -Command "Invoke-WebRequest -Uri 'https://get.jenkins.io/war-stable/latest/jenkins.war' -OutFile '%JENKINS_WAR%'"
    )
    
    if not exist "%JENKINS_WAR%" (
        echo [ERROR] Failed to download Jenkins
        echo Please download manually from: https://www.jenkins.io/download/
        pause
        exit /b 1
    )
    echo [OK] Jenkins downloaded successfully
) else (
    echo [OK] Jenkins WAR found at %JENKINS_WAR%
)

echo.
echo ============================================
echo  Starting Jenkins
echo ============================================
echo.
set JENKINS_PORT=9090

echo Jenkins will start on: http://localhost:%JENKINS_PORT%
echo Jenkins home: %JENKINS_HOME%
echo.
echo First-time setup:
echo   1. Wait for Jenkins to start (watch for "Jenkins is fully up and running")
echo   2. Open http://localhost:%JENKINS_PORT% in your browser
echo   3. Get the initial password from the console output below
echo   4. Install suggested plugins
echo   5. Create your admin user
echo.
echo Press Ctrl+C to stop Jenkins
echo ============================================
echo.

REM Start Jenkins
java -DJENKINS_HOME="%JENKINS_HOME%" -jar "%JENKINS_WAR%" --httpPort=%JENKINS_PORT%
