Add-Type -AssemblyName System.Drawing

$iconPath = Join-Path $PSScriptRoot '..\desktop\icon.ico'
$bitmap = [System.Drawing.Bitmap]::new(256, 256)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$purple = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#6261de'))
$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$graphics.FillEllipse($purple, 12, 12, 232, 232)
$graphics.FillRectangle($white, 12, 117, 232, 22)
$graphics.FillEllipse($white, 97, 97, 62, 62)
$purple.Dispose()
$white.Dispose()
$graphics.Dispose()

$pngStream = [System.IO.MemoryStream]::new()
$bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
$png = $pngStream.ToArray()
$pngStream.Dispose()

$output = [System.IO.File]::Create($iconPath)
$writer = [System.IO.BinaryWriter]::new($output)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$png.Length)
$writer.Write([UInt32]22)
$writer.Write($png)
$writer.Dispose()
