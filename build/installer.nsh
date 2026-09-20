!macro customInit
  ; 仅关闭正在运行的应用，不能按产品名前缀匹配，否则会终止安装器自身。
  nsExec::ExecToLog 'taskkill /F /IM BenchFlow.exe /T'
  Pop $0
  Sleep 1000
!macroend
