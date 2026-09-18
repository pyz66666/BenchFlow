!macro customInit
  ; 安装前关闭所有 BenchFlow 相关进程
  nsExec::ExecToLog 'powershell -NoProfile -Command "Get-Process -Name *BenchFlow* -ErrorAction SilentlyContinue | Stop-Process -Force"'
  Pop $0
  Sleep 1000
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe /T'
  Pop $0
  Sleep 1000
!macroend
