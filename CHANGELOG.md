# Changelog

## [0.1.6](https://github.com/zombar/vidmin/compare/vidmin-v0.1.5...vidmin-v0.1.6) (2025-11-26)


### Bug Fixes

* clean up import formatting in main process ([5699504](https://github.com/zombar/vidmin/commit/5699504969b290815b45189b200b17f548c846c5))
* clean up import formatting in main process ([d330b9e](https://github.com/zombar/vidmin/commit/d330b9e8bdfb25c1be2280e165efe93ffbdef559))

## [0.1.5](https://github.com/zombar/vidmin/compare/vidmin-v0.1.4...vidmin-v0.1.5) (2025-11-25)


### Bug Fixes

* use multiline file patterns for release asset uploads ([88ed05b](https://github.com/zombar/vidmin/commit/88ed05bc357907bf3fb020940ee3e3c14bcfde34))
* use multiline file patterns for release asset uploads ([a63a565](https://github.com/zombar/vidmin/commit/a63a56525c6a95e2ce5d5f246971076a9716121b))

## [0.1.4](https://github.com/zombar/vidmin/compare/vidmin-v0.1.3...vidmin-v0.1.4) (2025-11-25)


### Bug Fixes

* add author email and proper icons for Windows/Linux builds ([11de247](https://github.com/zombar/vidmin/commit/11de24755c06131ccac685c0fb154c00aa6fb4f3))
* add proper Windows .ico with 256x256 size and Linux icon.png ([4a7b1fb](https://github.com/zombar/vidmin/commit/4a7b1fb74acb21dc0fc73debedcd4a11c23baabf))

## [0.1.3](https://github.com/zombar/vidmin/compare/vidmin-v0.1.2...vidmin-v0.1.3) (2025-11-25)


### Bug Fixes

* add author email for Linux .deb package maintainer ([72b6738](https://github.com/zombar/vidmin/commit/72b67386654178d750e2c4b80207db00de70a471))
* add author email for Linux .deb package maintainer ([78ebe20](https://github.com/zombar/vidmin/commit/78ebe208feee9e41fd5f989684dd92ff5df450a4))

## [0.1.2](https://github.com/zombar/vidmin/compare/vidmin-v0.1.1...vidmin-v0.1.2) (2025-11-25)


### Bug Fixes

* improve build artifact upload patterns in release workflow ([7cf52a1](https://github.com/zombar/vidmin/commit/7cf52a1b01f94777bec4007cb122f3558dfe8059))
* pass browser cookies when fetching YouTube video formats ([f3600d5](https://github.com/zombar/vidmin/commit/f3600d5d567dc66d7dbe3278b69104208066908b))
* pass browser cookies when fetching YouTube video formats ([59b238c](https://github.com/zombar/vidmin/commit/59b238c688a0cdff123e4221c3335bfd44f0a692))
* resolve TypeScript any type warnings ([2e545fc](https://github.com/zombar/vidmin/commit/2e545fcaf5ff96fda7313fd9326f6860393a0a1e))
* trigger build workflow when release-please creates a release ([4fabd80](https://github.com/zombar/vidmin/commit/4fabd80b1824bfc7de4c45b11e01a24ed3b035c3))
* trigger build workflow when release-please creates a release ([614c0cd](https://github.com/zombar/vidmin/commit/614c0cd55eac753fbb0606b2525f9074d2fc6a47))
* use webUtils.getPathForFile for drag-drop in Electron 32+ ([19f018d](https://github.com/zombar/vidmin/commit/19f018db950a0d51b02d64ac16802d0f840391eb))
* use webUtils.getPathForFile for drag-drop in Electron 32+ ([945da16](https://github.com/zombar/vidmin/commit/945da16d97785e573fa0b988f583be849731c020))

## [0.1.1](https://github.com/zombar/vidmin/compare/vidmin-v0.1.0...vidmin-v0.1.1) (2025-11-25)


### Features

* add automated release system with cross-platform builds ([662ed8a](https://github.com/zombar/vidmin/commit/662ed8a60f4f330848e5a18ae8addc16bf67f6cc))
* add comprehensive app icons and rebrand to 'Vidmin Player' ([b12ef38](https://github.com/zombar/vidmin/commit/b12ef38696ad3effabd88d5437f70b6aa99a9e63))
* add electron-builder packaging configuration ([f0ee15e](https://github.com/zombar/vidmin/commit/f0ee15e11a57533404ea92f8a75c0441e1618ee4))
* add window dragging and automatic video-based resizing ([cbf4a8f](https://github.com/zombar/vidmin/commit/cbf4a8ff4a1aeb995d423006cb462b921f1479e9))
* implement custom protocol for local video playback and Phase 5 format conversion ([cf70eca](https://github.com/zombar/vidmin/commit/cf70eca62c1714cb700201e29d3a4cd920e09d89))
* implement Phase 2 local video player with Vidstack ([ac64ed6](https://github.com/zombar/vidmin/commit/ac64ed624adf8af45f69649a0353f93c4acac4b8))
* implement Phase 3 video download system with bundled yt-dlp ([5d6ac08](https://github.com/zombar/vidmin/commit/5d6ac087c4e5603763c9b6a5fc8b34404271b402))
* implement Phase 6 UI/UX redesign with Material UI ([15db8aa](https://github.com/zombar/vidmin/commit/15db8aa796981212bdd3e1785bd1f4a831c7f980))
* Phase 8 - add global error boundary for production readiness ([2bfb398](https://github.com/zombar/vidmin/commit/2bfb39829f541c2ddf8bd6a00db6c4657e7ec552))
* streamline download UI and auto-play completed videos ([332fd0c](https://github.com/zombar/vidmin/commit/332fd0cbb4f7802de94a12c73bd7ba373a2dd611))
* update icons with new logo and improve window UI ([05f2b57](https://github.com/zombar/vidmin/commit/05f2b5735539a1834124ee73d1b0d9db8ffe0157))


### Bug Fixes

* add --no-sandbox flag for Electron in CI environment ([db4c410](https://github.com/zombar/vidmin/commit/db4c4104043322e9f5b3aa58e9f66b7066c078cd))
* add Xvfb for E2E tests in CI ([c4f2859](https://github.com/zombar/vidmin/commit/c4f2859f25a87aa24ba27925f5fb4ef77ce47cfb))
* intelligently handle video format compatibility ([0edc2d3](https://github.com/zombar/vidmin/commit/0edc2d3bcbb538d4ba656a441d619e65c84e42aa))
* preserve environment variables in DevTools test ([2fa4a8d](https://github.com/zombar/vidmin/commit/2fa4a8d2d1ca5416fe7b60b17f44f2ce79360ef8))
* suppress JavaScript runtime warning for YouTube downloads ([ddd45b5](https://github.com/zombar/vidmin/commit/ddd45b5cb8cb0ae698330f0da908e37b9f776db5))
