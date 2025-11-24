# Test Assets

## Sample Video

For E2E tests, place a sample video file here named `sample-video.mp4`.

You can download a sample video from:
- https://sample-videos.com/
- https://filesamples.com/formats/mp4

Or generate one using ffmpeg:
```bash
ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000:duration=10 \
  -pix_fmt yuv420p -c:v libx264 -preset fast -c:a aac \
  sample-video.mp4
```

Note: The sample video is gitignored and must be created locally for running E2E tests.
