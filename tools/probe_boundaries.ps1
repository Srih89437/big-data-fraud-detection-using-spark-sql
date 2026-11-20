# Probe v2: Natural Earth CDN + GADM via site + GitHub raw.
$urls = @(
  "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_1_states_provinces.zip",
  "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip",
  "https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_1_states_provinces.zip",
  "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip",
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces.geojson",
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson"
)
$tmp = Join-Path $env:TEMP "probe_bnd2"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$i = 0
foreach ($u in $urls) {
  $i++
  $out = Join-Path $tmp ("p$i.bin")
  try {
    Invoke-WebRequest -Uri $u -OutFile $out -TimeoutSec 40 -ErrorAction Stop | Out-Null
    $size = (Get-Item $out).Length
    "{0}  ->  OK ({1} bytes)" -f $u, $size
  } catch {
    "{0}  ->  FAIL: {1}" -f $u, $_.Exception.Message.Substring(0, [Math]::Min(120, $_.Exception.Message.Length))
  }
}
