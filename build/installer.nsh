; electron-builder's default process check filters by the installer's user.
; That misses an older BenchFlow started with administrator privileges.
!macro customCheckAppRunning
  ; Kill the main executable and its entire process tree.
  nsExec::ExecToLog '$SYSDIR\cmd.exe /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Pop $0
  ; Legacy releases used DoInPXE.exe before the product rename.
  nsExec::ExecToLog '$SYSDIR\cmd.exe /c taskkill /F /T /IM "DoInPXE.exe"'
  Pop $0
  ; Kill any lingering Electron helper subprocesses that may hold file handles.
  nsExec::ExecToLog '$SYSDIR\cmd.exe /c taskkill /F /T /IM "BenchFlow Helper.exe"'
  Pop $0
  nsExec::ExecToLog '$SYSDIR\cmd.exe /c taskkill /F /T /IM "BenchFlow Helper (GPU).exe"'
  Pop $0
  nsExec::ExecToLog '$SYSDIR\cmd.exe /c taskkill /F /T /IM "BenchFlow Helper (Renderer).exe"'
  Pop $0
  nsExec::ExecToLog '$SYSDIR\cmd.exe /c taskkill /F /T /IM "BenchFlow Helper (Utility).exe"'
  Pop $0
  ; Give Windows enough time to fully release all executable and DLL handles.
  Sleep 3000
!macroend
