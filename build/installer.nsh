!macro customInit
  ; 安装前关闭已安装的 BenchFlow 进程
  ; 按可执行文件路径匹配，避免误杀安装器自身
  nsExec::ExecToLog 'powershell -Command "Get-Process BenchFlow -ErrorAction SilentlyContinue | Where-Object { $_.Path -ne $EXEPATH } | Stop-Process -Force"'
  Pop $0
  Sleep 1000

  ; 兜底：再杀一次所有 BenchFlow 进程（安装器自身是临时文件名不会受影响）
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe'
  Pop $0
  Sleep 500
!macroend
