# Phase 9: AI Video Upscaling

## Overview

Add AI-powered video upscaling to Vidmin using GPU-accelerated pre-processing. This phase treats upscaling similarly to the existing format conversion system - videos are processed before playback with progress tracking, and upscaled results are saved to disk for future use.

**Status**: PLANNED
**Dependencies**: Phases 1-5 complete (local playback, downloads, conversion)
**Estimated Complexity**: Medium-High

---

## Goals

1. Enable users to upscale low-resolution videos (480p, 720p) to higher resolutions (1080p, 1440p, 4K)
2. Leverage GPU acceleration (CUDA, Metal, DirectML) for fast processing
3. Provide real-time progress tracking during upscaling
4. Save upscaled videos permanently for future playback
5. Integrate seamlessly with existing download and conversion workflows
6. Maintain consistent UI/UX patterns from existing features

---

## Features

### Core Functionality
- **AI upscaling binary integration** - Bundle Real-ESRGAN (or similar) for each platform
- **GPU acceleration** - Detect and use NVIDIA (CUDA), Apple (Metal), AMD (DirectML) GPUs
- **Multiple scale options** - 2x upscaling (720p → 1440p) and 4x upscaling (480p → 1080p/4K)
- **Quality presets** - High Quality (slower, better) vs Balanced (faster, good)
- **Progress tracking** - Real-time percentage, ETA, and frame count display
- **Cancellation support** - Stop upscaling mid-process
- **Smart resolution detection** - Auto-suggest upscaling for videos below 1080p

### User Experience
- **Upscaling dialog** - Similar to ConversionDialog, with scale/quality selection
- **Trigger points**:
  - After downloading a video (alongside convert option)
  - After opening a local video (if low resolution)
  - After format conversion completes
  - Manual trigger from menu/button
- **File management** - Preserve original, save upscaled with clear naming (e.g., `video_upscaled_2x.mp4`)
- **Disk space checking** - Warn if insufficient space before upscaling

### Technical Features
- **Binary bundling** - Similar to yt-dlp, platform-specific binaries in `/resources/`
- **Model bundling** - Include AI model weights (~50-100MB per model)
- **Subprocess management** - Spawn upscaling process from main, similar to DownloadManager
- **IPC communication** - Secure communication between main and renderer processes
- **Error handling** - Graceful failures with clear error messages

---

## Technical Approach

### Architecture Pattern
Follow the same pattern established in Phase 3 (Downloads) and Phase 5 (Conversion):

```
Main Process (upscale-manager.ts)
  ↓ spawns subprocess
Real-ESRGAN Binary (GPU-accelerated)
  ↓ stdout parsing
Progress Events
  ↓ IPC
Renderer Process (UpscaleDialog.tsx)
  ↓ displays
Progress UI + Controls
```

### Binary Selection: Real-ESRGAN
- **Why Real-ESRGAN**: Industry-standard, excellent live-action quality, GPU support, standalone binary
- **Alternatives considered**: Waifu2x (anime-focused), ESRGAN (older), Anime4K (real-time only)
- **Models**: Bundle `realesrgan-x2.pth` and `realesrgan-x4.pth` for different scale factors

### GPU Acceleration Strategy
- **macOS**: Metal Performance Shaders (MPS) or Core ML
- **Windows**: CUDA (NVIDIA) or DirectML (AMD/Intel)
- **Linux**: CUDA or Vulkan
- **Fallback**: CPU-only mode with performance warning

### File Management Strategy
- **Naming**: Append `_upscaled_2x` or `_upscaled_4x` before extension
- **Location**: Save in same directory as original
- **Collision handling**: Append counter if file exists (e.g., `_upscaled_2x_1.mp4`)
- **Original preservation**: Never delete original unless user explicitly confirms

---

## Implementation Steps

### Step 1: Binary Integration & Setup

**Goal**: Download, bundle, and validate Real-ESRGAN binaries

**Tasks**:
1. Create `scripts/download-upscale-binaries.js`
   - Download Real-ESRGAN binaries from official releases
   - Download model weights (realesrgan-x2.pth, realesrgan-x4.pth)
   - Verify checksums
   - Set executable permissions
   - Handle network errors gracefully

2. Update `package.json`
   - Add postinstall script: `node scripts/download-upscale-binaries.js`
   - Update `extraResources` in build config to include binaries and models

3. Create resource directories:
   ```
   resources/
   ├── mac/
   │   └── upscale-bin/
   │       └── realesrgan-ncnn-vulkan  (or Metal variant)
   ├── win/
   │   └── upscale-bin/
   │       └── realesrgan-ncnn-vulkan.exe
   ├── linux/
   │   └── upscale-bin/
   │       └── realesrgan-ncnn-vulkan
   └── models/
       ├── realesrgan-x2.pth
       └── realesrgan-x4.pth
   ```

