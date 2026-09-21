# FFmpeg concat inputs for ValkeyLens comprehensive studio demo GIF
Set-Location B:\workgit\valkey-lens\docs\images

$concatContent = @"
file 'screenshot_dashboard.png'
duration 2.5
file 'screenshot_command_palette.png'
duration 2.0
file 'screenshot_traffic.png'
duration 2.5
file 'screenshot_memory_profiler.png'
duration 2.5
file 'screenshot_clients.png'
duration 2.0
file 'screenshot_pubsub.png'
duration 2.5
file 'screenshot_cluster.png'
duration 2.5
file 'screenshot_streams.png'
duration 2.5
file 'screenshot_telemetry.png'
duration 2.5
file 'screenshot_repl.png'
duration 2.5
file 'screenshot_repl.png'
"@

Set-Content -Path "concat_frames.txt" -Value $concatContent

# Generate palette and encode optimized animated GIF with Lanczos scaling
ffmpeg -y -f concat -safe 0 -i concat_frames.txt -vf "scale=1080:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:reserve_transparent=0:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" valkeylens_demo.gif

Remove-Item "concat_frames.txt"
Write-Host "Demo GIF successfully updated. Size:" (Get-Item valkeylens_demo.gif).Length "bytes"
