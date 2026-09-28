; electron-builder's default process check filters by the installer's user.
; That misses an older BenchFlow started with administrator privileges.
!macro customCheckAppRunning
  ; The installer is BenchFlow-Setup-*.exe, so this cannot terminate itself.
  nsExec::ExecToLog '$SYSDIR\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Pop $0
  ; Give Windows time to release the executable and child process handles.
  Sleep 1500
!macroend