4. Create `src/main/upscale-binary-validator.ts`
   ```typescript
   export async function validateUpscaleBinary(): Promise<boolean>;
   export async function detectGPU(): Promise<GPUInfo>;
   export function getUpscaleBinaryPath(): string;
   export function getModelPath(scale: 2 | 4): string;
   ```

**Acceptance Criteria**:
- ✅ Binaries download automatically on `npm install`
- ✅ Binary validation passes on app startup
- ✅ GPU detection works correctly on all platforms
- ✅ Models are accessible and valid

**Files Created**:
- `scripts/download-upscale-binaries.js`
- `src/main/upscale-binary-validator.ts`

**Files Modified**:
- `package.json`

---

### Step 2: Upscale Manager (Main Process)

**Goal**: Create main process upscaling orchestration

**Tasks**:
1. Create `src/main/upscale-manager.ts` following DownloadManager pattern:
   ```typescript
   export interface UpscaleOptions {
     inputPath: string;
     outputPath: string;
     scale: 2 | 4;
     model: 'realesrgan' | 'compact';
     gpuId?: number;
   }

   export interface UpscaleProgress {
     id: string;
     percentage: number;
     currentFrame: number;
     totalFrames: number;
     eta: number; // seconds
     status: 'initializing' | 'processing' | 'complete' | 'error' | 'cancelled';
   }

   export class UpscaleManager extends EventEmitter {
     async startUpscale(options: UpscaleOptions): Promise<string>; // returns id
     async cancelUpscale(id: string): Promise<void>;
     getUpscaleStatus(id: string): UpscaleProgress | null;
     getAllUpscales(): UpscaleProgress[];
   }
   ```

2. Implement subprocess spawning:
   ```typescript
   const args = [
     '-i', inputPath,
     '-o', outputPath,
     '-s', scale.toString(),
     '-m', modelPath,
     '-g', gpuId || '0'
   ];
   const process = spawn(binaryPath, args);
   ```

3. Implement stdout parsing for progress:
   ```
   [Processing] Frame 120/480 (25%)
   ```
   Parse frame numbers, calculate percentage and ETA

4. Implement event emissions:
   - `upscale-started` - When process begins
   - `upscale-progress` - Frame updates (throttled to max 2/sec)
   - `upscale-complete` - When finished successfully
   - `upscale-error` - On failures
   - `upscale-cancelled` - When user cancels

5. Add multi-upscale tracking with UUIDs (similar to DownloadManager)

6. Implement cancellation via `process.kill()`

**Acceptance Criteria**:
- ✅ Can spawn upscaling subprocess
- ✅ Progress parsing works accurately
- ✅ Events emit correctly
- ✅ Can track multiple concurrent upscales
- ✅ Cancellation works mid-process
- ✅ Error handling covers common failures

**Files Created**:
- `src/main/upscale-manager.ts`

**Tests to Write**:
- `src/main/__tests__/upscale-manager.test.ts`

---

### Step 3: IPC Communication Layer

**Goal**: Add IPC handlers and preload APIs for upscaling

**Tasks**:
1. Modify `src/main/ipc-handlers.ts`:
   ```typescript
   // Add handlers
   ipcMain.handle('check-upscale-binary', async () => {
     return await validateUpscaleBinary();
   });

   ipcMain.handle('detect-gpu', async () => {
     return await detectGPU();
   });

   ipcMain.handle('start-upscale', async (event, options: UpscaleOptions) => {
     return await upscaleManager.startUpscale(options);
   });

   ipcMain.handle('cancel-upscale', async (event, id: string) => {
     return await upscaleManager.cancelUpscale(id);
   });

   ipcMain.handle('get-upscale-status', async (event, id: string) => {
     return upscaleManager.getUpscaleStatus(id);
   });

   ipcMain.handle('get-all-upscales', async () => {
     return upscaleManager.getAllUpscales();
   });

   // Forward events to renderer
   upscaleManager.on('upscale-progress', (progress) => {
     mainWindow?.webContents.send('upscale-progress', progress);
   });
   upscaleManager.on('upscale-complete', (result) => {
     mainWindow?.webContents.send('upscale-complete', result);
   });
   upscaleManager.on('upscale-error', (error) => {
     mainWindow?.webContents.send('upscale-error', error);
   });
   ```

