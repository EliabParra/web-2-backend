Set UAC = CreateObject("Shell.Application")
' El parámetro "runas" pide permisos de administrador. El "0" lo mantiene oculto.
UAC.ShellExecute "cmd.exe", "/c deploy.bat", "", "runas", 0
