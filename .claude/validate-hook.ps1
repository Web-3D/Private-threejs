# validate-hook.ps1 — PostToolUse hook: auto-validate sau Write/Edit
# Chạy bởi Claude Code sau mỗi lần Write hoặc Edit tool

$raw = [Console]::In.ReadToEnd()
try {
  $json = $raw | ConvertFrom-Json
} catch {
  exit 0
}

$fp = $json.tool_input.file_path
if (-not $fp) { exit 0 }

# Tìm root folder của asset hoặc module
$root = $null
if ($fp -match '(.*?\\assets\\[^\\]+\\[^\\]+)') {
  $root = $Matches[1]
} elseif ($fp -match '(.*?\\threejs-modules\\[^\\]+\\[^\\]+)') {
  $root = $Matches[1]
}

if (-not $root) { exit 0 }
if (-not (Test-Path $root)) { exit 0 }

Push-Location 'c:\DEV WEB\THREEJS'
node validate.js $root
Pop-Location