2. Modify `src/preload/preload.ts`:
   ```typescript
   const api = {
     // ... existing APIs
     upscale: {
       checkBinary: () => ipcRenderer.invoke('check-upscale-binary'),
       detectGPU: () => ipcRenderer.invoke('detect-gpu'),
       start: (options: UpscaleOptions) => ipcRenderer.invoke('start-upscale', options),
       cancel: (id: string) => ipcRenderer.invoke('cancel-upscale', id),
       getStatus: (id: string) => ipcRenderer.invoke('get-upscale-status', id),
       getAll: () => ipcRenderer.invoke('get-all-upscales'),
       onProgress: (callback: (progress: UpscaleProgress) => void) => {
         ipcRenderer.on('upscale-progress', (_event, progress) => callback(progress));
       },
       onComplete: (callback: (result: any) => void) => {
         ipcRenderer.on('upscale-complete', (_event, result) => callback(result));
       },
       onError: (callback: (error: any) => void) => {
         ipcRenderer.on('upscale-error', (_event, error) => callback(error));
       },
     },
   };
   ```

3. Modify `src/preload/preload.d.ts`:
   ```typescript
   interface Window {
     electron: {
       // ... existing APIs
       upscale: {
         checkBinary: () => Promise<boolean>;
         detectGPU: () => Promise<GPUInfo>;
         start: (options: UpscaleOptions) => Promise<string>;
         cancel: (id: string) => Promise<void>;
         getStatus: (id: string) => Promise<UpscaleProgress | null>;
         getAll: () => Promise<UpscaleProgress[]>;
         onProgress: (callback: (progress: UpscaleProgress) => void) => void;
         onComplete: (callback: (result: any) => void) => void;
         onError: (callback: (error: any) => void) => void;
       };
     };
   }
   ```

**Acceptance Criteria**:
- ✅ All IPC handlers registered
- ✅ Preload API exposed to renderer
- ✅ Type-safe communication
- ✅ Events forwarded correctly

**Files Modified**:
- `src/main/ipc-handlers.ts`
- `src/preload/preload.ts`
- `src/preload/preload.d.ts`

---

### Step 4: Upscaling UI Components

**Goal**: Create user interface for upscaling

**Tasks**:
1. Create `src/renderer/components/UpscaleDialog.tsx`:
   ```typescript
   interface UpscaleDialogProps {
     videoPath: string;
     videoWidth: number;
     videoHeight: number;
     onClose: () => void;
     onComplete: (upscaledPath: string) => void;
   }

   export function UpscaleDialog(props: UpscaleDialogProps) {
     // State: scale (2 or 4), quality preset, progress, status
     // UI: Modal overlay, form, progress bar, buttons
   }
   ```

   **UI Elements**:
   - Modal overlay with semi-transparent background
   - Title: "Upscale Video"
   - Current resolution display: "Current: 720p (1280x720)"
   - Scale selection dropdown:
     - "2x Upscale (720p → 1440p)"
     - "4x Upscale (720p → 4K)"
   - Quality preset dropdown:
     - "High Quality (slower, better results)"
     - "Balanced (faster, good results)"
   - GPU info display: "Using: NVIDIA RTX 3060"
   - Output path display/selection
   - Estimated file size
   - Start Upscaling button
   - Cancel button (during processing)
   - Progress section (shown during upscaling):
     - Progress bar (0-100%)
     - Status text: "Processing frame 240/480 (50%)"
     - ETA: "~3 minutes remaining"
   - Error display area

2. Create `src/renderer/components/UpscaleDialog.css`:
   - Modal styling similar to ConversionDialog
   - Progress bar animations
   - Responsive layout
   - Dark theme support

3. Implement state management:
   ```typescript
   const [scale, setScale] = useState<2 | 4>(2);
   const [quality, setQuality] = useState<'high' | 'balanced'>('balanced');
   const [isProcessing, setIsProcessing] = useState(false);
   const [progress, setProgress] = useState(0);
   const [status, setStatus] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [upscaleId, setUpscaleId] = useState<string | null>(null);
   ```

4. Implement progress event listeners:
   ```typescript
   useEffect(() => {
     window.electron.upscale.onProgress((progress) => {
       if (progress.id === upscaleId) {
         setProgress(progress.percentage);
         setStatus(`Processing frame ${progress.currentFrame}/${progress.totalFrames}`);
       }
     });

     window.electron.upscale.onComplete((result) => {
       if (result.id === upscaleId) {
         setIsProcessing(false);
         onComplete(result.outputPath);
       }
     });

     window.electron.upscale.onError((error) => {
       if (error.id === upscaleId) {
         setError(error.message);
         setIsProcessing(false);
       }
     });
   }, [upscaleId]);
   ```

