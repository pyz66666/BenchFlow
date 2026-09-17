!macro customInit
  ; 强制关闭所有 BenchFlow 相关进程，不弹窗
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe /T'
  Pop $0
  nsExec::ExecToLog 'taskkill /F /IM "BenchFlow.exe" /T'
  Pop $0
  ; 等1秒确保进程完全退出
  Sleep 1500
!macroend

!macro customInstall
  ; 安装过程中再次确保进程关闭
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe /T'
  Pop $0
  Sleep 500
!macroend
