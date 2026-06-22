# Start the local StarFeeds Postgres running inside WSL2 (Ubuntu-22.04).
# This WSL distro has no systemd, so Postgres does not auto-start on boot.
# Run this once per Windows session before starting the backend:
#   pwsh backend/scripts/start-db.ps1
$ErrorActionPreference = 'Stop'

wsl -d Ubuntu-22.04 -u root -- pg_ctlcluster 14 main start 2>$null
wsl -d Ubuntu-22.04 -u root -- pg_lsclusters

# Confirm Windows can reach it over the forwarded localhost port.
try {
    $c = New-Object Net.Sockets.TcpClient
    $c.Connect('localhost', 5432)
    $c.Close()
    Write-Host 'Postgres reachable at localhost:5432' -ForegroundColor Green
} catch {
    Write-Host 'Postgres NOT reachable at localhost:5432.' -ForegroundColor Red
    Write-Host 'If this persists, run `wsl --shutdown` and re-run this script to reset WSL port forwarding.' -ForegroundColor Yellow
    exit 1
}
