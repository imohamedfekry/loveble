param(
  [string]$Url = "https://loveble.app"
)

$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

$browser = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browser) {
  throw "Chrome or Edge was not found."
}

$profile = Join-Path $env:LOCALAPPDATA "loveble-dev-browser"
$rules = "MAP loveble.app 127.0.0.1, MAP *.loveble.app 127.0.0.1"
$arguments = @(
  "--host-resolver-rules=`"$rules`"",
  "--user-data-dir=`"$profile`"",
  "--new-window",
  $Url
)

Start-Process -FilePath $browser -ArgumentList $arguments
