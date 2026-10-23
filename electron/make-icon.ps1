Add-Type -AssemblyName System.Drawing

function Create-MasterBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # 1. Background rounded rect
    $margin = [Math]::Max(1.0, $size * 0.05)
    $w = $size - ($margin * 2)
    $h = $size - ($margin * 2)
    $radius = [Math]::Max(2.0, $size * 0.22)
    $diam = $radius * 2

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($margin, $margin, $diam, $diam, 180, 90)
    $path.AddArc($margin + $w - $diam, $margin, $diam, $diam, 270, 90)
    $path.AddArc($margin + $w - $diam, $margin + $h - $diam, $diam, $diam, 0, 90)
    $path.AddArc($margin, $margin + $h - $diam, $diam, $diam, 90, 90)
    $path.CloseFigure()

    # Vibrant blue gradient
    $p1 = New-Object System.Drawing.PointF ($size * 0.1), ($size * 0.05)
    $p2 = New-Object System.Drawing.PointF ($size * 0.9), ($size * 0.95)
    $cTop = [System.Drawing.Color]::FromArgb(255, 30, 64, 175)    # #1e40af
    $cBot = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)    # #2563eb
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $p1, $p2, $cTop, $cBot
    $g.FillPath($bgBrush, $path)

    # Subtle inner highlight border
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 147, 197, 253)), ([Math]::Max(1.0, $size * 0.015))
    $g.DrawPath($borderPen, $path)

    # 2. Electric Lightning Bolt (Material electric_bolt coordinates normalized to $size)
    # Scale from 256 box:
    # (136, 36) -> (86, 134) -> (124, 134) -> (112, 220) -> (174, 114) -> (134, 114)
    $scale = $size / 256.0
    $pts = @(
        New-Object System.Drawing.PointF (136 * $scale), (34 * $scale)
        New-Object System.Drawing.PointF (84 * $scale),  (136 * $scale)
        New-Object System.Drawing.PointF (126 * $scale), (136 * $scale)
        New-Object System.Drawing.PointF (112 * $scale), (222 * $scale)
        New-Object System.Drawing.PointF (176 * $scale), (112 * $scale)
        New-Object System.Drawing.PointF (134 * $scale), (112 * $scale)
    )

    # Drop shadow for bolt
    $shadowPts = @(
        New-Object System.Drawing.PointF ((136 * $scale) + 1), ((34 * $scale) + 2)
        New-Object System.Drawing.PointF ((84 * $scale) + 1),  ((136 * $scale) + 2)
        New-Object System.Drawing.PointF ((126 * $scale) + 1), ((136 * $scale) + 2)
        New-Object System.Drawing.PointF ((112 * $scale) + 1), ((222 * $scale) + 2)
        New-Object System.Drawing.PointF ((176 * $scale) + 1), ((112 * $scale) + 2)
        New-Object System.Drawing.PointF ((134 * $scale) + 1), ((112 * $scale) + 2)
    )
    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(60, 0, 0, 0))
    $g.FillPolygon($shadowBrush, $shadowPts)

    # Crisp pure white bolt
    $boltBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillPolygon($boltBrush, $pts)

    $g.Dispose()
    return $bmp
}