5. Implement start upscaling handler:
   ```typescript
   const handleStartUpscale = async () => {
     const outputPath = generateOutputPath(videoPath, scale);
     const id = await window.electron.upscale.start({
       inputPath: videoPath,
       outputPath,
       scale,
       model: quality === 'high' ? 'realesrgan' : 'compact',
     });
     setUpscaleId(id);
     setIsProcessing(true);
   };
   ```

6. Implement cancellation:
   ```typescript
   const handleCancel = async () => {
     if (upscaleId) {
       await window.electron.upscale.cancel(upscaleId);
       setIsProcessing(false);
       onClose();
     }
   };
   ```

**Acceptance Criteria**:
- ✅ Dialog renders with correct options
- ✅ Scale selection updates preview text
- ✅ Progress bar animates smoothly
- ✅ ETA displays and updates
- ✅ Can cancel mid-process
- ✅ Errors display clearly
- ✅ Completion triggers callback

**Files Created**:
- `src/renderer/components/UpscaleDialog.tsx`
- `src/renderer/components/UpscaleDialog.css`

**Tests to Write**:
- `src/renderer/components/__tests__/UpscaleDialog.test.tsx`

---

### Step 5: App Integration & Smart Detection

**Goal**: Integrate upscaling into main app flow with intelligent suggestions

**Tasks**:
1. Modify `src/renderer/App.tsx`:
   - Add upscaling state:
     ```typescript
     const [showUpscaleDialog, setShowUpscaleDialog] = useState(false);
     const [upscaleVideoPath, setUpscaleVideoPath] = useState<string | null>(null);
     const [videoResolution, setVideoResolution] = useState<{width: number, height: number} | null>(null);
     ```

   - Add "Upscale Video" button/option in UI
   - Show UpscaleDialog when triggered:
     ```typescript
     {showUpscaleDialog && upscaleVideoPath && videoResolution && (
       <UpscaleDialog
         videoPath={upscaleVideoPath}
         videoWidth={videoResolution.width}
         videoHeight={videoResolution.height}
         onClose={() => setShowUpscaleDialog(false)}
         onComplete={(upscaledPath) => {
           setCurrentVideoUrl(`vidmin:${upscaledPath}`);
           setShowUpscaleDialog(false);
         }}
       />
     )}
     ```

2. Implement smart resolution detection:
   ```typescript
   function shouldSuggestUpscale(width: number, height: number): boolean {
     // Suggest upscaling for videos below 1080p
     return height < 1080 || width < 1920;
   }

   function recommendUpscaleSettings(width: number, height: number): { scale: 2 | 4; targetResolution: string } | null {
     if (height <= 480) {
       return { scale: 4, targetResolution: '1080p or 4K' };
     }
     if (height <= 720) {
       return { scale: 2, targetResolution: '1440p' };
     }
     if (height <= 1080) {
       return { scale: 2, targetResolution: '4K' };
     }
     return null;
   }
   ```

3. Add upscaling triggers:
   - **After downloading video**:
     ```typescript
     // In download complete handler
     const metadata = await window.electron.video.getMetadata(videoPath);
     if (shouldSuggestUpscale(metadata.width, metadata.height)) {
       // Show notification: "This video is 720p. Upscale to 1440p?"
       const suggestion = recommendUpscaleSettings(metadata.width, metadata.height);
       showUpscaleSuggestion(videoPath, metadata, suggestion);
     }
     ```

   - **After opening local video**:
     ```typescript
     // In VideoPlayer onLoadedMetadata
     if (shouldSuggestUpscale(width, height)) {
       // Show non-intrusive prompt
     }
     ```

   - **After format conversion**:
     ```typescript
     // In ConversionDialog onComplete
     // Offer to upscale the converted video
     ```

   - **Manual trigger**: Add button in UI for manual upscaling

4. Add notification/prompt system:
   ```typescript
   function showUpscaleSuggestion(videoPath: string, metadata: any, suggestion: any) {
     // Show toast/snackbar: "This video is 720p. Upscale to 1440p?"
     // [Yes] [No] [Don't ask again]
   }
   ```

5. Implement user preferences:
   - Remember "don't ask again" preference
   - Store in localStorage or electron-store
   - Allow re-enabling in settings

**Acceptance Criteria**:
- ✅ Upscale option appears after download
- ✅ Smart suggestions for low-res videos
- ✅ User can manually trigger upscaling
- ✅ Upscaled video loads automatically after completion
- ✅ Original video is preserved
- ✅ Preferences persist across sessions

**Files Modified**:
- `src/renderer/App.tsx`

---

### Step 6: File Management & Storage

**Goal**: Handle upscaled file naming, storage, and disk space management

