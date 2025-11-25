# Vidmin Player - Implementation Plan

## Project Overview

Vidmin is a modern, minimal video player application built with Electron, React, and TypeScript. It supports local video playback, video downloads from URLs (via yt-dlp), format conversion (via ffmpeg.wasm), and features a clean floating UI with download queue management.

---

## Phase Status Summary

### ✅ Phase 1: Setup & Architecture (COMPLETED)
**Status**: Complete
**File**: `phase1-setup.md`

**Completed Features**:
- Project initialization with Electron + React + TypeScript
- Vite build configuration
- ESLint and Prettier setup
- Testing framework (Vitest + Playwright)
- Basic application structure
- Hot reload development environment

---

### ✅ Phase 2: Local Video Player (COMPLETED)
**Status**: Complete
**File**: `phase2-local-player.md`

**Completed Features**:
- Vidstack player integration
- File selection dialog
- Video playback with controls
- Keyboard shortcuts (space, arrow keys, f, m)
- File metadata extraction
- Video format support detection
- Basic UI with file selector and player

---

### ✅ Phase 3: Video Downloads (COMPLETED)
**Status**: Complete
**File**: `phase3-downloads.md`

**Completed Features**:
- yt-dlp integration with bundled binary
- Download manager with progress tracking
- URL input and validation
- Quality selection
- Download progress UI with stats
- IPC communication for downloads
- Auto-play downloaded videos
- Download location selection

---

### ✅ Phase 4: Custom Protocol Handler (COMPLETED)
**Status**: Complete (implemented as part of Phase 5)
**File**: `phase4-progressive.md`

**Completed Features**:
- Custom `vidmin://` protocol handler
- Range request support (RFC 7233) for video seeking
- Proper HTTP headers (Content-Type, Content-Length, Accept-Ranges)
- Case-insensitive filesystem path validation
- Security validation for file access

**Note**: Originally planned for progressive playback, but pivoted to custom protocol to solve Chromium file:// restrictions.

---

### ✅ Phase 5: Format Conversion (COMPLETED)
**Status**: Complete
**File**: `phase5-conversion.md`

**Completed Features**:
- ffmpeg.wasm integration for client-side conversion
- ConversionManager class
- Support for unsupported formats (FLV, WMV, AVI, MKV, MOV, MPG, MPEG, VOB, TS)
- Conversion to MP4 or WebM
- Three quality presets (high, medium, low)
- Conversion dialog UI
- Real-time conversion progress
- Auto-load converted videos

---

### 🔄 Phase 6: UI/UX Redesign - Minimal Floating Interface (IN PROGRESS)
**Status**: Planning Complete, Implementation Pending
**File**: `phase6-ui-redesign.md`

**Planned Features**:
- Remove all UI chrome (navbar, mode selector, metadata panel)
- Material UI integration
- Floating action buttons (FABs) overlaid on video
- Unified ProgressModal for downloads & conversions
- Modal minimize/maximize functionality
- Drag & drop support for files and URLs
- Toggleable metadata overlay
- Full-screen video-first design

**Components to Create**:
- `FloatingActionButtons.tsx` - Floating icons for all actions
- `ProgressModal.tsx` - Unified modal for downloads/conversions
- `DownloadUrlModal.tsx` - URL input dialog
- `MetadataOverlay.tsx` - Toggleable metadata display
- `DragDropOverlay.tsx` - Drag & drop feedback

**Components to Remove**:
- `UrlInput.tsx`
- `DownloadProgress.tsx`
- `FileSelector.tsx`
- `ConversionDialog.tsx`

**Sub-Steps**:
1. Install Material UI dependencies
2. Strip down App.tsx
3. Create FloatingActionButtons
4. Implement drag & drop system
5. Create unified ProgressModal
6. Create DownloadUrlModal
7. Create MetadataOverlay
8. Remove old components
9. Update CSS
10. Update tests

---

### 📋 Phase 7: Download Queue Management (PLANNED)
**Status**: Planning Complete, Implementation Pending
**File**: `phase7-download-queue.md`

**Planned Features**:
- Multiple concurrent downloads (max 3 simultaneous)
- Download queue with FIFO processing
- Queue visualization UI (slide-out panel)
- Per-download controls (pause, resume, cancel, retry)
- Batch operations (clear completed, pause all, resume all)
- Queue persistence across app restarts
- Queue FAB with badge showing active count
- Multi-URL input support
- Show in folder for completed downloads

**Components to Create**:
- `DownloadQueuePanel.tsx` - Main queue UI panel
- `DownloadQueueItem.tsx` - Individual queue item component
- `queue-store.ts` - Queue persistence layer

**Backend Changes**:
- Enhance DownloadManager with queue methods
- Add queue IPC handlers
- Implement concurrent download limiting
- Add queue event emissions

**Sub-Steps**:
1. Enhance DownloadManager with queue logic
2. Add IPC handlers for queue operations
3. Update preload API
4. Create DownloadQueuePanel component
5. Create DownloadQueueItem component
6. Add Queue FAB to FloatingActionButtons
7. Integrate queue into App.tsx
8. Update DownloadUrlModal for multi-URL
9. Add queue persistence with electron-store
10. Update tests

---

### 🔮 Phase 8: Testing, Polish & Production Readiness (PLANNED)
**Status**: Planning Complete, Implementation Pending
**File**: `phase8-polish.md` (formerly phase6-polish.md)

