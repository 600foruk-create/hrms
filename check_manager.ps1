$text = Get-Content index.html -Raw
if ($text -match "(?s)<div id=`"manager-tab-reports`"[^>]*>(.*?)<!-- ====================") {
    $content = $matches[1]
    $opens = [regex]::Matches($content, '<div\b[^>]*>').Count
    $closes = [regex]::Matches($content, '</div>').Count
    Write-Host "manager-tab-reports -> Opens: $opens, Closes: $closes, Diff: $($opens - $closes)"
}