**Tasks**:
1. Create `src/main/upscale-file-manager.ts`:
   ```typescript
   export function generateUpscaledFileName(originalPath: string, scale: 2 | 4): string;
   export async function checkDiskSpace(path: string, requiredBytes: number): Promise<boolean>;
   export function estimateUpscaledFileSize(originalSize: number, scale: 2 | 4): number;
   export async function ensureUniqueFileName(path: string): Promise<string>;
   ```

2. Implement file naming strategy:
   ```typescript
   function generateUpscaledFileName(originalPath: string, scale: 2 | 4): string {
     const parsed = path.parse(originalPath);
     return path.join(parsed.dir, `${parsed.name}_upscaled_${scale}x${parsed.ext}`);
   }
   ```

3. Implement collision handling:
   ```typescript
   async function ensureUniqueFileName(filePath: string): Promise<string> {
     if (!fs.existsSync(filePath)) {
       return filePath;
     }

     const parsed = path.parse(filePath);
     let counter = 1;
     let newPath = filePath;

     while (fs.existsSync(newPath)) {
       newPath = path.join(parsed.dir, `${parsed.name}_${counter}${parsed.ext}`);
       counter++;
     }

     return newPath;
   }
   ```

4. Implement disk space checking:
   ```typescript
   async function checkDiskSpace(dirPath: string, requiredBytes: number): Promise<boolean> {
     // Use node-disk-info or similar to check available space
     const diskSpace = await getDiskSpace(dirPath);
     return diskSpace.available > requiredBytes;
   }
   ```

5. Implement file size estimation:
   ```typescript
   function estimateUpscaledFileSize(originalSize: number, scale: 2 | 4): number {
     // Upscaled videos are typically 2-4x larger due to increased resolution
     // But with good compression, maybe 1.5-3x
     const multiplier = scale === 2 ? 2.5 : 4.5;
     return originalSize * multiplier;
   }
   ```

6. Add IPC handlers for file management:
   ```typescript
   ipcMain.handle('estimate-upscaled-size', async (event, originalPath: string, scale: 2 | 4) => {
     const stats = await fs.stat(originalPath);
     return estimateUpscaledFileSize(stats.size, scale);
   });

   ipcMain.handle('check-disk-space', async (event, path: string, requiredBytes: number) => {
     return await checkDiskSpace(path, requiredBytes);
   });
   ```

7. Update UpscaleDialog to check disk space before starting:
   ```typescript
   const handleStartUpscale = async () => {
     const estimatedSize = await window.electron.upscale.estimateSize(videoPath, scale);
     const hasSpace = await window.electron.upscale.checkDiskSpace(videoPath, estimatedSize);

     if (!hasSpace) {
       setError('Insufficient disk space for upscaled video');
       return;
     }

     // Proceed with upscaling...
   };
   ```

**Acceptance Criteria**:
- ✅ Files named consistently and clearly
- ✅ No file name collisions (auto-increment counter)
- ✅ Disk space checked before upscaling
- ✅ Warnings display for insufficient space
- ✅ Original files preserved by default
- ✅ File size estimation reasonably accurate

**Files Created**:
- `src/main/upscale-file-manager.ts`

**Files Modified**:
- `src/main/ipc-handlers.ts`
- `src/preload/preload.ts`
- `src/preload/preload.d.ts`
- `src/renderer/components/UpscaleDialog.tsx`

---

### Step 7: Testing & Quality Assurance

**Goal**: Comprehensive testing across platforms and scenarios

**Tasks**:
1. Write unit tests:
   - `src/main/__tests__/upscale-manager.test.ts`
     - Mock child_process.spawn
     - Test progress parsing from stdout
     - Test event emissions
     - Test cancellation
     - Test error handling

   - `src/main/__tests__/upscale-file-manager.test.ts`
     - Test file name generation
     - Test collision handling
     - Test disk space checking
     - Test size estimation

   - `src/main/__tests__/upscale-binary-validator.test.ts`
     - Test binary existence check
     - Test GPU detection
     - Test path resolution

2. Write component tests:
   - `src/renderer/components/__tests__/UpscaleDialog.test.tsx`
     - Test rendering
     - Test scale selection
     - Test quality selection
     - Test progress updates
     - Test cancellation
     - Test error display
     - Test completion callback

3. Write E2E tests (Playwright):
   ```typescript
   // e2e/upscaling.spec.ts
   test('upscale video from 720p to 1440p', async ({ page }) => {
     // Load test video (720p)
     // Open upscale dialog
     // Select 2x upscale
     // Start upscaling
     // Verify progress updates
     // Verify completion
     // Verify output file exists
     // Verify player loads upscaled version
   });

   test('cancel upscaling mid-process', async ({ page }) => {
     // Start upscaling
     // Wait for progress > 10%
     // Click cancel
     // Verify process stopped
     // Verify partial file cleaned up
   });

   test('handle disk space error', async ({ page }) => {
     // Mock insufficient disk space
     // Try to start upscaling
     // Verify error message displays
   });
   ```

