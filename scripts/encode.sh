#!/bin/bash
# Encode the rendered JPEG frames: 1080p two-pass (kept under 30 MiB) and a 720p CRF version.
set -e
cd "$(dirname "$0")/.."
mkdir -p out
IN="-framerate 30 -start_number 0 -i frames/f%05d.jpg"
# JPEG frames are full-range BT.601 YCbCr; convert to limited-range BT.709 and tag it
VF="scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=limited,format=yuv420p"
TAGS="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
X="-c:v libx264 -preset slow -b:v 830k -maxrate 2600k -bufsize 5200k"
ffmpeg -hide_banner -loglevel error -y $IN -vf "$VF" $X -pass 1 -passlogfile out/p1080 $TAGS -an -f mp4 /dev/null
ffmpeg -hide_banner -loglevel error -y $IN -vf "$VF" $X -pass 2 -passlogfile out/p1080 $TAGS -an -movflags +faststart out/main.mp4
echo MAIN_DONE
VF7="scale=1280:720:flags=lanczos:in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=limited,format=yuv420p"
ffmpeg -hide_banner -loglevel error -y $IN -vf "$VF7" -c:v libx264 -preset slow -crf 26 $TAGS -an -movflags +faststart out/small.mp4
echo SMALL_DONE
