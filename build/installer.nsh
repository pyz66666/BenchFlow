!macro customInit
  ; 安装前关闭所有 BenchFlow 相关进程（含子进程）
  nsExec::ExecToLog 'powershell -NoProfile -Command "Get-Process | Where-Object { $_.ProcessName -like ''*BenchFlow*'' -or $_.ProcessName -like ''*electron*'' } | Stop-Process -Force -ErrorAction SilentlyContinue"'
  Pop $0
  Sleep 2000

  ; 兜底再杀一次
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe /T'
  Pop $0
  nsExec::ExecToLog 'taskkill /F /IM "BenchFlow.exe" /T'
  Pop $0
  Sleep 1000
!macroend
