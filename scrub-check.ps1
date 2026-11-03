<#
.SYNOPSIS
  Scrub check for xfnl.studio. Run before every commit.
.DESCRIPTION
  Scans site files for terms Justin has decided not to publish. Exit code 1 if any banned term is found.
  Launch blockers (CONFIRM, FPO, TODO) are reported as warnings. Add -Strict to fail on them too.
.EXAMPLE
  .\scrub-check.ps1 -Path .
.EXAMPLE
  .\scrub-check.ps1 -Path . -IncludeHistory
  Also lists commits that ever contained a banned term (history keeps old text forever).
#>
param(
  [string]$Path = '.',
  [switch]$Strict,
  [switch]$IncludeHistory
)

$banned = @(
  @{ Label = 'org structure'; Pattern = '50 marketers|~50\b|GTM pods|\bpods\b|shared[- ]services|\bJira\b' }
  @{ Label = 'internal counts'; Pattern = '\b419\b|1,213|1,132|5,080|3,555|\b38 active' }
  @{ Label = 'per-person math'; Pattern = '22\.1|40\.1|\b81%|flat headcount|output per person|per active contributor' }
  @{ Label = 'compliance numbers'; Pattern = 'brief compliance|\b39%|\b35\.2%|\b54\.0%|\b14\.5%|\b9\.0%' }
  @{ Label = 'escalations'; Pattern = 'escalation' }
  @{ Label = 'exact cycle time'; Pattern = '~30 to ~22|30 to 22|~30d' }
  @{ Label = 'awards numbers'; Pattern = '\b296\b|99% of goal|\+29%|\b29%' }
  @{ Label = 'internal comms/CEO'; Pattern = '\bCEO\b|Travis|\bHess\b|company-wide|launch note|thank-you by name|thanked by name' }
  @{ Label = 'internal launch dates'; Pattern = 'April 3|\bAMER\b|\bEMEA\b|October 19|September 2\b|icebox|two weeks early|2 weeks early|dropped early|Oct 19' }
  @{ Label = 'vendor characterization'; Pattern = 'vendor rep|middleware' }
  @{ Label = 'proprietary tooling detail'; Pattern = 'idempotent|dependency engine|clear-keyword|blocked-status|Final Figma|propagat' }
  @{ Label = 'internal events'; Pattern = '33-person|keynote|mTalks' }
  @{ Label = 'governance hint'; Pattern = 'AI governance' }
  @{ Label = 'titles to avoid'; Pattern = 'Interim PM|\bArchitect\b|Marketing Operations|Marketing Ops\b' }
  @{ Label = 'Apple detail beyond Apple Music'; Pattern = 'Apple TV|TV\+|hundreds of monthly|co-architected|QA framework' }
  @{ Label = 'money figures'; Pattern = 'five-figure|six-figure|cumulative revenue|revenue studio' }
  @{ Label = 'old-role metrics'; Pattern = '(?<!99% )CSAT|sprint overload|case-study intake|\b60%|\b85%' }
  @{ Label = 'expired credential'; Pattern = '\bCSM\b|Scrum' }
  @{ Label = 'personal and home-network detail'; Pattern = 'iMessage|subtext|Reminders|telemetry|ARTROCK|Starlight|Midnight|Watchdog|\bBody [123]\b|Oura|wearable|Co-Star' }
  @{ Label = 'unmeasured or personal specs'; Pattern = '1\.13M|150 GB|64 GB|VRAM|\b562|TTFT|50:1|QLoRA|golden|BookStack|Action Button|zero[- ]API' }
  @{ Label = 'third-party personal detail'; Pattern = 'Fire Department|\bEMT\b' }
  @{ Label = 'banned term: technologist'; Pattern = 'technologist' }
  @{ Label = 'banned term: Magic Quadrant (say analyst report program)'; Pattern = 'Magic Quadrant' }
  @{ Label = 'banned name: do not name the colleague who runs intake'; Pattern = 'Sharacell' }
  @{ Label = 'emoji: use SVG marks, never emoji characters'; Pattern = '[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]|\uFE0F' }
  @{ Label = 'brand styling: write xfnl Studio in display text'; Pattern = '(?<![\w/@."-])xfnl\.studio(?![\w-])' }
)
$warn = @(
  @{ Label = 'launch blocker: CONFIRM'; Pattern = 'CONFIRM' }
  @{ Label = 'launch blocker: FPO placeholder'; Pattern = '\bFPO\b' }
  @{ Label = 'launch blocker: TODO'; Pattern = '\bTODO\b' }
  @{ Label = 'launch blocker: TITLE_TBD placeholder'; Pattern = 'TITLE_TBD' }
)
$exts = @('.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.webmanifest')

$files = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '[\\/](\.git|node_modules|\.vercel)[\\/]' -and ($exts -contains $_.Extension.ToLower()) }

Write-Host ("Scanning {0} files under {1}" -f @($files).Count, (Resolve-Path $Path)) -ForegroundColor Cyan
$failures = 0

foreach ($rule in $banned) {
  $hits = @($files | Select-String -Pattern $rule.Pattern)
  if ($hits.Count -gt 0) {
    $failures += $hits.Count
    Write-Host ("BANNED [{0}]: {1} hit(s)" -f $rule.Label, $hits.Count) -ForegroundColor Red
    foreach ($h in $hits) {
      $line = $h.Line.Trim()
      if ($line.Length -gt 140) { $line = $line.Substring(0, 140) + '...' }
      Write-Host ("  {0}:{1}  {2}" -f $h.Path, $h.LineNumber, $line)
    }
  }
}

$warnings = 0
foreach ($rule in $warn) {
  $hits = @($files | Select-String -Pattern $rule.Pattern -CaseSensitive)
  if ($hits.Count -gt 0) {
    $warnings += $hits.Count
    Write-Host ("WARNING [{0}]: {1} hit(s)" -f $rule.Label, $hits.Count) -ForegroundColor Yellow
    foreach ($h in $hits) { Write-Host ("  {0}:{1}" -f $h.Path, $h.LineNumber) }
  }
}

if ($IncludeHistory) {
  if (Test-Path (Join-Path $Path '.git')) {
    Write-Host "Checking git history (this can take a minute)..." -ForegroundColor Cyan
    Push-Location $Path
    foreach ($rule in $banned) {
      $commits = @(git log --all --oneline -i -G $rule.Pattern 2>$null)
      if ($commits.Count -gt 0) {
        Write-Host ("HISTORY [{0}]: {1} commit(s) touched this term" -f $rule.Label, $commits.Count) -ForegroundColor Magenta
      }
    }
    Pop-Location
    Write-Host "If this repo is public, old text is still readable in history. Make the repo private or rewrite history." -ForegroundColor Magenta
  } else {
    Write-Host "No .git folder found at that path, skipping history check." -ForegroundColor Yellow
  }
}

if ($failures -gt 0) {
  Write-Host ("FAIL: {0} banned hit(s). Fix them before committing." -f $failures) -ForegroundColor Red
  exit 1
}
if ($Strict -and $warnings -gt 0) {
  Write-Host ("FAIL (strict): {0} launch blocker(s) remain." -f $warnings) -ForegroundColor Red
  exit 1
}
if ($warnings -gt 0) { Write-Host ("PASS with {0} launch blocker warning(s)." -f $warnings) -ForegroundColor Yellow } else { Write-Host "PASS: clean." -ForegroundColor Green }
exit 0
