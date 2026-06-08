@echo off
chcp 65001 >nul
title ERP Platform - Demarrage
powershell.exe -NoExit -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