# 1. Generate master PNG (256x256 and 512x512)
$master256 = Create-MasterBitmap 256
$master256.Save("electron/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$master256.Save("assets/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$master512 = Create-MasterBitmap 512
$master512.Save("assets/icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$master512.Dispose()

# 2. Build multi-size Windows .ico with DIB bitmaps for 16, 32, 48, 64, 128 and PNG for 256
$sizes = @(256, 128, 64, 48, 32, 16)
$iconDataList = @()

foreach ($sz in $sizes) {
    if ($sz -eq 256) {
        $ms = New-Object System.IO.MemoryStream
        $master256.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBytes = $ms.ToArray()
        $ms.Dispose()
        $iconDataList += @{
            Width = 0 # 256 is encoded as 0
            Height = 0
            IsPng = $true
            Bytes = $pngBytes
        }
    } else {
        $resBmp = Create-MasterBitmap $sz
        # Convert to 32bpp BGRA DIB
        $dibMs = New-Object System.IO.MemoryStream
        $bw = New-Object System.IO.BinaryWriter $dibMs

        # BITMAPINFOHEADER (40 bytes)
        $bw.Write([uint32]40)              # biSize
        $bw.Write([int32]$sz)              # biWidth
        $bw.Write([int32]($sz * 2))        # biHeight (doubled for XOR + AND mask)
        $bw.Write([uint16]1)               # biPlanes
        $bw.Write([uint16]32)              # biBitCount
        $bw.Write([uint32]0)               # biCompression = BI_RGB
        $bw.Write([uint32]($sz * $sz * 4)) # biSizeImage
        $bw.Write([int32]0)                # biXPelsPerMeter
        $bw.Write([int32]0)                # biYPelsPerMeter
        $bw.Write([uint32]0)               # biClrUsed
        $bw.Write([uint32]0)               # biClrImportant

        # Lock bits to extract BGRA scanlines (bottom-up)
        $rect = New-Object System.Drawing.Rectangle 0, 0, $sz, $sz
        $bmpData = $resBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $stride = [Math]::Abs($bmpData.Stride)
        $rawBytes = New-Object byte[] ($stride * $sz)
        [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $rawBytes, 0, $rawBytes.Length)
        $resBmp.UnlockBits($bmpData)

        # Write scanlines bottom to top
        for ($y = $sz - 1; $y -ge 0; $y--) {
            $offset = $y * $stride
            $bw.Write($rawBytes, $offset, ($sz * 4))
        }

        # 1-bit AND mask (row size rounded up to 32-bit boundary)
        $maskRowBytes = [Math]::Ceiling($sz / 32.0) * 4
        $mask = New-Object byte[] ($maskRowBytes * $sz)
        $bw.Write($mask, 0, $mask.Length)

        $dibBytes = $dibMs.ToArray()
        $bw.Dispose()
        $dibMs.Dispose()
        $resBmp.Dispose()

        $iconDataList += @{
            Width = $sz
            Height = $sz
            IsPng = $false
            Bytes = $dibBytes
        }
    }
}
$master256.Dispose()

# 3. Assemble full .ico file
$icoMs = New-Object System.IO.MemoryStream
$icoWriter = New-Object System.IO.BinaryWriter $icoMs

# ICONDIR header (6 bytes)
$icoWriter.Write([uint16]0)                  # Reserved
$icoWriter.Write([uint16]1)                  # Type 1 = Icon
$icoWriter.Write([uint16]$iconDataList.Count) # Number of images

# Calculate offset for image data
$offset = 6 + ($iconDataList.Count * 16)

# Write ICONDIRENTRY (16 bytes each)
foreach ($item in $iconDataList) {
    $icoWriter.Write([byte]$item.Width)      # Width (0 for 256)
    $icoWriter.Write([byte]$item.Height)     # Height (0 for 256)
    $icoWriter.Write([byte]0)                # ColorCount
    $icoWriter.Write([byte]0)                # Reserved
    $icoWriter.Write([uint16]1)              # Color Planes
    $icoWriter.Write([uint16]32)             # Bits Per Pixel
    $icoWriter.Write([uint32]$item.Bytes.Length) # Image Size in Bytes
    $icoWriter.Write([uint32]$offset)        # Image Offset
    $offset += $item.Bytes.Length
}

# Write Image Data blocks
foreach ($item in $iconDataList) {
    $icoWriter.Write($item.Bytes, 0, $item.Bytes.Length)
}

$finalIcoBytes = $icoMs.ToArray()
$icoWriter.Dispose()
$icoMs.Dispose()

[System.IO.File]::WriteAllBytes("electron/icon.ico", $finalIcoBytes)
[System.IO.File]::WriteAllBytes("assets/icon.ico", $finalIcoBytes)
[System.IO.File]::WriteAllBytes("build/icon.ico", $finalIcoBytes)
[System.IO.File]::WriteAllBytes("icon.ico", $finalIcoBytes)

Write-Output "Generated electron/icon.ico ($($finalIcoBytes.Length) bytes) with 6 standard Windows resolutions."
