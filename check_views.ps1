$text = Get-Content index.html -Raw
$views = @("admin-view", "manager-view", "employee-view")
foreach ($view in $views) {
    if ($text -match "(?s)<div id=`"$view`"[^>]*>(.*?)<!-- ====================") {
        $content = $matches[1]
        $opens = [regex]::Matches($content, '<div\b[^>]*>').Count
        $closes = [regex]::Matches($content, '</div>').Count
        Write-Host "$view -> Opens: $opens, Closes: $closes, Diff: $($opens - $closes)"
    }
}
# For employee view which doesn't have <!-- ==== after it
if ($text -match "(?s)<div id=`"employee-view`"[^>]*>(.*?)</main>") {
    $content = $matches[1]
    $opens = [regex]::Matches($content, '<div\b[^>]*>').Count
    $closes = [regex]::Matches($content, '</div>').Count
    Write-Host "employee-view -> Opens: $opens, Closes: $closes, Diff: $($opens - $closes)"
}