**Planned Features**:
- Comprehensive E2E test suite
- Performance optimization and profiling
- Enhanced error handling and retry logic
- Accessibility improvements (WCAG 2.1 AA)
- Build and packaging for Mac/Windows/Linux
- Auto-updater integration
- Crash reporting setup
- Complete documentation

**Testing Areas**:
- Edge cases (large files, network failures, concurrent operations)
- Performance tests (4K playback, memory leaks, startup time)
- Accessibility tests (keyboard navigation, screen readers, high contrast)

**Production Checklist**:
- Security audit
- User testing (minimum 5 users)
- Privacy policy
- License file
- Contributing guidelines
- Release notes

---

## Current Status

### What Works Now
✅ Local video file playback with Vidstack
✅ Download videos from URLs with yt-dlp
✅ Format conversion with ffmpeg.wasm
✅ Custom protocol for secure file access
✅ Video seeking and scrubbing
✅ Keyboard shortcuts
✅ All 61 tests passing

### What's Next
🔨 **Phase 6** - UI/UX redesign with floating controls
🔨 **Phase 7** - Download queue management
🔨 **Phase 8** - Testing, polish, and production readiness

---

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Vidstack** - Video player library
- **Material UI** (planned) - UI components and icons
- **@ffmpeg/ffmpeg** - Client-side video conversion

### Backend (Electron Main Process)
- **Electron** - Desktop application framework
- **yt-dlp** - Video download utility (bundled)
- **Node.js fs** - File system operations

### Testing
- **Vitest** - Unit and integration testing
- **@testing-library/react** - React component testing
- **Playwright** - E2E testing

### Build & Distribution
- **electron-builder** - Application packaging
- **electron-updater** (planned) - Auto-updates

---

## File Structure

```
vidmin/
├── plan/                          # Implementation plans
│   ├── README.md                  # This file
│   ├── phase1-setup.md
│   ├── phase2-local-player.md
│   ├── phase3-downloads.md
│   ├── phase4-progressive.md
│   ├── phase5-conversion.md
│   ├── phase6-ui-redesign.md      # 🔄 Current phase
│   ├── phase7-download-queue.md   # 📋 Next phase
│   └── phase8-polish.md           # 🔮 Final phase
│
├── src/
│   ├── main/                      # Electron main process
│   │   ├── main.ts
│   │   ├── ipc-handlers.ts
│   │   ├── file-manager.ts
│   │   ├── download-manager.ts
│   │   └── __tests__/
│   │
│   ├── preload/                   # Preload scripts
│   │   ├── preload.ts
│   │   └── preload.d.ts
│   │
│   ├── renderer/                  # React frontend
│   │   ├── App.tsx
│   │   ├── conversion-manager.ts
│   │   ├── components/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── FileSelector.tsx   # 🗑️ To be removed in Phase 6
│   │   │   ├── UrlInput.tsx       # 🗑️ To be removed in Phase 6
│   │   │   ├── DownloadProgress.tsx  # 🗑️ To be removed in Phase 6
│   │   │   ├── ConversionDialog.tsx  # 🗑️ To be removed in Phase 6
│   │   │   └── __tests__/
│   │   └── test-setup.ts
│   │
│   └── shared/                    # Shared types
│
├── resources/                     # Bundled binaries
│   ├── mac/yt-dlp
│   ├── win/yt-dlp.exe
│   └── linux/yt-dlp
│
├── e2e/                          # E2E tests
├── electron-builder.json5        # Build configuration
├── vite.config.ts               # Vite configuration
└── package.json
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint

# Build renderer
npm run build:renderer

# Build main process
npm run build:main

# Package application
npm run package

# Build for distribution
npm run dist
```

---

## Key Decisions & Architecture

### Custom Protocol Handler
Instead of using Chromium's progressive playback (Phase 4 original plan), we implemented a custom `vidmin://` protocol handler. This was necessary because:
- Chromium restricts `file://` protocol access for video elements
- Missing HTTP headers (Range, Content-Length) prevented seeking
- Custom protocol provides proper streaming support

### Client-Side Conversion
ffmpeg.wasm runs conversion in the renderer process because:
- No need to bundle large ffmpeg binaries
- Works across all platforms without platform-specific builds
- User can continue using app during conversion
- Sandboxed and secure

### Floating UI Design
Moving from traditional UI chrome to floating controls because:
- Maximizes screen space for video content
- Modern, minimal aesthetic
- Non-blocking operations (modals can minimize)
- Better user experience on small screens

### Download Queue Architecture
Queue runs in main process (DownloadManager) because:
- Centralized control over concurrent downloads
- Persists across renderer crashes
- Can continue downloads in background
- Better resource management

---

## Next Steps for Development

1. **Start Phase 6 Implementation**:
   - Install Material UI dependencies
   - Create FloatingActionButtons component
   - Implement drag & drop
   - Create unified ProgressModal

2. **After Phase 6 Complete**:
   - Move to Phase 7 for queue management
   - Implement concurrent download limiting
   - Build queue UI components

3. **After Phase 7 Complete**:
   - Execute Phase 8 testing plan
   - Optimize performance
   - Package for distribution
   - Write documentation

---

## Contributing

When implementing new phases:
1. Read the phase plan document thoroughly
2. Follow the step-by-step implementation guide
3. Write tests before implementation (TDD)
4. Update this README when phase is complete
5. Commit with descriptive messages following conventional commits

---

## License

[Add license information]

---

## Acknowledgments

- **Vidstack** - Excellent video player library
- **yt-dlp** - Powerful video download tool
- **ffmpeg.wasm** - WebAssembly port of FFmpeg
- **Electron** - Desktop application framework
