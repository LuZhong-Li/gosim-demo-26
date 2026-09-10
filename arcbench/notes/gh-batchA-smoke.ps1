# Batch A 后端语义冒烟：REQ-1-3 / 2-2-4 / 3-2-2 / 6-2-4 / 3-2-3
# 前置：后端已在 127.0.0.1:3002 运行
$base = 'http://127.0.0.1:3002'
$pass = 0; $fail = 0
function Check($name, $cond, $extra) {
  if ($cond) { $script:pass++; "  PASS  $name" } else { $script:fail++; "  FAIL  $name  $extra" }
}
function Post($path, $body, $token) {
  $h = @{ 'Content-Type' = 'application/json' }
  if ($token) { $h['Authorization'] = "Bearer $token" }
  try { Invoke-RestMethod -Uri "$base$path" -Method Post -Headers $h -Body ($body | ConvertTo-Json -Depth 5) }
  catch { $_.ErrorDetails.Message }
}
function Patch($path, $body, $token) {
  $h = @{ 'Content-Type' = 'application/json' }
  if ($token) { $h['Authorization'] = "Bearer $token" }
  try { Invoke-RestMethod -Uri "$base$path" -Method Patch -Headers $h -Body ($body | ConvertTo-Json -Depth 5) }
  catch { $_.ErrorDetails.Message }
}
function Delete($path, $token) {
  $h = @{}
  if ($token) { $h['Authorization'] = "Bearer $token" }
  try { Invoke-RestMethod -Uri "$base$path" -Method Delete -Headers $h }
  catch { $_.ErrorDetails.Message }
}
function GetJ($path, $token) {
  $h = @{}
  if ($token) { $h['Authorization'] = "Bearer $token" }
  try { Invoke-RestMethod -Uri "$base$path" -Headers $h } catch { $_.ErrorDetails.Message }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$owner = "owner$stamp"
$member = "member$stamp"
$org = "org$stamp"
$pwd = 'Valid-password-123!'

Post '/api/auth/register' @{ username=$owner; email="$owner@example.com"; password=$pwd; confirmPassword=$pwd; terms=$true } $null | Out-Null
Post '/api/auth/register' @{ username=$member; email="$member@example.com"; password=$pwd; confirmPassword=$pwd; terms=$true } $null | Out-Null
$login = Post '/api/auth/login' @{ identifier=$owner; password=$pwd } $null
$tok = $login.token

"== REQ-2-2-4 remove member =="
Post '/api/orgs' @{ name=$org; displayName='Smoke Org' } $tok | Out-Null
Post "/api/orgs/$org/members" @{ username=$member; role='Member' } $tok | Out-Null
Post "/api/orgs/$org/teams" @{ name='core' } $tok | Out-Null
Post "/api/orgs/$org/teams/core/members" @{ username=$member } $tok | Out-Null
$before = GetJ "/api/orgs/$org" $tok
$memberRows = @($before.members | Where-Object { $_.username -eq $member })
Check 'member present before removal' ($memberRows.Count -eq 1) ("members=" + ($before.members | ConvertTo-Json -Compress))
$teamRows = @($before.teams | Where-Object { $_.name -eq 'core' })
Check 'team member present before removal' ($teamRows[0].members -contains $member) ($teamRows | ConvertTo-Json -Compress)
$del = Delete "/api/orgs/$org/members/$member" $tok
Check 'DELETE member returns ok' ($del.ok -eq $true) $del
$after = GetJ "/api/orgs/$org" $tok
Check 'member gone after removal' ((@($after.members | Where-Object { $_.username -eq $member })).Count -eq 0) ($after.members | ConvertTo-Json -Compress)
$teamAfter = ($after.teams | Where-Object { $_.name -eq 'core' })
Check 'cascade removed team membership' ($teamAfter.members -notcontains $member) ($teamAfter | ConvertTo-Json -Compress)
$lastOwner = Delete "/api/orgs/$org/members/$owner" $tok
Check 'cannot remove last owner' ("$lastOwner" -match 'at least one owner') $lastOwner

"== REQ-1-3 change password =="
$bad = Post '/api/auth/password' @{ currentPassword='Wrong-password-123!'; newPassword='New-password-456!'; confirmPassword='New-password-456!' } $tok
Check 'wrong current password rejected' ("$bad" -match 'Current password is incorrect') $bad
$weak = Post '/api/auth/password' @{ currentPassword=$pwd; newPassword='short'; confirmPassword='short' } $tok
Check 'weak new password rejected' ("$weak" -match '12-128') $weak
$ok = Post '/api/auth/password' @{ currentPassword=$pwd; newPassword='New-password-456!'; confirmPassword='New-password-456!' } $tok
Check 'change password accepted' ($ok.ok -eq $true) $ok
$oldLogin = Post '/api/auth/login' @{ identifier=$owner; password=$pwd } $null
Check 'old password no longer works' ("$oldLogin" -match 'Invalid username or password') $oldLogin
$newLogin = Post '/api/auth/login' @{ identifier=$owner; password='New-password-456!' } $null
Check 'new password works' ($null -ne $newLogin.token) $newLogin
$tok = $newLogin.token

"== REQ-3-2-2 fork + REQ-3-2-3 clone url =="
Post "/api/orgs/$org/repos" @{ name='seed'; visibility='public'; description='seed repo' } $tok | Out-Null
$seed = (GetJ "/api/repos/$org/seed" $tok).repo
Check 'clone url exposed' ([bool]$seed.cloneUrl) ($seed | ConvertTo-Json -Compress)
$fork = Post "/api/repos/$org/seed/fork" @{ name='seed-fork' } $tok
Check 'fork created' ($fork.repo.name -eq 'seed-fork') $fork
Check 'fork remembers source' ($fork.repo.forkedFrom -eq "$org/seed") $fork.repo

"== REQ-6-2-4 draft PR =="
Post "/api/repos/$org/seed/branches" @{ name='feature' } $tok | Out-Null
$draft = Post "/api/repos/$org/seed/pulls" @{ title='Draft work'; baseBranch='main'; headBranch='feature'; draft=$true } $tok
Check 'draft pr has draft state' ($draft.pull.state -eq 'draft') $draft
$mergeDraft = Post "/api/repos/$org/seed/pulls/$($draft.pull.number)/merge" @{} $tok
Check 'draft cannot be merged' ("$mergeDraft" -match 'not open') $mergeDraft
$ready = Patch "/api/repos/$org/seed/pulls/$($draft.pull.number)" @{ ready=$true } $tok
Check 'draft becomes open after ready' ($ready.pull.state -eq 'open') $ready
$normal = Post "/api/repos/$org/seed/pulls" @{ title='Normal work'; baseBranch='main'; headBranch='feature' } $tok
Check 'normal pr is open' ($normal.pull.state -eq 'open') $normal

"`nRESULT: pass=$pass fail=$fail"
