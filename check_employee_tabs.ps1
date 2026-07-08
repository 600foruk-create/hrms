$text = Get-Content index.html -Raw
if ($text -match "(?s)<div id=`"employee-view`"[^>]*>(.*?)</main>") {
    $content = $matches[1]
    $subtabs = [regex]::Matches($content, "(?s)<div id=`"employee-tab-[^>]*>(.*?)(?=<!-- ====================|<div id=`"employee-tab-|</main>)")
    foreach ($m in $subtabs) {
        $sub = $m.Value
        $opens = [regex]::Matches($sub, '<div\b[^>]*>').Count
        $closes = [regex]::Matches($sub, '</div>').Count
        $id = [regex]::Match($sub, 'id="([^"]+)"').Groups[1].Value
        Write-Host "$id -> Opens: $opens, Closes: $closes, Diff: $($opens - $closes)"
    }
}
