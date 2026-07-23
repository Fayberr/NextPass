$dir = "C:\Users\derfa\ai-workspace\browser-profile-e2e"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--remote-debugging-port=9222", "--user-data-dir=`"$dir`"", "--load-extension=`"C:\Users\derfa\pm-extension`"", "--no-first-run", "--no-default-browser-check", "--disable-gpu"
