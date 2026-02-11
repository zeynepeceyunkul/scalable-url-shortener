# Port 3000'i kullanan islemi bul ve kapat (Windows PowerShell)
$port = 3000
$conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($conn) {
  $pid = $conn.OwningProcess | Select-Object -First 1 -Unique
  Write-Host "Port $port kullanan PID: $pid"
  Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  Write-Host "Islem sonlandirildi."
} else {
  Write-Host "Port $port kullanan islem bulunamadi."
}