4. Manual testing checklist:
   - [ ] Test on macOS (Metal/MPS acceleration)
   - [ ] Test on Windows (CUDA/DirectML)
   - [ ] Test on Linux (CUDA/Vulkan)
   - [ ] Test 480p → 1080p (4x upscale)
   - [ ] Test 720p → 1440p (2x upscale)
   - [ ] Test 1080p → 4K (2x upscale)
   - [ ] Test various formats (MP4, WebM, MKV)
   - [ ] Test short videos (<1 minute)
   - [ ] Test long videos (30+ minutes)
   - [ ] Test GPU vs CPU performance
   - [ ] Test cancellation at different progress points
   - [ ] Test disk full scenario
   - [ ] Test corrupted input file
   - [ ] Test missing model files
   - [ ] Test binary not found
   - [ ] Test file name collisions
   - [ ] Test multiple concurrent upscales
   - [ ] Test upscaling after download
   - [ ] Test upscaling after conversion
   - [ ] Test manual upscaling trigger

5. Performance benchmarking:
   - Create performance matrix:
     ```
     | Resolution | GPU         | Scale | Time     | Quality |
     |------------|-------------|-------|----------|---------|
     | 480p       | RTX 3060    | 4x    | 2min/min | High    |
     | 720p       | M1 Pro      | 2x    | 1min/min | High    |
     | 1080p      | CPU (i7)    | 2x    | 15min/min| High    |
     ```

   - Document expected processing times
   - Identify bottlenecks
   - Optimize if needed

6. Memory leak testing:
   - Run long upscaling sessions
   - Monitor memory usage over time
   - Check for proper cleanup after completion/cancellation

**Acceptance Criteria**:
- ✅ All unit tests pass (100% coverage for critical paths)
- ✅ All component tests pass
- ✅ All E2E tests pass
- ✅ Tested on all platforms (macOS, Windows, Linux)
- ✅ No memory leaks during long upscales
- ✅ Performance meets expectations
- ✅ Error handling works correctly in all scenarios
- ✅ Manual test checklist 100% complete

**Files Created**:
- `src/main/__tests__/upscale-manager.test.ts`
- `src/main/__tests__/upscale-file-manager.test.ts`
- `src/main/__tests__/upscale-binary-validator.test.ts`
- `src/renderer/components/__tests__/UpscaleDialog.test.tsx`
- `e2e/upscaling.spec.ts`

---

### Step 8: Documentation & Polish

**Goal**: Final refinements, user documentation, and code cleanup

**Tasks**:
1. UI polish:
   - Add smooth transitions for dialog open/close
   - Add loading spinner during initialization
   - Add success checkmark icon on completion
   - Add error icon with detailed message
   - Add tooltip explanations for quality presets
   - Add keyboard shortcuts (ESC to close, Enter to start)
   - Add animations for progress bar
   - Ensure responsiveness on different screen sizes

2. Add JSDoc comments:
   ```typescript
   /**
    * Starts an AI upscaling job for a video file.
    *
    * @param options - Upscaling configuration
    * @param options.inputPath - Path to the input video file
    * @param options.outputPath - Path where upscaled video will be saved
    * @param options.scale - Upscaling factor (2 or 4)
    * @param options.model - Model quality preset ('realesrgan' or 'compact')
    * @param options.gpuId - GPU device ID (optional, defaults to 0)
    * @returns Promise resolving to the upscale job ID
    *
    * @example
    * ```typescript
    * const id = await upscaleManager.startUpscale({
    *   inputPath: '/videos/movie.mp4',
    *   outputPath: '/videos/movie_upscaled_2x.mp4',
    *   scale: 2,
    *   model: 'realesrgan'
    * });
    * ```
    */
   async startUpscale(options: UpscaleOptions): Promise<string> { ... }
   ```

3. Code cleanup:
   - Remove any console.log debugging statements
   - Ensure consistent code style
   - Run ESLint and fix any warnings
   - Run Prettier for formatting
   - Add TODO comments for future enhancements
   - Remove any unused imports

**Acceptance Criteria**:
- ✅ UI feels polished and professional
- ✅ Code is well-documented with JSDoc
- ✅ User experience is smooth and intuitive
- ✅ No linting errors or warnings
- ✅ Code is clean and maintainable

**Files Modified**:
- `src/main/upscale-manager.ts`
- `src/renderer/components/UpscaleDialog.tsx`
- All upscaling-related files (adding JSDoc)

---

### Step 9: Commit, Branch, and PR

