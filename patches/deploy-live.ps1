# Last modified: 2026-10-09--1330
# Deploy a tested app.asar to the live viewer (C:\marktext-viewer) and put the user's windows back.
#   pwsh -NoProfile -File deploy-live.ps1 -Asar <tested app.asar> -BackupSuffix 2026-10-09a
# - Backs up the live asar, kills the tray instance, copies, relaunches via the Startup shortcut
#   (the same way login starts it), retries until the named pipe answers.
# - Reopens the docs that were open (minimised ones first, re-minimised; visible ones last so they
#   end on top). Window titles only carry the file name, so the full path is resolved from
#   recently-used-documents.json, then -KnownDocs, then a shallow search of L:\PROJECTS.
param(
  [Parameter(Mandatory)][string]$Asar,
  [Parameter(Mandatory)][string]$BackupSuffix,
  [string[]]$KnownDocs = @()
)
$ErrorActionPreference = 'Stop'
$root = 'C:\marktext-viewer'; $R = "$root\resources"; $liveExe = "$root\MarkText.exe"; $open = "$root\marktext-open.exe"
Add-Type @"
using System; using System.Text; using System.Collections.Generic; using System.Runtime.InteropServices;
public static class MTWin {
  delegate bool CB(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(CB cb, IntPtr l);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  public static List<string> List(uint[] pids) {
    var r = new List<string>(); var set = new HashSet<uint>(pids);
    EnumWindows((h, l) => { uint pid; GetWindowThreadProcessId(h, out pid);
      if (set.Contains(pid) && IsWindowVisible(h)) { var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
        if (sb.ToString().EndsWith(" - MarkText Viewer")) r.Add(sb.ToString().Replace(" - MarkText Viewer", "") + "|" + (IsIconic(h) ? "min" : "open")); } return true; }, IntPtr.Zero);
    return r;
  }
}
"@
$livePids = { [uint32[]]@(Get-Process MarkText -EA SilentlyContinue | Where-Object { $_.Path -eq $liveExe } | ForEach-Object { $_.Id }) }
$windows = [MTWin]::List((& $livePids))
"open before deploy: " + ($windows -join ', ')

# Resolve full paths for the open docs.
$recent = @()
try { $recent = Get-Content "$env:APPDATA\marktext\recently-used-documents.json" -Raw | ConvertFrom-Json } catch {}
$resolve = {
  param($name)
  $hit = @($recent) + $KnownDocs | Where-Object { $_ -and [IO.Path]::GetFileName($_) -eq $name } | Select-Object -First 1
  if ($hit -and (Test-Path $hit)) { return $hit }
  $found = Get-ChildItem 'L:\PROJECTS' -Directory -EA SilentlyContinue | ForEach-Object { Join-Path $_.FullName $name } | Where-Object { Test-Path $_ } | Select-Object -First 1
  return $found
}
$plan = foreach ($w in $windows) { $name, $state = $w -split '\|'; [pscustomobject]@{ Name = $name; State = $state; Path = (& $resolve $name) } }
$plan | Where-Object { -not $_.Path } | ForEach-Object { "WARNING: can't find '$($_.Name)' to reopen it" }

# Swap the asar.
Copy-Item "$R\app.asar" "$R\app.asar.bak-$BackupSuffix" -Force
Get-Process MarkText -EA SilentlyContinue | Where-Object { $_.Path -eq $liveExe } | ForEach-Object { Stop-Process -Id $_.Id -Force -EA SilentlyContinue }
for ($i = 0; $i -lt 40 -and (& $livePids).Count; $i++) { Start-Sleep -Milliseconds 250 }
Copy-Item $Asar "$R\app.asar" -Force
if ((Get-FileHash $Asar).Hash -ne (Get-FileHash "$R\app.asar").Hash) { throw 'deployed asar differs from the tested one' }
"deployed (backup: app.asar.bak-$BackupSuffix)"

# Relaunch like login does; wait for the pipe.
$env:MARKTEXT_ERROR_INTERACTION = $null
$ok = $false
for ($attempt = 1; $attempt -le 3 -and -not $ok; $attempt++) {
  Start-Sleep 1
  Invoke-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\MarkText Viewer.lnk"
  for ($i = 0; $i -lt 40 -and -not $ok; $i++) {
    Start-Sleep -Milliseconds 250
    $c = New-Object System.IO.Pipes.NamedPipeClientStream('.', 'marktext-viewer', [System.IO.Pipes.PipeDirection]::Out)
    try { $c.Connect(200); $ok = $true } catch {} finally { $c.Dispose() }
  }
}
if (-not $ok) { throw 'viewer did not come back (pipe not answering)' }
"viewer running"
Start-Sleep 3 # pre-warmed window

# Reopen: minimised first (then re-minimise), visible last.
foreach ($d in @($plan | Where-Object { $_.Path -and $_.State -eq 'min' }) + @($plan | Where-Object { $_.Path -and $_.State -eq 'open' })) {
  & $open $d.Path | Out-Null
  Start-Sleep 2.5
  if ($d.State -eq 'min') {
    $p = Get-Process MarkText | Where-Object { $_.Path -eq $liveExe -and $_.MainWindowTitle -like "$($d.Name) - *" } | Select-Object -First 1
    if ($p) { [MTWin]::ShowWindow($p.MainWindowHandle, 6) | Out-Null }
  }
  Start-Sleep 2 # pre-warmed window refill
}
"open after deploy: " + ([MTWin]::List((& $livePids)) -join ', ')
