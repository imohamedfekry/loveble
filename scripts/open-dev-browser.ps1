param(
  [string]$Url = "https://loveble.app",
  [switch]$Restart
)

$edgeCandidates = @(
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)

$browser = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$processName = "msedge"
if (-not $browser) {
  $browser = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  $processName = "chrome"
}
if (-not $browser) {
  throw "Edge or Chrome was not found."
}

$running = Get-Process -Name $processName -ErrorAction SilentlyContinue
if ($running) {
  if (-not $Restart) {
    $answer = Read-Host "Edge/Chrome is already running. It must restart so the local domain mapping applies. Restart now? (y/N)"
    if ($answer -notmatch "^(y|yes)$") {
      Write-Host "Cancelled. Close the browser and run this again."
      exit 0
    }
  }

  Stop-Process -Name $processName -Force -ErrorAction SilentlyContinue
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Process -Name $processName -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }
}

$rules = "MAP loveble.app 127.0.0.1, MAP *.loveble.app 127.0.0.1"
$arguments = @(
  "--host-resolver-rules=`"$rules`"",
  $Url
)

Start-Process -FilePath $browser -ArgumentList $arguments