**Goal**: Follow established git workflow for code review and merge

**Tasks**:
1. Run all tests and ensure passing:
   ```bash
   npm test                # Unit tests
   npm run test:e2e        # E2E tests
   npm run lint            # Code quality
   npm run type-check      # TypeScript
   ```

2. Fix any test failures or linting issues

3. Stage and commit changes:
   ```bash
   git add .

   git commit -m "$(cat <<'EOF'
   feat: add AI video upscaling with Real-ESRGAN

   Implements Phase 9 - AI-powered video upscaling with GPU acceleration.

   Features:
   - Real-ESRGAN integration with bundled binaries
   - GPU acceleration (CUDA, Metal, DirectML)
   - 2x and 4x upscaling options
   - Quality presets (high quality, balanced)
   - Real-time progress tracking
   - Smart resolution detection and suggestions
   - Upscaled file management with clear naming
   - Disk space validation before processing
   - Integration with download and conversion workflows

   Components:
   - UpscaleManager for subprocess orchestration
   - UpscaleDialog UI component
   - IPC handlers for main-renderer communication
   - Binary validation and GPU detection
   - File management utilities

   Tests:
   - Unit tests for manager and utilities
   - Component tests for dialog
   - E2E tests for full upscaling workflow
   - Manual testing on macOS, Windows, Linux

   Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

4. Create feature branch:
   ```bash
   git checkout -b feat/ai-upscaling
   git push -u origin feat/ai-upscaling
   ```

5. Create Pull Request:
   ```bash
   gh pr create --title "feat: AI video upscaling (Phase 9)" --body "$(cat <<'EOF'
   ## Summary
   Implements Phase 9: AI Video Upscaling with Real-ESRGAN

   This PR adds comprehensive AI-powered video upscaling capabilities to Vidmin, allowing users to enhance low-resolution videos using GPU-accelerated AI models.

   ## Changes
   - **Main Process**:
     - New `UpscaleManager` for subprocess orchestration
     - Binary validation and GPU detection
     - File management utilities
     - IPC handlers for upscaling operations

   - **Renderer Process**:
     - New `UpscaleDialog` component with progress tracking
     - Smart resolution detection in App.tsx
     - Integration with download/conversion workflows

   - **Resources**:
     - Real-ESRGAN binaries for macOS, Windows, Linux
     - AI model weights (realesrgan-x2, realesrgan-x4)
     - Binary download script

   - **Tests**:
     - Unit tests for manager and utilities
     - Component tests for dialog
     - E2E tests for upscaling workflow

   ## Test Plan
   - [x] All unit tests pass (100% coverage)
   - [x] All E2E tests pass
   - [x] Tested on macOS (Metal acceleration)
   - [x] Tested on Windows (CUDA/DirectML)
   - [x] Tested on Linux (Vulkan)
   - [x] 720p → 1440p upscaling works
   - [x] 480p → 1080p upscaling works
   - [x] Progress tracking accurate
   - [x] Cancellation works correctly
   - [x] Disk space validation works
   - [x] File naming handles collisions
   - [x] GPU detection works on all platforms
   - [x] CPU fallback works when no GPU

   ## Performance
   | Resolution | GPU      | Time (per min of video) |
   |------------|----------|-------------------------|
   | 720p → 1440p | RTX 3060 | ~1-2 minutes           |
   | 480p → 1080p | M1 Pro   | ~2-3 minutes           |

   ## Screenshots
   [Add screenshots of UpscaleDialog, progress tracking, etc.]

   ## Documentation
   - Added JSDoc comments to all public APIs
   - Code is well-documented and maintainable

   ## Breaking Changes
   None. This is a purely additive feature.

   Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

6. Wait for CI to pass and request review

**Acceptance Criteria**:
- ✅ All tests pass locally
- ✅ No linting errors
- ✅ Code committed to feature branch
- ✅ PR created with detailed description
- ✅ CI passes
- ✅ Ready for code review

---

## Components to Create

### Main Process
- `src/main/upscale-manager.ts` - Core upscaling orchestration
- `src/main/upscale-binary-validator.ts` - Binary and GPU validation
- `src/main/upscale-file-manager.ts` - File naming and disk space utilities

### Renderer Process
- `src/renderer/components/UpscaleDialog.tsx` - Upscaling UI
- `src/renderer/components/UpscaleDialog.css` - Styling

### Scripts
- `scripts/download-upscale-binaries.js` - Binary download automation

### Tests
- `src/main/__tests__/upscale-manager.test.ts`
- `src/main/__tests__/upscale-binary-validator.test.ts`
- `src/main/__tests__/upscale-file-manager.test.ts`
- `src/renderer/components/__tests__/UpscaleDialog.test.tsx`
- `e2e/upscaling.spec.ts`

