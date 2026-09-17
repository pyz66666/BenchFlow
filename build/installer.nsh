!macro customInit
  ; 安装前强制关闭旧进程
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe'
  Pop $0
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe /T'
  Pop $0
  Sleep 1000
!macroend

!macro customInstall
  ; 安装过程中再次确保进程关闭
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe'
  Pop $0
!macroend
