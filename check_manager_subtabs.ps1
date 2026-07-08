$text = Get-Content index.html -Raw
if ($text -match "(?s)<div id=`"manager-tab-reports`"[^>]*>(.*?)<!-- ====================") {
    $content = $matches[1]
    $subtabs = [regex]::Matches($content, "(?s)<div id=`"subtab-content-manager-report-[^>]*>(.*?)(?=<!-- Sub Tab|<div id=`"manager-tab-)")
    foreach ($m in $subtabs) {
        $sub = $m.Value
        $opens = [regex]::Matches($sub, '<div\b[^>]*>').Count
        $closes = [regex]::Matches($sub, '</div>').Count
        $id = [regex]::Match($sub, 'id="([^"]+)"').Groups[1].Value
        Write-Host "$id -> Opens: $opens, Closes: $closes, Diff: $($opens - $closes)"
    }
}