### Resources
- `resources/mac/upscale-bin/` - macOS binary
- `resources/win/upscale-bin/` - Windows binary
- `resources/linux/upscale-bin/` - Linux binary
- `resources/models/realesrgan-x2.pth` - 2x upscale model
- `resources/models/realesrgan-x4.pth` - 4x upscale model

---

## Files to Modify

- `package.json` - Add postinstall script
- `src/main/ipc-handlers.ts` - Add upscaling IPC handlers
- `src/preload/preload.ts` - Expose upscaling API
- `src/preload/preload.d.ts` - TypeScript definitions
- `src/renderer/App.tsx` - Integrate upscaling flow

---

## Dependencies

### New Dependencies
**None** - This phase uses bundled binaries and does not require new npm packages.

### Binary Downloads
- Real-ESRGAN binaries (~20-50MB per platform)
- Model weights (~50-100MB per model)
- Total download size: ~200-300MB

### Runtime Requirements
- **GPU (recommended)**: NVIDIA (CUDA), AMD (DirectML), Apple (Metal)
- **Fallback**: CPU-only mode (significantly slower)
- **Disk space**: 2-4x the original video file size

---

## Testing Strategy

### Unit Tests (Vitest)
- Mock child_process.spawn for upscale-manager
- Test progress parsing logic
- Test file naming and collision handling
- Test disk space calculations
- Test GPU detection logic

### Component Tests (@testing-library/react)
- Test UpscaleDialog rendering
- Test user interactions (scale selection, start, cancel)
- Test progress updates
- Test error display

### E2E Tests (Playwright)
- Test full upscaling workflow
- Test cancellation
- Test error scenarios
- Test integration with downloads/conversions

### Manual Testing
- Test on all platforms (macOS, Windows, Linux)
- Test various resolutions and formats
- Performance benchmarking
- GPU vs CPU comparison

---

## Acceptance Criteria

This phase is considered complete when:

1. **Functionality**:
   - ✅ Can upscale videos at 2x and 4x scales
   - ✅ GPU acceleration works on all platforms
   - ✅ Progress tracking is accurate and real-time
   - ✅ Cancellation works at any point
   - ✅ Upscaled videos save with correct naming
   - ✅ Original videos are preserved

2. **Integration**:
   - ✅ Upscaling triggers after downloads
   - ✅ Smart suggestions for low-res videos
   - ✅ Works alongside existing conversion system
   - ✅ UI is consistent with Vidmin design

3. **Quality**:
   - ✅ All tests pass (unit, component, E2E)
   - ✅ No linting errors
   - ✅ No TypeScript errors
   - ✅ Code is well-documented
   - ✅ Performance meets expectations

4. **Production Ready**:
   - ✅ Binaries bundle correctly
   - ✅ Works on all platforms
   - ✅ Error handling is robust
   - ✅ User experience is polished

---

## Performance Targets

### Processing Speed
- **720p → 1440p** (2x):
  - GPU: 1-3 minutes per minute of video
  - CPU: 10-20 minutes per minute of video

- **480p → 1080p** (4x):
  - GPU: 2-5 minutes per minute of video
  - CPU: 20-40 minutes per minute of video

### GPU Requirements
- **Recommended**: RTX 2060+ / RX 6600+ / M1+
- **Minimum**: Any Vulkan/Metal/DirectML capable GPU
- **Fallback**: CPU-only (with warning)

### File Size
- Upscaled videos: 1.5-4x original file size
- Depends on compression quality and resolution increase

---

## Notes

### Why Pre-Processing Instead of Real-Time?
The original plan considered real-time upscaling during playback, but we chose pre-processing because:

1. **Simpler implementation** - Reuses existing conversion patterns
2. **Better quality** - Can use slower, higher-quality models without playback constraints
3. **More reliable** - No buffering or performance issues during playback
4. **Permanent results** - Upscaled videos saved for future use
5. **Easier testing** - No complex streaming architecture to test

### Integration with Existing Systems
This phase builds heavily on patterns from:
- **Phase 3 (Downloads)**: Binary bundling, subprocess management, progress tracking
- **Phase 5 (Conversion)**: Dialog UI, IPC communication, file management

This ensures consistency and reduces complexity.

### Future Enhancements
Potential improvements for later phases:
- Batch upscaling (queue multiple videos)
- Custom model support (user-provided models)
- Advanced settings (denoising, sharpening)
- Preview mode (upscale a small section first)
- Cloud upscaling (offload to remote server)
- Real-time upscaling (for high-end GPUs)

---

**Phase 9 Complete**: When all acceptance criteria are met and the PR is merged.
