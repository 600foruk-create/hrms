$text = Get-Content index.html -Raw
$matches = [regex]::Matches($text, '<div\b[^>]*>|</div>')
$depth = 0
$lineNum = 1
$pos = 0

foreach ($m in $matches) {
    $lineNum += ([regex]::Matches($text.Substring($pos, $m.Index - $pos), "`n")).Count
    $pos = $m.Index

    if ($m.Value.StartsWith("<div")) {
        $depth++
    } else {
        $depth--
        if ($depth -lt 0) {
            Write-Host "Extra closing tag at line $lineNum"
            $depth = 0
        }
    }
}
Write-Host "Final depth: $depth"
