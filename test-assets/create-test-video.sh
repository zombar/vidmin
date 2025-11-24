#!/bin/bash
# Script to generate a simple test video using ffmpeg
# This creates a 10-second video with a color pattern and timestamp

ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000:duration=10 \
  -pix_fmt yuv420p \
  -c:v libx264 -preset fast \
  -c:a aac \
  test-assets/sample-video.mp4 -y

echo "Test video created at test-assets/sample-video.mp4"
