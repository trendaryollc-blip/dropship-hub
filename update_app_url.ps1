$path = "c:\Users\trendaryo\Desktop\product hunter\dropship-hub\.env.local"
$content = [System.IO.File]::ReadAllText($path)
$content = [regex]::Replace($content, '(?m)^NEXT_PUBLIC_APP_URL=.*$', 'NEXT_PUBLIC_APP_URL=https://dropship-71zz894tm-trendaryo-s-projects.vercel.app')
[System.IO.File]::WriteAllText($path, $content)
Write-Host "Updated NEXT_PUBLIC_APP_URL to https://dropship-71zz894tm-trendaryo-s-projects.vercel.app"
